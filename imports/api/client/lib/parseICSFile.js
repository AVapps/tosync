import Utils from '../../client/lib/Utils.js'
import { DateTime } from 'luxon'
import _ from 'lodash'

export default function (str) {
	let start = str.indexOf('BEGIN:VEVENT')

	if (start === -1) return []

	str = str.substring(start).replace(/\r\n/g, '\n')

	console.log(str)

	const events = str.split(/END:VEVENT\s+BEGIN:VEVENT/).map((event) => {
		const raw = {}
		_.chain(event.split(/\n/g))
			.compact()
			.forEach((data) => {
				if (data.indexOf(':') !== -1) {
					let [key, ...value] = data.split(':')
					value = value.join(':')
					if (key.indexOf(';') !== -1) {
						key = key.split(';').shift()
					}
					key = key.trim()
					raw[key] = value.trim()
				}
			})
			.value()

    if (raw.STATUS == 'CANCELLED' || raw.SUMMARY.indexOf('UNKNOWN') !== -1) return

		const evt = {
			// category,
			// tag,
			start: DateTime.fromISO(raw.DTSTART, {setZone: true}).valueOf(),
			end: DateTime.fromISO(raw.DTEND, {setZone: true}).valueOf(),
			summary: raw.SUMMARY,
			description: raw.DESCRIPTION,
			uid: raw.UID
		}

		console.log(raw)

		if (raw.CATEGORIES) {
			const category = raw.CATEGORIES.toUpperCase()
			const tag = Utils.findTag(category)

			_.assign(evt, { category, tag })

			switch (tag) {
				case 'vol':
					// Fonction
					let m = raw.DESCRIPTION.match(/FCT : (\w{3})/)
					if (m && m.length > 1) {
						evt.fonction = m[1]
					}

					// Type avion
					m = raw.DESCRIPTION.match(/A\/C : (\S+)\\n/)
					if (m && m.length > 1) {
						evt.type = m[1]
					}

					// Equipage
					console.log(raw.DESCRIPTION)
					m = raw.DESCRIPTION.match(/Crew Member : T:(\S+)\\nC:(\S+)\\n/)
					if (m && m.length === 3) {
						evt.pnt = m[1].split('-')
						evt.pnc = m[2].split('-')
					}

					// Remarques
					m = raw.DESCRIPTION.match(/Remark : (.+)$/)
					if (m && m.length > 1) {
						evt.remark = m[1]
					}

					// Numéro de vol, Origine, Destination, Décalage horaire
					m = raw.SUMMARY.match(/^([A-Z][A-Z]\d{3,4}) ([A-Z]{3})-([A-Z]{3})\((.\d{4})\)/)
					if (m && m.length === 5) {
						evt.num = m[1]
						evt.from = m[2]
						evt.to = m[3]
						evt.tz = m[4]
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
					})

				case 'mep':
					const match = raw.SUMMARY.match(/^(\w+) ([A-Z]{3})\*([A-Z]{3})/)

					if (match && match.length === 4) {
						_.extend(evt, {
							title: match[1],
							from: match[2],
							to: match[3]
						})
					}

					if (category === "ENGS") {
						_.extend(evt, {
							title: "Enregistrement"
						})
					}

					return  _.defaults(evt, {
						title: 'MEP',
						from: '',
						to: ''
					})

				default:
					if (_.includes(Utils.tags, evt.tag)) {
						return evt
					} else {
						console.log("Catégorie inconnue !", raw.CATEGORIES, raw.SUMMARY, raw)
						evt.tag = 'autre'
						return evt
					}
			}
		} else {
			console.log('!!! No CATEGORIES !!! ', raw)
			evt.tag = 'autre'
			return evt
		}
	})
	return _.filter(events)
}
