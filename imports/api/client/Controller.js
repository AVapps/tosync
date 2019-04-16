import _ from 'lodash';
import { Planning } from './lib/Planning.js';

Controller = {
	eventsStart: moment(),
	eventsEnd: moment(),

	currentMonth: new ReactiveVar({
		year: 2017,
		month: 4
	}, _.isEqual),

	selectedDay: new ReactiveVar(null, _.isEqual),
	selectedUser: new ReactiveVar(),

	currentEvents: new ReactiveVar([], _.isEqual),

	Planning: null,
	Calendar: null,
	Remu: ReactiveVar({}),

	init() {
		const self = this;
		Tracker.autorun(function (c) {
			if (Config.ready()) {
				const cmonth = Config.get('currentMonth');
				if (cmonth) {
					self.currentMonth.set(cmonth);
					c.stop();
				}
			}
		});

		this.Calendar = Calendar;
		this.EventsSubs = new SubsManager({
			// maximum number of cache subscriptions
			cacheLimit: 5,
			// any subscription will be expire after 5 minute, if it's not subscribed again
			expireIn: 10
		});


		Tracker.autorun(() => {
			const currentMonth = this.currentMonth.get();
			const cmonth = moment(currentMonth);
			this.eventsStart = cmonth.clone().subtract(7, 'days');
			this.eventsEnd = cmonth.endOf('month').add(7, 'days');
			this.EventsSubs.subscribe('cloud_events', +this.eventsStart, +this.eventsEnd, this.selectedUser.get());
			Config.set('currentMonth', currentMonth);
		});

		Tracker.autorun(function () {
			self.onEventsChanged();
		});

	},

	setSelectedDay(date) {
		const day = _.find(this.Calendar.daysData.get(), { date });
		this.selectedDay.set(day);
	},

	resetSelectedDay() {
		this.selectedDay.set(null);
	},

	onEventsChanged() {
		if (this.EventsSubs.ready()) {
			console.time('calendar');
			let events = Events.find({
					userId: this.selectedUser.get() || Meteor.userId(),
					end: { $gte: +this.eventsStart },
					start: { $lte: +this.eventsEnd }
				}, { sort: [['start', 'asc'], ['end', 'desc']] }).fetch();
			const currentMonth = this.currentMonth.get();
			this.Planning = new Planning(events, currentMonth);
			Tracker.autorun(c => {
				this.Remu.set(this.Planning.Remu.get());
			});
			this.currentEvents.set(events);
			this.Calendar.generateDaysData(currentMonth, events);
			Tracker.nonreactive(() => {
				// Refresh modal content
				if (this.selectedDay.get()) {
					this.setSelectedDay(this.selectedDay.get().date);
				}
			});
			console.log('Calendar Refresh', events.length);
			console.timeEnd('calendar');
		}
	},

	_sortEvents(events) {
		events = _.sortBy(events, 'start');
	},

	prevMonth() {
		this.currentMonth.set(this._prevMonth(this.currentMonth.get()));
	},

	nextMonth() {
		this.currentMonth.set(this._nextMonth(this.currentMonth.get()));
	},

	_prevMonth(date) {
		if (date.month == 0) {
			return {
				month: 11,
				year: date.year - 1
			};
		} else {
			return {
				month: date.month - 1,
				year: date.year
			};
		}
	},

	_nextMonth(date) {
		if (date.month == 11) {
			return {
				month: 0,
				year: parseInt(date.year) + 1
			};
		} else {
			return {
				month: parseInt(date.month) + 1,
				year: date.year
			};
		}
	}
};
