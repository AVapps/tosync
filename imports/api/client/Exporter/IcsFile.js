import './Blob.js';
import saveAs from './FileSaver.js';
import Utils from '../lib/Utils.js';

export const IcsFile = {
	generate(events) {
		var calArray = [
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
		];

		var daysMap = [],
			dateFormat = "YYYYMMDD",
			dateTimeFormat = "YYYYMMDD[T]HHmmss[Z]";

		var DTSTAMP = moment.utc().format(dateTimeFormat);

		function skip(evt) {
			var date  = evt.start.format('YYYY-MM-DD');
			var _skip = _.contains(daysMap, date);
			if (!_skip) daysMap.push(date);
			return _skip;
		}

		function startVEvent(evt) {
			return ["BEGIN:VEVENT","UID:" + (evt.slug || Utils.slug(evt)), "DTSTAMP:" + DTSTAMP];
		}

		function addDates(evt, vevt) {
			var date = evt.start.clone().startOf('day');
			vevt.push("DTSTART;VALUE=DATE:" + date.format(dateFormat));
			vevt.push("DTEND;VALUE=DATE:" + date.add(1,'d').format(dateFormat));
			return vevt;
		}

		function addDateTimes(evt, vevt) {
			vevt.push("DTSTART;VALUE=DATE-TIME:" + evt.start.utc().format(dateTimeFormat));
			vevt.push("DTEND;VALUE=DATE-TIME:" + evt.end.utc().format(dateTimeFormat));
			evt.start.local();
			evt.end.local();
			return vevt;
		}

		function endVEvent(vevt) {
			vevt.push("END:VEVENT");
			calArray.push(vevt.join("\r\n"));
		}

		_.forEach(events, (event, index) => {
			switch (event.tag) {
				case 'repos':
					if (skip(event)) return;
					var vevent = startVEvent(event);
					addDates(event, vevent);
					vevent.push("CATEGORIES:REPOS", "SUMMARY:"+this._titre(event), "DESCRIPTION:"+this._description(event));
					endVEvent(vevent);
					break;
				case 'conges':
					if (skip(event)) return;
					var vevent = startVEvent(event);
					addDates(event, vevent);
					vevent.push("CATEGORIES:CONGES", "SUMMARY:"+this._titre(event), "DESCRIPTION:"+this._description(event));
					endVEvent(vevent);
					break;
				case 'delegation':
					if (skip(event)) return;
					var vevent = startVEvent(event);
					addDates(event, vevent);
					vevent.push("CATEGORIES:SOL", "SUMMARY:"+this._titre(event), "DESCRIPTION:"+this._description(event));
					endVEvent(vevent);
					break;
				case 'rotation':
					var vevent = startVEvent(event);
					addDateTimes(event, vevent);
					vevent.push(
						"CATEGORIES:ROTATION",
						"SUMMARY:" + this._titre(event),
						"DESCRIPTION:" + this._description(event).replace(/\n/g, "\\n")
					);
					endVEvent(vevent);
					break;
				case 'vol':
					var vevent = startVEvent(event);
					addDateTimes(event, vevent);
					vevent.push(
						"CATEGORIES:VOL",
						"SUMMARY:" + this._titre(event),
						"DESCRIPTION:" + this._description(event).replace(/\n/g, "\\n")
					);
					endVEvent(vevent);
					break;
				case 'mep':
					var vevent = startVEvent(event);
					addDateTimes(event, vevent);
					vevent.push(
						"CATEGORIES:VOL",
						"SUMMARY:" + this._titre(event),
						"DESCRIPTION:" + this._description(event).replace(/\n/g, "\\n")
					);
					endVEvent(vevent);
					break;
				default:
					var vevent = startVEvent(event);
					addDateTimes(event, vevent);
					vevent.push(
						"CATEGORIES:" + event.tag.toUpperCase(),
						"SUMMARY:" + event.summary,
						"DESCRIPTION:" + event.description
					);
					endVEvent(vevent);
					break;
			}
		});

		calArray.push("END:VCALENDAR");

		if (App.support.isMobile && App.support.isSafari) {
			var planning = 'data:text/calendar,' + encodeURIComponent(calArray.join("\r\n"));
			window.open(planning, 'TOSync_planning.ics');
		} else {
			if (App.support.isSafari) {
				alert("Si le fichier s'ouvre dans une fenêtre pressez les touches [CMD] + [S] pour l'enregistrer. Pour une meilleure compatibilité utilisez Firefox ou Chrome !");
			}
			var blob = new Blob([calArray.join("\r\n")], {type: "text/calendar"});
			saveAs(blob, 'TOSync_plannning.ics');
		}
	},

	_description(event) {
		switch (event.tag) {
			case 'conges':
				return App.templates.events.conge ? Blaze.toHTMLWithData(Template[App.templates.events.conge], event) : event.description;
			case 'repos':
				return App.templates.events.repos ? Blaze.toHTMLWithData(Template[App.templates.events.repos], event) : event.description;
			case 'rotation':
				return App.templates.events.rotation ? Blaze.toHTMLWithData(Template[App.templates.events.rotation], event) : event.description;
			case 'vol':
			case 'mep':
				return App.templates.events.vol ? Blaze.toHTMLWithData(Template[App.templates.events.vol], event) : event.description;
			default:
				return App.templates.events.sol ? Blaze.toHTMLWithData(Template[App.templates.events.sol], event) : event.description;
		}
	},

	_titre(event) {
		switch (event.tag) {
			case 'rotation':
				return App.templates.titre.rotation ?  App.templates.titre.rotation(event) : Utils.titre(event);
			case 'vol':
				return App.templates.titre.vol ?  App.templates.titre.vol(event) : event.summary;
			case 'mep':
				return App.templates.titre.mep ?  App.templates.titre.mep(event) : event.summary;
			default:
				return Utils.titre(event);
		}
	}
};
