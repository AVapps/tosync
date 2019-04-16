import { Template } from 'meteor/templating';
import './calendar.html';

import _ from 'lodash';
import Utils from '../../api/client/lib/Utils.js';

Template.calendar.events({
	'click .fc-cell.event': function (e,t) {
		Controller.setSelectedDay(this.date);
		Modals.Day.open();
	},

	'click button.clndr-previous-button': function (e, t) {
		Controller.prevMonth();
	},

	'click button.clndr-next-button': function (e, t) {
		Controller.nextMonth();
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
	}
});

Template.calendar.helpers({
	hasEvents() {
		return Controller.currentEvents.get().length;
	},

	month() {
		return Controller.currentMonth.get();
	},

	remu() {
		const remu = Controller.Remu.get();
		if (remu && _.isNumber(remu.HC) && _.isNumber(remu.HS)) {
			return remu;
		} else {
			return { HC: 0.0, HS: 0.0 };
		}

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

	displayStyleIcon() {
		switch (Config.get('calendarMode')) {
			case 'table':
				return 'glyphicon-list';
			case 'list':
				return 'glyphicon-calendar';
		}
		return 'glyphicon-calendar';
	}
});

Template.planningCalendarDay.helpers({
	weekday() {
		return this.date.format('ddd').substr(0, 3);
	},

	showEvents() {
		if (this && this.length) {
			switch (this[0].tag) {
				case 'conges':
				case 'repos':
				case 'maladie':
				case 'greve':
					return false;
				default:
					return true;
			}
		}
		return false;
	},

	eventsList() {
		if (this.events && this.events.length) {
			const events = _.reject(this.events, evt => evt.tag === 'rotation');
			return _.map(events, (evt, index) => {
				const event = _.extend({'classes': []}, evt);
				// if (index === 0) event['classes'].push('first');
				// if (index === events.length - 1) event['classes'].push('last');
				if (evt.start.isBefore(this.date, 'day')) event['classes'].push('start-before-day');
				if (evt.end.isAfter(this.date, 'day')) event['classes'].push('end-after-day');
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
	getDayTag() {
		if (this.events && this.events.length) {
			const hasRotation = _.some(this.events, evt => {
				return _.includes(['rotation', 'mep', 'vol'], evt.tag);
			});
			if (hasRotation) {
				return 'rotation';
			} else {
				return this.events[0].tag;
			}
		} else {
			return null;
		}
	},

	dayLabelClass(tag) {
		if (tag) {
			return Utils.tagLabelClass(tag)
		}
		return 'label-default';
	},

	spanClass() {
		// TODO Cas de 2 rotations le même jour (un finissant près minuit puis une autre partant l'après-midi)
		if (this.events && this.events.length && (this.events[0].tag === 'rotation' || this.events[0].tag === 'vol')) {
			const rot = _.find(this.events, evt => evt.tag === 'rotation');
			if (rot && rot.start && rot.end && rot.nbjours) {
				const classes = ['span-' + rot.nbjours];
				if (rot.start.isSame(this.date, 'day')) {
					classes.push('span-start');
				} else {
					classes.push('span-left');
				}
				if (rot.end.isSame(this.date, 'day')) {
					classes.push('span-end');
				} else {
					classes.push('span-right');
				}
				return classes.join(' ');
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
