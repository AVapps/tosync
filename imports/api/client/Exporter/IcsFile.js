import './Blob.js'
import { saveAs } from 'file-saver'
import Utils from '/imports/api/client/lib/Utils.js'
import Export from '/imports/api/client/lib/Export.js'
import TemplatesIndex from '/imports/api/client/lib/TemplatesIndex.js'

export const IcsFile = {
	generate(events, filename = 'TOSync_plannning.ics') {
		const calArray = [
			"BEGIN:VCALENDAR",
			"VERSION:2.0",
			"METHOD:PUBLISH",
			"PRODID:-//TO.Sync//meteorjs//EN"
			// "X-WR-TIMEZONE:Europe/Paris",
			// "BEGIN:VTIMEZONE",
			// "TZID:Europe/Paris",
			// "TZURL:http://tzurl.org/zoneinfo/Europe/Paris",
			// "X-LIC-LOCATION:Europe/Paris",
			// "BEGIN:DAYLIGHT",
			// "TZOFFSETFROM:+0100",
			// "TZOFFSETTO:+0200",
			// "TZNAME:CEST",
			// "DTSTART:19810329T020000",
			// "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
			// "END:DAYLIGHT",
			// "BEGIN:STANDARD",
			// "TZOFFSETFROM:+0200",
			// "TZOFFSETTO:+0100",
			// "TZNAME:CET",
			// "DTSTART:19961027T030000",
			// "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
			// "END:STANDARD",
			// "END:VTIMEZONE"
		]

		const daysMap = []
		const dateFormat = "YYYYMMDD"
		const dateTimeFormat = "YYYYMMDD[T]HHmmss[Z]"

		const DTSTAMP = moment.utc().format(dateTimeFormat)

		function skip(evt) {
			const date  = evt.start.format('YYYY-MM-DD')
			const _skip = _.contains(daysMap, date)
			if (!_skip) daysMap.push(date)
			return _skip
		}

		function startVEvent(evt) {
			return ["BEGIN:VEVENT","UID:" + (evt.slug || Utils.slug(evt)), "DTSTAMP:" + DTSTAMP]
		}

		function addDates(evt, vevt) {
			const date = evt.start.clone().startOf('day')
			vevt.push("DTSTART;VALUE=DATE:" + date.format(dateFormat))
			vevt.push("DTEND;VALUE=DATE:" + date.add(1,'d').format(dateFormat))
			return vevt
		}

		function addDateTimes(evt, vevt) {
			vevt.push("DTSTART;VALUE=DATE-TIME:" + evt.start.utc().format(dateTimeFormat))
			vevt.push("DTEND;VALUE=DATE-TIME:" + evt.end.utc().format(dateTimeFormat))
			evt.start.local()
			evt.end.local()
			return vevt
		}

		function endVEvent(vevt) {
			vevt.push("END:VEVENT")
			calArray.push(vevt.join("\r\n"))
		}

    const tags = Config.get('iCalendarTags')
    const useCREWMobileFormat = Config.get('useCREWMobileFormat')
    const filteredEvents = Export.filterEventsByTags(events, tags)
    const exportOptions = Config.get('exportOptions')

		_.forEach(filteredEvents, (event, index) => {
			switch (event.tag) {
        case 'absence':
    		case 'conges':
    		case 'sanssolde':
        case 'blanc':
    		case 'repos':
    		case 'maladie':
    		case 'greve':
					if (skip(event)) return
					const vevent = startVEvent(event)
					addDates(event, vevent)
					vevent.push(
            "CATEGORIES:" + event.tag.toUpperCase(),
            "SUMMARY:" + Export.titre(event, useCREWMobileFormat),
            "DESCRIPTION:" + Export.description(event, exportOptions).replace(/\n/g, "\\n")
          )
					endVEvent(vevent)
					break
        case 'rotation':
					const veventR = startVEvent(event)
					veventR.push(
            "DTSTART;VALUE=DATE:" + event.start.clone().startOf('day').format(dateFormat),
            "DTEND;VALUE=DATE:" + event.end.clone().startOf('day').add(1,'d').format(dateFormat),
            "CATEGORIES:" + event.tag.toUpperCase(),
            "SUMMARY:" + Export.titre(event, useCREWMobileFormat),
            "DESCRIPTION:" + Export.description(event, exportOptions).replace(/\n/g, "\\n")
          )
					endVEvent(veventR)
					break
				case 'vol':
        case 'mep':
					const _vevent = startVEvent(event)
					addDateTimes(event, _vevent)
					_vevent.push(
						"CATEGORIES:" + event.tag.toUpperCase(),
						"SUMMARY:" + Export.titre(_.defaults(event, {from: '', to: '', type: '', num: ''}), useCREWMobileFormat),
						"DESCRIPTION:" + Export.description(event, exportOptions).replace(/\n/g, "\\n")
					)
					endVEvent(_vevent)
					break
				default:
					const __vevent = startVEvent(event)
					addDateTimes(event, __vevent)
					__vevent.push(
						"CATEGORIES:" + event.tag.toUpperCase(),
						"SUMMARY:" + event.summary,
						"DESCRIPTION:" + Export.description(event, exportOptions).replace(/\n/g, "\\n")
					)
					endVEvent(__vevent)
					break
			}
		})

		calArray.push("END:VCALENDAR")

    filename = filename || 'TOSync_plannning.ics'

    let shared = false
    try {
      const filesArray = [ new File([calArray.join("\r\n")], filename, { type: "text/calendar" }) ]
      if (navigator.canShare && navigator.canShare({ files: filesArray })) {
        // const blob = new Blob(, { type: "text/calendar" })
        navigator.share({
          files: filesArray,
          title: 'Planning',
          text: 'Planning'
        })
        .then(() => console.log('[Share was successful.]'))
        .catch((error) => console.log('[Sharing failed]', error))
        shared = true
      }
    } catch (error) {
      console.log(error)
    }

    if (!shared) {
      console.log(`[Your system doesn't support sharing files.]`)
      const blob = new Blob([calArray.join("\r\n")], { type: "text/calendar" })
      saveAs(blob, filename)
    }
	}
}
