import _ from 'lodash';

const config = {
	// utcOffset: +2,
	preTsvBase: 1.25,
	preTsvEscale: 1.0,
	preTsvMep: 0.25,
	postTsv: 0,
	postTsvMep: 0,

	preTsBase: 1.25,
	preTsEscale: 1.0,
	preTsMep: 0.25,
	postTs: 0.5,
	postTsMep: 0,

	cmt: function (tme) {
		return Math.max(70 / ( 21 * Math.max(tme, 1) + 30), 1);
	},

	hdn: {
		nightEndHour: 9, // o'clock LT
		nightEndMinutes: 0, // o'clock LT
		nightStartHour: 21, // o'clock LT
		nightStartMinutes: 0, // o'clock LT
	},

	// hca: function (rot) {
	// 	var nbjours = Math.ceil(rot.finSV.diff(rot.debutSV, 'days', true));
	// 	if (rot.finSV.hours() < 1) nbjours--;
	// 	return nbjours * 4;
	// },

	hcaParJour: 4.0,

	bonusEtape: 0,
	tsvRemuMini: 5.74,
	coefTSVRemu: 1.64,
	coefNuit: 0.20,

	coefHcMep: 0.5,
	coefTr: 1/1.64,
	trMini: 5.74,
	majoTR: 1.5,

	hcPogo: 1.05,

	Hcs: 4.0,
	demiHcs: 2.0,

	Hcsi: 5.0,
	demiHcsi: 2.5,

	HcSimuInst: 5.5,

	Hcsr: 5.2
};

const tvref = _.memoize(function (vol) {
	const mois = vol.start.format("YYYY-MM");
	const hv = HV100.findOne({src: vol.from, dest: vol.to, mois: { $lte : mois }}, { sort: [["mois", "desc"]]});
	return hv ? hv.tr : undefined;
}, function (vol) {
	return [vol.from, vol.to, vol.start.format("YYYY-MM")].join('-');
});

function hdn(start, end) {
	start = start.clone().local(), end = end.clone().local();

	var nightEnd = start.clone().hour(config.hdn.nightEndHour).minutes(config.hdn.nightEndMinutes),
		nightStart = start.clone().hour(config.hdn.nightStartHour).minutes(config.hdn.nightStartMinutes);

	if (start.isBefore(nightEnd)) {
		return moment.min(end, nightEnd).diff(start, 'hours', true) + (end.isAfter(nightStart) ? end.diff(moment.max(start, nightStart), 'hours', true) : 0);
	}
	nightEnd.add(1, 'day');
	return end.isAfter(nightStart) ? moment.min(end, nightEnd).diff(moment.max(start, nightStart), 'hours', true) : 0;
}

function sum(list, prop, excluMEP) {
	return _.reduce(list, function (total, data) {
		if (excluMEP) return total + (data.tag === 'mep' ? 0 : data[prop]);
		return total + (_.has(data, prop) ? data[prop] : 0);
	}, 0);
}

function real(obj, key) {
	return _.has(obj, 'real') ? _.get(obj.real, key) : _.get(obj, key);
}

function sumReal(array, key, excluMEP) {
	return _.reduce(array, function(memo, obj){
		if (excluMEP) return memo + (obj.tag === 'mep' ? 0 : real(obj, key));
		return memo + (real(obj, key) || 0);
	}, 0);
}

// Somme sur le mois courant uniquement
function sumCM(list, prop) {
	return _.reduce(list, function (total, data) {
		return total + (_.has(data, prop+'CM') ? data[prop+'CM'] : data[prop]);
	}, 0);
}

// Somme sur le mois courant uniquement avec les données en réalisation si disponibles
function sumCMReal(list, prop) {
	return _.reduce(list, function (total, data) {
		return total + (_.has(data, 'real') ? (_.has(data.real, prop+'CM') ?  data.real[prop+'CM'] : data.real[prop]) : (_.has(data, prop+'CM') ? data[prop+'CM'] : data[prop]));
	}, 0);
}

function extendWithSums(object, list, keys) {
	_.forEach(keys, function (key) {
		object[key] = sum(list, key);
	});

	if (object.real) {
		_.forEach(keys, function (key) {
			object.real[key] = sumReal(list, key);
		});
	}
	return object;
}

function nbJoursSol(events) {
	const days = [];
	_.forEach(events, evt => {
		const day = evt.start.format('YYYY-MM-DD');
		if (!_.includes(days, day)) days.push(day);
	});
	return days.length;
}

