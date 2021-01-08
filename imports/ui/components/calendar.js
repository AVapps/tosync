import { Template } from 'meteor/templating'
import './calendar.html'

import _ from 'lodash'
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

	weekday() {
		return this.day.date.format('ddd').substr(0, 3);
	},

	eventsList() {
		if (this.day.events && this.day.events.length) {
			const events = _.reject(this.day.events, evt => evt.tag === 'rotation');
			return _.map(events, (evt, index) => {
				const event = _.extend({'classes': []}, evt);
				// if (index === 0) event['classes'].push('first');
				// if (index === events.length - 1) event['classes'].push('last');
				if (evt.start.isBefore(this.day.date, 'day')) event['classes'].push('start-before-day');
				if (evt.end.isAfter(this.day.date, 'day')) event['classes'].push('end-after-day');
				return event;
			});
		}
		return [];
	},

	calendarEventTemplate(evt) {
		switch (evt.tag) {
			case 'rotation':
			case 'vol':
				return 'planningCalendar' + Utils.ucfirst(evt.tag);
			default:
				return 'planningCalendarEvent';
		}
	}
});

Template.planningCalendarEvent.helpers({
	classes() {
		return this['classes'].join(' ');
	}
});

Template.planningCalendarVol.helpers({
	classes() {
		return this['classes'].join(' ');
	}
});

Template.planningCalendarDayLabel.helpers({
	dayLabelClass(tag) {
		if (tag) {
			return Utils.tagLabelClass(tag)
		}
		return 'badge-default';
	},

	spanClass() {
		// TODO Cas de 2 rotations le même jour (une finissant après minuit puis une autre partant l'après-midi)
		if (this.tag == 'rotation') {
			const rot = _.find(this.events, evt => evt.tag === 'rotation')
			if (rot && rot.start && rot.end) {
				const classes = []
				if (rot.start.isSame(this.date, 'day')) {
					classes.push('span-start')
				} else {
					classes.push('span-left')
				}
				if (rot.end.isSame(this.date, 'day')) {
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
