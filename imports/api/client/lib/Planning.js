import Remu from './Remu.js';
import _ from 'lodash';
import { Meteor } from 'meteor/meteor';

export class Planning {
	constructor(events, currentMonth) {
		this._events = events;
		this.currentMonth = moment(currentMonth);
		this._groupedEvents = {};

		if (this._checkDuplicates()) {
			App.askForPlanningReparsing("Votre planning comporte des doublons. Cliquez sur OK pour les supprimer.");
		}

		this._groupEvents();

		this._groupedEvents.rotations = _.chain(this._groupedEvents.rotations)
			.filter(rot => {
				if (rot.sv && rot.sv.length) {
					return true;
				} else {
					console.log("Rotation vide !", rot);
					Events.remove(rot._id);
				}
			})
			.map(rot => {
				rot.sv = _.map(rot.sv, vols => {
					return Remu.calculSV(vols, rot.base, rot);
				});

				_.forEach(rot.sv, sv => {
					if (sv.countVol > 5) {
						App.askForPlanningReparsing("Un service de vol comporte plus de 5 étapes. Si cela n'est pas correct, cliquez sur OK pour recalculer votre planning.");
					} else if (sv.TR > 15 || (sv.real && sv.real.TR > 15)) {
						App.askForPlanningReparsing("Un temps de service de vol est supérieur à 15h : cliquez sur OK pour recalculer votre planning.");
					}
				});

				return Remu.calculRotation(rot, this.currentMonth);
			})
			.value();

		this.Remu = new ReactiveVar({});

		Tracker.autorun(c => {
			this.Remu.set(Remu.calculMois(this.groupedEventsThisMonth()));
		});

	}

	_groupEvents() {
		const gevents = this._groupedEvents = _.groupBy(this._events, evt => {
			switch (evt.tag) {
				// Vols
				case 'vol':
				case 'mep':
					return 'vols';
				// Rotations
				case 'rotation':
					return 'rotations';
				// Activités Sol
				case 'sol':
				case 'instructionSol':
				case 'instructionSimu':
				case 'simu':
				case 'stage':
					return 'sol';
				default:
					return evt.tag;
			}
		});

		_.chain(gevents.vols || [])
			.groupBy('rotationId')
			.forEach(function (evts, rotationId) {
				const rotation = _.find(gevents.rotations, { _id: rotationId });
				if (rotation) {
					const sv = _.groupBy(evts, 'svIndex');
					rotation.sv = _.chain(sv)
						.keys()
						.map(i => sv[i])
						.value();
				} else {
					console.log('Rotation introuvable !', rotationId, evts);
					Meteor.defer(() => {
						App.reparseEventsOfCurrentMonth();
					});
				}
			})
			.value();
	}

	_checkEvents() {
		return _.every(this._events, function (evt) {
			switch (evt.tag) {
				case 'vol':
				case 'mep':
					return _.has(evt, 'rotationId');
				default:
					return true;
			}
		});
	}

	_checkDuplicates() {
		const counts = _.countBy(this._events, 'slug');
		// console.log(counts);
		return _.some(counts, (count, slug) => {
			return count > 1;
		});
	}

	_filterEventsByDates(events, start, end) {
		return _.filter(events, function(evt) {
			return (evt.end.isAfter(start) && evt.start.isBefore(end)) || evt.start.isSame(start) || evt.end.isSame(end);
		});
	}

	groupedEvents() {
		return this._groupedEvents;
	}

	groupedEventsThisMonth(month) {
		month = month || this.currentMonth;
		const start = moment(month).startOf('month'), end = moment(month).endOf('month');
		return lodash.mapValues(this._groupedEvents, (events, key) => {
			return this._filterEventsByDates(events, start, end);
		});
	}

	eventsThisMonth(month) {
		month = month || this.currentMonth;
		return this._filterEventsByDates(this._events, moment(month).startOf('month'), moment(month).endOf('month'));
	}

	eventsToSync(month) {
		month = month || this.currentMonth;
		const monthStart = moment(month).startOf('month'), nextMonthEnd = moment(month).endOf('month').add(1, 'month');
		let events = this._filterEventsByDates(this._events, monthStart, nextMonthEnd);
		const earliest = _.first(events);
		const latest = _.find(events, evt => evt.end.isAfter(nextMonthEnd));
		if (earliest.start.isBefore(monthStart) || latest) {
			const actualStart = earliest.start;
			let actualEnd = nextMonthEnd;
			if (latest) actualEnd = latest.end;
			events = this._filterEventsByDates(this._events, actualStart, actualEnd);
		}
		return events;
	}
}
