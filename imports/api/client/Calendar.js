import _ from 'lodash';

Calendar = {
	daysData: new ReactiveVar([]),

	cmonth: moment(),
	start: moment(),
	end: moment(),

	cursor: null,
	_events: [],
	days: [],
	now: moment(),

	init: function () {
		// Reservé
	},

	generateDaysData: function (currentMonth, events) {
		this.cmonth = moment(currentMonth);
		this.start = this.cmonth.clone().startOf('month').startOf('week'),
		this.end = this.cmonth.clone().endOf('month').endOf('week');

		events = _.filter(events, evt => {
			if (evt.start && evt.end && moment.isMoment(evt.start) && moment.isMoment(evt.end)) {
				return evt.end.isAfter(this.start) && evt.start.isBefore(this.end);
			} else {
				console.log(evt);
				return false;
			}
		});

		this.cursor = this.start.clone();
		this._events = [];
		this.days = [];
		this.now = moment();

		_.forEach(events, evt => {
			while (evt.start.isAfter(this.cursor, 'day')) {
				this.pushDay();
			}
			if (evt.start.isSame(this.cursor, 'day')) {
				this._events.push(evt);
			}
		});

		while (this.cursor.isBefore(this.end, 'day') || this.cursor.isSame(this.end, 'day')) {
			this.pushDay();
		}

		this.daysData.set(this.days);
		return this.days;
	},

	getDaysData: function () {
		return this.daysData.get();
	},

	flushEvents: function() {
		this._events = _.reject(this._events, (evt) => {
			return evt.end.isBefore(this.cursor, 'day');
		});
	},

	pushDay: function() {
		var day = {
			date: this.cursor.clone(),
			weekday: this.cursor.format('dd'),
			day: this.cursor.date(),
			dof: this.cursor.weekday(),
			classes: []
		};

		this.flushEvents();

		if (this._events.length) {
			day.events = this._events.slice();
			day.classes.push('event');
		}

		day.classes.push('calendar-dow-' + day.dof);
		day.classes.push('calendar-day-' + day.date.format("YYYY-MM-DD"));

		if (this.cursor.isBefore(this.now, 'day')) {
			day.classes.push('past');
		} else if (this.cursor.isSame(this.now, 'day')) {
			day.classes.push('today');
		}

		if (this.cursor.isBefore(this.cmonth, 'month')) {
			day.classes.push('adjacent-month', 'last-month');
		} else if (this.cursor.isAfter(this.cmonth, 'month')) {
			day.classes.push('adjacent-month', 'next-month');
		}

		day.classes = day.classes.join(' ');
		this.days.push(day);
		this.cursor.add(1, 'day');
	}
};
