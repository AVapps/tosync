import './Blob.js'
import { saveAs } from 'file-saver'
import Utils from '/imports/api/client/lib/Utils.js'
import Export from '/imports/api/client/lib/Export.js'
import { DateTime } from 'luxon'
import _ from 'lodash'

const ISO_DATETIME_FORMAT = { format: 'basic', suppressMilliseconds: true }
const ISO_DATE_FORMAT = { format: 'basic' }

export class IcsFile {
	constructor(events) {
		this.events = events
		this.vcalendar = ''
	}

	generate({ tags, content, useCREWMobileFormat }) {
		this.calArray = [
			"BEGIN:VCALENDAR",
			"VERSION:2.0",
			"METHOD:PUBLISH",
			"PRODID:-//TO.Sync//meteorjs//EN"
		]

		this.daysMap = []
		this.DTSTAMP = DateTime.utc().startOf('minute').toISO(ISO_DATETIME_FORMAT)
		const filteredEvents = Export.filterEventsByTags(this.events, tags)

		_.forEach(filteredEvents, (event) => {
			switch (event.tag) {
				case 'rotation':
					const veventR = this.startVEvent(event)
					veventR.push(
						"DTSTART;VALUE=DATE:" + DateTime.fromMillis(event.start).startOf('day').toISODate(ISO_DATE_FORMAT),
						"DTEND;VALUE=DATE:" + DateTime.fromMillis(event.end).startOf('day').plus({ day: 1 }).toISODate(ISO_DATE_FORMAT),
						"CATEGORIES:" + event.tag.toUpperCase(),
						"SUMMARY:" + Export.titre(event, useCREWMobileFormat),
						"DESCRIPTION:" + Export.description(event, content).replace(/\n/g, "\\n")
					)
					this.endVEvent(veventR)
					break
				case 'vol':
				case 'mep':
					const _vevent = this.startVEvent(event)
					this.addDateTimes(event, _vevent)
					_vevent.push(
						"CATEGORIES:" + event.tag.toUpperCase(),
						"SUMMARY:" + Export.titre(_.defaults(event, { from: '', to: '', type: '', num: '' }), useCREWMobileFormat),
						"DESCRIPTION:" + Export.description(event, content).replace(/\n/g, "\\n")
					)
					this.endVEvent(_vevent)
					break
				default:
					if (_.includes(Utils.alldayTags, event.tag)) {
						if (this.skip(event)) return
						const vevent = this.startVEvent(event)
						this.addDates(event, vevent)
						vevent.push(
							"CATEGORIES:" + event.tag.toUpperCase(),
							"SUMMARY:" + Export.titre(event, useCREWMobileFormat),
							"DESCRIPTION:" + Export.description(event, content).replace(/\n/g, "\\n")
						)
						this.endVEvent(vevent)
					} else {
						const __vevent = this.startVEvent(event)
						this.addDateTimes(event, __vevent)
						__vevent.push(
							"CATEGORIES:" + event.tag.toUpperCase(),
							"SUMMARY:" + event.summary,
							"DESCRIPTION:" + Export.description(event, content).replace(/\n/g, "\\n")
						)
						this.endVEvent(__vevent)
					}
					break
			}
		})

		this.calArray.push("END:VCALENDAR")
		this.vcalendar = this.calArray.join("\r\n")
		return this.vcalendar
	}

	save(filename = 'TOSync_plannning.ics') {
		const blob = new Blob([this.vcalendar], { type: "text/calendar" })
		saveAs(blob, filename)
	}

	skip(evt) {
		const date = DateTime.fromMillis(evt.start).toISODate()
		const _skip = _.includes(this.daysMap, date)
		if (!_skip) this.daysMap.push(date)
		return _skip
	}

	startVEvent(evt) {
		return ["BEGIN:VEVENT", "UID:" + (evt.slug || Utils.slug(evt)), "DTSTAMP:" + this.DTSTAMP]
	}

	addDates(evt, vevt) {
		const debut = DateTime.fromMillis(evt.start).startOf('day')
		const fin = DateTime.fromMillis(evt.end).startOf('day').plus({ day: 1 })

		vevt.push("DTSTART;VALUE=DATE:" + debut.toISODate(ISO_DATE_FORMAT))
		vevt.push("DTEND;VALUE=DATE:" + fin.toISODate(ISO_DATE_FORMAT))
		return vevt
	}

	addDateTimes(evt, vevt) {
		vevt.push("DTSTART;VALUE=DATE-TIME:" + DateTime.fromMillis(evt.start).toUTC().toISO(ISO_DATETIME_FORMAT))
		vevt.push("DTEND;VALUE=DATE-TIME:" + DateTime.fromMillis(evt.end).toUTC().toISO(ISO_DATETIME_FORMAT))
		return vevt
	}

	endVEvent(vevt) {
		vevt.push("END:VEVENT")
		this.calArray.push(vevt.join("\r\n"))
		return vevt
	}
}


