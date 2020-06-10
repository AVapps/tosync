import moment from 'moment';
import Utils from '../../client/lib/Utils.js';
import _ from 'lodash'

export default function (str) {
	let start = str.indexOf('BEGIN:VEVENT');

	if (start === -1) return [];

	start += 13;

	str = str.substr(start).replace(/\r\n/g, '\n');

	const events = str.split(/END:VEVENT\s+BEGIN:VEVENT/).map((event, index) => {
		const raw = {};
		_.chain(event.split('\n'))
			.filter(function (data) {
				return !!data;
			})
			.value()
			.forEach(function (data) {
				let i = data.indexOf(':'),
					j = data.indexOf(';');

				if (i === -1) return;

				if (j === -1) {
					j = i;
				}

				raw[data.substring(0, j)] = data.substr(i+1).trim();
			});

    if (raw.STATUS == 'CANCELLED' || raw.SUMMARY.indexOf('UNKNOWN') !== -1) return

		const evt = {
			// category,
			// tag,
			start: moment.utc(raw.DTSTART, 'YYYYMMDD[T]HHmmss[Z]').local(),
			end: moment.utc(raw.DTEND, 'YYYYMMDD[T]HHmmss[Z]').local(),
			summary: raw.SUMMARY,
			description: raw.DESCRIPTION,
			uid: raw.UID
		}

		if (raw.CATEGORIES) {
			const category = raw.CATEGORIES.toUpperCase();
			const tag = Utils.findTag(category);

			_.extend(evt, { category, tag });

			switch (tag) {
        case 'absence':
    		case 'conges':
    		case 'sanssolde':
        case 'blanc':
    		case 'repos':
    		case 'maladie':
    		case 'greve':
    		case 'stage':
    		case 'sol':
    		case 'instructionSol':
    		case 'simu':
    		case 'instructionSimu':
    		case 'reserve':
    		case 'delegation':
					return evt;

				case 'vol':
					// Fonction
					let m = raw.DESCRIPTION.match(/FCT : (\w{3})/);
					if (m && m.length > 1) {
						evt.fonction = m[1];
					}

					// Type avion
					m = raw.DESCRIPTION.match(/A\/C : (\S+)\\n/);
					if (m && m.length > 1) {
						evt.type = m[1];
					}

					// Equipage
					m = raw.DESCRIPTION.match(/Crew Member : T:(\S+)\\nC:(\S+)\\n/);
					if (m && m.length === 3) {
						evt.pnt = m[1].split('-');
						evt.pnc = m[2].split('-');
					}

					// Remarques
					m = raw.DESCRIPTION.match(/Remark : (.+)$/);
					if (m && m.length > 1) {
						evt.remark = m[1];
					}

					// Numéro de vol, Origine, Destination, Décalage horaire
					m = raw.SUMMARY.match(/^([A-Z][A-Z]\d{3,4}) ([A-Z]{3})-([A-Z]{3})\((.\d{4})\)/);
					if (m && m.length === 5) {
						evt.num = m[1];
						evt.from = m[2];
						evt.to = m[3];
						evt.tz = m[4];
					}

					return _.defaults(evt, {
						fonction: 'ND',
						type: '73H',
						pnt: [],
						pnc: [],
						remark: '',
						num: 'TOXXXX',
						from: 'ND',
						to: 'ND',
						tz: '+02:00'
					});

				case 'mep':
					const match = raw.SUMMARY.match(/^(\w+) ([A-Z]{3})\*([A-Z]{3})/);

					if (match && match.length === 4) {
						_.extend(evt, {
							title: match[1],
							from: match[2],
							to: match[3]
						});
					}

					if (category === "ENGS") {
						_.extend(evt, {
							title: "Enregistrement"
						});
					}

					return  _.defaults(evt, {
						title: 'MEP',
						from: '',
						to: ''
					});

				default:
					console.log("Catégorie inconnue !", raw.CATEGORIES, raw.SUMMARY, raw);
					evt.tag = 'autre';
					return evt;
			}
		} else {
			console.log('!!! No CATEGORIES !!! ', raw);
			evt.tag = 'autre';
			return evt;
		}
	});
	return _.filter(events)
};
