import { Template } from 'meteor/templating'
import './calendar.html'

import _ from 'lodash'
import { DateTime } from 'luxon'
import Hammer from 'hammerjs'
import Utils from '/imports/api/client/lib/Utils.js'
import Modals from '/imports/api/client/Modals.js'

Template.calendar.onRendered(function () {
  this.hammer = new Hammer(this.find('#planningContent'), { preset: [ 'swipe' ] })
  this.hammer
    .on('swipeleft', (e) => {
      Controller.nextMonth()
    })
    .on('swiperight', (e) => {
      Controller.prevMonth()
    })
})

Template.calendar.events({
	'click .fc-cell.event': function (e,t) {
		Controller.setSelectedDay(this.day)
		Modals.Day.open()
	},

	'click button.clndr-previous-button': function (e, t) {
		Controller.prevMonth()
	},

	'click button.clndr-next-button': function (e, t) {
		Controller.nextMonth()
	},

	'click button.fc-style': function (e, t) {
		switch (Config.get('calendarMode')) {
			case 'table':
				Config.set('calendarMode', 'list');
				break;
			case 'list':
				Config.set('calendarMode', 'table');
				break;
		}
	},

	'click button.remu': function (e, t) {
		e.preventDefault();
		Modals.Remu.open();
	},

  'click a.remu': function (e, t) {
		e.preventDefault();
		Modals.Remu.open();
	}
});

Template.calendar.helpers({
  days() {
		return Controller.Calendar.getDays()
	},

	hasEvents() {
		return Controller.currentEventsCount.get();
	},

	month() {
		return Controller.currentMonth.get();
	},

	monthTitle() {
		return DateTime.fromObject(Controller.currentMonth.get()).toLocaleString({ year: 'numeric', month: 'long' })
	},

	remu() {
    const stats = Controller.statsRemu()
    const eHSconfig = Config.get('eHS')
    if (_.has(stats, 'AF') && eHSconfig === 'B') {
      stats.eHS = stats.AF.eHS
    } else if (_.has(stats, 'TO') && eHSconfig === 'A') {
      stats.eHS = stats.TO.eHS
    }
    return stats
	},

  eHSclass(eHS) {
    return eHS < 0 ? 'badge-danger' : 'badge-success'
  },

	displayStyle() {
		switch (Config.get('calendarMode')) {
			case 'table':
				return 'fc-table';
			case 'list':
				return 'fc-list';
		}
		return 'fc-table';
	},

  isTableStyle() {
    return Config.get('calendarMode') === 'table'
  }
})

Template.planningCalendarDay.helpers({
  dayClasses() {
		const classes = ['calendar-dow-' + this.day.dof].concat(this.day.classes)
		if (this.day.allday) {
			classes.push('allday')
		}
		return classes.join(' ')
  },

	eventsList() {
		if (this.day.events && this.day.events.length) {
			const events = _.reject(this.day.events, evt => evt.tag === 'rotation')
			return _.map(events, (evt) => {
				const event = _.extend({'classes': []}, evt)
				if (evt.debut < this.day.date.startOf('day')) {
					event['classes'].push('start-before-day')
				}
				if (evt.fin > this.day.date.endOf('day')) {
					event['classes'].push('end-after-day')
				}
				if (_.isArray(event.events) && event.events.length) {
					_.forEach(event.events, sub => {
						sub.classes = []
						const debut = sub.debut || DateTime.fromMillis(sub.start)
						if (debut < this.day.date.startOf('day')) {
              sub["classes"].push("start-before-day")
						}
						const fin = sub.fin || DateTime.fromMillis(sub.end)
            if (fin > this.day.date.endOf('day')) {
              sub["classes"].push("end-after-day")
            }
					})
				}
				return event
			})
		}
		return []
	},

	calendarEventTemplate(evt) {
		switch (evt.tag) {
			case 'rotation':
			case 'vol':
			case 'sv':
			case 'mep':
				return 'planningCalendar' + Utils.ucfirst(evt.tag);
			default:
				return 'planningCalendarEvent';
		}
	}
});

Template.planningCalendarEvent.helpers({
	classes() {
		return this['classes'].join(' ')
	}
})

Template.planningCalendarVol.helpers({
	classes() {
		return this['classes'].join(' ')
	}
})

Template.planningCalendarMep.helpers({
	classes() {
		return this['classes'].join(' ')
	},
	mepTitle() {
		if (this.from && this.to) {
			return `MEP ${ this.num || this.title } (${this.from}-${this.to})`
		} else {
			return this.summary
		}
	}
})

Template.planningCalendarDayLabel.helpers({
	dayLabelClass(tag) {
		if (tag) {
			return Utils.tagLabelClass(tag)
		}
		return 'badge-default';
	},

	spanClass() {
		// TODO Cas de 2 rotations le même jour (une finissant après minuit puis une autre partant l'après-midi)
		if (this.tag === 'rotation' || this.allday) {
			const evt = _.find(this.events, { tag: this.tag})
			if (evt && evt.debut && evt.fin) {
				const classes = []
				if (evt.debut.hasSame(this.date,'day')) {
					classes.push('span-start')
				} else {
					classes.push('span-left')
				}
				if (evt.fin.hasSame(this.date,'day')) {
					classes.push('span-end')
				} else {
					classes.push('span-right')
				}
				return classes.join(' ')
			}
		}
	},

	dayLabelText(tag) {
		if (tag) {
			return Utils.tagLabel(tag);
		}
		return '';
	}
});