export default {
	calculMois(groupedEvents) {
		const remu = {
			H2: _.reduce(groupedEvents.rotations, (total, rot) => {
				if (rot.coefH2) {
					return total + rot.H2 * rot.coefH2;
				} else {
					return total + rot.H2;
				}
			}, 0),
			hdn: sumCM(groupedEvents.rotations, 'hdn'),
			tvt: sumCM(groupedEvents.rotations, 'tvt'),

			real: {
				H2: _.reduce(groupedEvents.rotations, (total, rot) => {
					if (real(rot, 'coefH2')) {
						return total + real(rot, 'H2') * real(rot, 'coefH2');
					} else {
						return total + real(rot, 'H2');
					}
				}, 0),
				hdn: sumCMReal(groupedEvents.rotations, 'hdn'),
				tvt: sumCMReal(groupedEvents.rotations, 'tvt')
			},

			mep: sumCM(groupedEvents.rotations, 'mep'),
			countVol: sumCM(groupedEvents.rotations, 'countVol'),

			repos: groupedEvents.repos ? groupedEvents.repos.length : 0,
			conges: groupedEvents.conges ? groupedEvents.conges.length : 0,
			maladie: groupedEvents.maladie ? groupedEvents.maladie.length : 0,
			greve: groupedEvents.greve ? groupedEvents.greve.length : 0,
			sanssolde: groupedEvents.sanssolde ? groupedEvents.sanssolde.length : 0,

			joursSol: [],

			nbJoursSol: 0,
			Hcs: 0, // 4HC par jour ou 2HC si demi-journée

			nbJoursInstruction: 0,
			Hcsi: 0, // 5HC par jounée sol instructeur ou 2.5HC si demi journée

			nbJoursDelegation: 0,
			Hcsr: 0, // Moyenne HC par jour par fonction pour chaque jour de délégation syndicale ~ 5.5HC/jour

			nbSimuInst: 0,
			HcSimuInst: 0, // 5.5HC par simu en fonction instructeur + majoration 20% nuit
		};

		if (_.has(groupedEvents, 'sol')) {
			const joursSol = _.groupBy(groupedEvents.sol, evt => evt.start.format('YYYY-MM-DD'));
			remu.nbJoursSol = _.size(joursSol);

			_.forEach(joursSol, (events, date) => {
				const first = _.first(events), last = _.last(events);
				const demiJournee = (first.start.hours() >= 12 || last.end.hours() <= 12) && last.end.diff(first.start, 'hours', true) <= 4.0;

				if (demiJournee) console.log('Demi-journée : ', date, events);

				let Hcs = config.Hcs;

				if (first.tag == 'instructionSol') {
					Hcs = demiJournee ? config.demiHcsi : config.Hcsi;
					remu.Hcsi += Hcs;
					remu.nbJoursInstruction += 1;
				} else if (first.tag == 'instructionSimu') {
					Hcs = config.HcSimuInst;
					_.forEach(events, evt => {
						if (evt.tag == 'instructionSimu') {
							const Hcsnuit = hdn(evt.start, evt.end);
							Hcs += Hcsnuit * config.coefNuit;
						}
					});
					console.log('HCs SIMU', Hcs);
					remu.HcSimuInst += Hcs;
					remu.nbSimuInst += 1;

				} else {
					if (demiJournee && first.tag != 'simu' && !/CEMPN/i.test(first.summary)) Hcs = config.demiHcs;
					remu.Hcs += Hcs;
				}
				remu.joursSol.push({
					date,
					tag: first.tag,
					Hcs: Hcs,
					events: events
				});
			});
		}

		if (_.has(groupedEvents, 'delegation')) {
			const joursDelegation = _.groupBy(groupedEvents.delegation, evt => evt.start.format('YYYY-MM-DD'));
			remu.nbJoursDelegation = _.size(joursDelegation);
			remu.Hcsr = remu.nbJoursDelegation * (Config.get('Hcsr') || config.Hcsr);
			_.forEach(joursDelegation, (events, date) => {
				remu.joursSol.push({
					date,
					tag: 'delegation',
					Hcs: Config.get('Hcsr') || config.Hcsr,
					events: events
				});
			});
		}

		remu.joursSol.sort((a,b) => {
			if (_.first(a.events).start.isBefore(_.first(b.events).start)) {
				return -1
			} else {
				return 1;
			}
		});

		remu.Hcnuit = remu.hdn * config.coefNuit;
		remu.HC = remu.H2 + remu.Hcs + remu.Hcsi + remu.Hcsr + remu.HcSimuInst + remu.Hcnuit;
		remu.seuilHS = 75 - ((75/30) * (remu.conges + remu.maladie));
		remu.HS = Math.max(remu.HC - remu.seuilHS, 0);

		remu.real.Hcnuit = remu.real.hdn * config.coefNuit;
		remu.real.HC = remu.real.H2 + remu.Hcs + remu.Hcsi + remu.Hcsr + remu.HcSimuInst + remu.real.Hcnuit;
		remu.real.HS = Math.max(remu.real.HC - remu.seuilHS, 0);

		return remu;
	},

	calculVol(vol) {
		const tv = vol.end.diff(vol.start, 'hours', true);

		if (vol.tag === 'mep') {
			vol['HV100%'] = 0;
			vol.hdn = 0;
			vol.mep = vol.category == "ENGS" ? 0 : tv;
			vol.tv = 0;
			// vol['HV100%r'] = 0;
			// vol.endTvref = 0;
		} else if (config.hcPogo && (vol.from === 'CDG' && vol.to === 'ORY') || (vol.from === 'ORY' && vol.to === 'CDG')) {
			// POGO
			vol.tv = tv;
			vol.pogo = true;
			vol['HV100%'] = config.hcPogo;
			vol.hdn = hdn(vol.start, vol.end);
			vol.Hcn = vol.hdn * config.coefNuit;

			if (vol.real) {
				vol.real.tv = vol.real.end.diff(vol.real.start, 'hours', true);
				vol.real.hdn = hdn(moment(Math.min(vol.start, vol.real.start)), vol.real.end);
				// vol.real['HV100%'] = Math.max(vol.tvref, vol.real.tv);
				// vol.real.endTvref = vol.real.start.clone().add(vol.tvref, 'hours');
			}
		} else {
			vol.tv = tv;
			vol['HV100%'] = tvref(vol) || tv;
			vol.hdn = hdn(vol.start, vol.end);
			vol.Hcn = vol.hdn * config.coefNuit;
			// vol.endTvref = vol.start.clone().add(vol.tvref, 'hours');

			if (vol.real) {
				vol.real.tv = vol.real.end.diff(vol.real.start, 'hours', true);
				if (vol.real.start.isBefore(vol.start)) {
					vol.real.hdn = hdn(vol.real.start, vol.real.end);
				} else {
					const hdnEnd = vol.start.clone().add(vol.real.tv, 'hours');
					vol.real.hdn = hdn(vol.start, hdnEnd);
				}
				vol.real.Hcn = vol.real.hdn * config.coefNuit;
				// vol.real['HV100%'] = Math.max(vol.tvref, vol.real.tv);
				// vol.real.endTvref = vol.real.start.clone().add(vol.tvref, 'hours');
			}
		}

		return vol;
	},

	calculSV(vols, base, rotation) {
		vols = _.map(vols, vol => this.calculVol(vol));

		const volsHorsMEP = _.filter(vols, { tag: 'vol' });

		const first = _.first(vols),
			last = _.last(vols),
			lastVol = _.last(volsHorsMEP);
		let preTs, preTsv, postTs, postTsv;

		//Calcul TR, TS et TSV
		if (first.tag === 'mep') {
			// Le service de vol commence par une MEP
			preTs = config.preTsMep;
			preTsv = config.preTsvMep;
		} else if (first.from === base) {
			// Le service de vol commence en base
			preTs = config.preTsBase;
			preTsv = config.preTsvBase;
		} else {
			// Le service de vol commence en escale
			preTs = config.preTsEscale;
			preTsv = config.preTsvEscale;
		}

		if (last.tag === 'mep') {
			// Le service de vol termine par une MEP
			postTs = config.postTsMep;
			postTsv = config.postTsvMep;
		} else {
			// Le service de vol termine par un vol
			postTs = config.postTs;
			postTsv = config.postTsv;
		}

		var sv = {
			countVol: volsHorsMEP.length,
			tvt: sum(volsHorsMEP, 'tv', true),
			// 'HV100%': sum(vols, 'HV100%', true),
			hdn: sum(volsHorsMEP, 'hdn', true),
			mep: sum(vols, 'mep'),
			// TR: last.end.diff(first.start, 'hours', true) + config.majoTR
		};

		sv.TR = sv.countVol ? lastVol.end.diff(first.start, 'hours', true) + config.majoTR : 0;
		sv.Hcn = sv.hdn * config.coefNuit;
		sv.tme = sv.countVol ? sv.tvt / sv.countVol : 0;
		sv.cmt = sv.tme ? config.cmt(sv.tme) : 0;

		if (_.some(vols, function (vol) { return vol.real })) {
			sv.real = {
				tvt: sumReal(vols, 'tv', true),
				hdn: sumReal(vols, 'hdn', true),
				// TR: real(last, 'end').diff(Math.min(first.start, real(first, 'start')), 'hours', true) + config.majoTR
			};

			sv.real.TR = sv.countVol ? real(lastVol, 'end').diff(first.start, 'hours', true) + config.majoTR : 0;
			sv.real.Hcn = sv.real.hdn * config.coefNuit;
			sv.real.tme = sv.countVol ? sv.real.tvt / sv.countVol : 0;
			sv.real.cmt = sv.real.tme ? config.cmt(sv.real.tme) : 0;
		}

		_.extend(sv, {
			tsStart: first.start.clone().subtract(preTs, 'hours'),
			tsvStart: first.start.clone().subtract(preTsv, 'hours'),
			tsEnd: last.end.clone().add(postTs, 'hours'),
			tsvEnd: sv.countVol ? lastVol.end.clone().add(postTsv, 'hours') : first.start.clone().subtract(preTsv, 'hours')
		});

		if (sv.real) {
			_.extend(sv.real, {
				tsStart: sv.tsStart,
				tsvStart: sv.tsvStart,
				tsEnd: real(last, 'end').clone().add(postTs, 'hours'),
				tsvEnd: sv.countVol ? real(lastVol, 'end').clone().add(postTsv, 'hours') : sv.tsvStart
			});
		}
		if (!sv.tsEnd) console.log('SV Error', sv);

		_.forEach(vols, function (vol) {
			vol.sv = sv;
			if (vol.tag === 'vol') {
				if (config.hcPogo && vol.pogo) {
					vol.Hcv = config.hcPogo;
					if (vol.real) vol.real.Hcv = config.hcPogo;
				} else {
					vol.Hcv = vol['HV100%'] * sv.cmt;
					if (vol.real) vol.real.Hcv = vol['HV100%'] * sv.real.cmt;
				}
			}
		});

		sv.Hct = Math.max(sv.TR, sv.countVol ? config.trMini : 0) * config.coefTr;
		sv.Hcv = sum(vols, 'Hcv', true) + sv.mep / 2;
		sv.H1 = Math.max(sv.Hcv, sv.Hct);

		if (sv.real) {
			sv.real.Hct = Math.max(sv.real.TR, sv.countVol ? config.trMini : 0) * config.coefTr;
			sv.real.Hcv = sumReal(vols, 'Hcv', true) + sv.mep / 2;
			sv.real.H1 = Math.max(sv.real.Hcv, sv.real.Hct);
		}

		return _.extend(sv, { events: vols, rotation });
	},

	calculRotation(rotation, currentMonth) {
		var lastSV = _.last(rotation.sv);
		if (!lastSV) console.log("Last SV error", lastSV, rotation);

		rotation.tsStart = _.first(rotation.sv).tsStart;
		rotation.tsEnd = lastSV.tsEnd;
		var nbjours = rotation.tsEnd.clone()
			.startOf('day')
			.diff(rotation.tsStart.clone().startOf('day'), 'days') + 1;

		_.extend(rotation, {
			tvt: sum(rotation.sv, 'tvt'),
			mep: sum(rotation.sv, 'mep'),
			hdn: sum(rotation.sv, 'hdn'),
			countVol: sum(rotation.sv, 'countVol')
		});

		if (_.some(rotation.sv, function (sv) {return sv.real})) {
			rotation.real = {
				tvt: sumReal(rotation.sv, 'tvt'),
				mep: sumReal(rotation.sv, 'mep'),
				hdn: sumReal(rotation.sv, 'hdn'),
				countVol: sumReal(rotation.sv, 'countVol')
			};
		}

		_.extend(rotation, {
			H1: sum(rotation.sv, 'H1'),
			Hcn: rotation.hdn * config.coefNuit,
			Hca: nbjours * config.hcaParJour,
			nbjours: nbjours
		});

		rotation.H2 = Math.max(rotation.H1, rotation.Hca);

		if (rotation.real) {
			rotation.real.tsStart = real(_.first(rotation.sv), 'tsStart');
			rotation.real.tsEnd = real(_.last(rotation.sv), 'tsEnd');
			var nbjoursReal = rotation.real.tsEnd.clone()
				.startOf('day')
				.diff(rotation.real.tsStart.clone().startOf('day'), 'days') + 1;

			if (rotation.real.tsEnd.day() > rotation.tsEnd.day() && rotation.real.tsEnd.hour() < 1) {
				nbjoursReal--;
			}

			_.extend(rotation.real, {
				H1: sumReal(rotation.sv, 'H1'),
				Hcn: rotation.real.hdn * config.coefNuit,
				Hca: nbjoursReal * config.hcaParJour,
				nbjours: nbjoursReal
			});
			rotation.real.H2 = Math.max(rotation.real.H1, rotation.real.Hca);
		}

		if (rotation.tsStart.month() != rotation.tsEnd.month()) {
			// Split coef + hcn + mep + countVol + tvt
			const rotM1 = rotation.tsStart.month(),
				rotM1m = rotation.tsStart.clone().endOf('month');
			let tvtM1 = 0,
				mepM1 = 0,
				hdnM1 = 0,
				countVolM1 = 0;
			_.forEach(rotation.sv, sv => {
				if (sv.tsStart.month() != sv.tsEnd.month()) {
					_.forEach(sv.events, vol => {
						if (vol.start.month() != vol.end.month()) {
							if (vol.tag === 'mep') {
								mepM1 += rotM1m.diff(vol.start, 'hours', true)
							} else {
								tvtM1 += rotM1m.diff(vol.start, 'hours', true);
							}
							if (vol.hdn) hdnM1 += hdn(vol.start, rotM1m);
							countVolM1++;
						} else if (vol.start.month() === rotM1) {
							tvtM1 += vol.tv;
							mepM1 += vol.mep || 0;
							hdnM1 += vol.hdn;
							countVolM1++;
						}
					});
				} else if (sv.tsStart.month() === rotM1) {
					tvtM1 += sv.tvt;
					mepM1 += sv.mep;
					hdnM1 += sv.hdn;
					countVolM1 += sv.countVol;
				}
			});

			_.extend(rotation, { tvtM1, mepM1, hdnM1, countVolM1 });

			if (rotM1 == currentMonth.month()) {
				_.extend(rotation, {
					tvtCM: tvtM1,
					mepCM: mepM1,
					hdnCM: hdnM1,
					countVolCM: countVolM1
				});
			} else {
				_.extend(rotation, {
					tvtCM: rotation.tvt - tvtM1,
					mepCM: rotation.mep - mepM1,
					hdnCM: rotation.hdn - hdnM1,
					countVolCM: rotation.countVol - countVolM1
				});
			}
			rotation.coefH2 = (rotation.tvtCM + rotation.mepCM / 2) / (rotation.tvt + rotation.mep / 2);
			console.log('Rotation sur deux mois : ', rotation);
		}

		if (rotation.real && rotation.real.tsStart.month() != rotation.real.tsEnd.month()) {
			const rotM1 = rotation.real.tsStart.month(),
				rotM1m = rotation.real.tsStart.clone().endOf('month');
			let tvtM1 = 0,
				hdnM1 = 0;
			_.forEach(rotation.sv, sv => {
				if (real(sv, 'tsStart').month() != real(sv, 'tsEnd').month()) {
					_.forEach(sv.events, vol => {
						if (real(vol, 'start').month() != real(vol, 'end').month() && vol.tv) {
							tvtM1 += rotM1m.diff(real(vol, 'start'), 'hours', true);
							if (real(vol, 'hdn')) hdnM1 += hdn(real(vol, 'start'), rotM1m);
						} else if (real(vol, 'start').month() === rotM1) {
							tvtM1 += real(vol, 'tv');
							hdnM1 += real(vol, 'hdn');
						}
					});
				} else if (real(sv, 'tsStart').month() === rotM1) {
					tvtM1 += real(sv, 'tvt');
					hdnM1 += real(sv, 'hdn');
				}
			});

			_.extend(rotation.real, { tvtM1, hdnM1 });

			if (rotM1 == currentMonth.month()) {
				_.extend(rotation.real, {
					tvtCM: tvtM1,
					hdnCM: hdnM1
				});
			} else {
				_.extend(rotation.real, {
					tvtCM: real(rotation, 'tvt') - tvtM1,
					hdnCM: real(rotation, 'hdn') - hdnM1
				});
			}
			rotation.real.coefH2 = (rotation.real.tvtCM + (rotation.mepCM || 0) / 2) / (rotation.real.tvt + rotation.mep / 2);
		}

		return rotation;
	}
}
