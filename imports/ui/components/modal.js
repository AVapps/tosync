import { Tracker } from 'meteor/tracker'
import { Template } from 'meteor/templating'
import './modal.html'
import _ from 'lodash'
import TemplatesIndex from '/imports/api/client/lib/TemplatesIndex.js'
import { DateTime } from 'luxon'
import { getDutyStart, getDutyEnd } from '/imports/api/model/utils.js'

Template.modal.onCreated(function() {
	this.state = new ReactiveDict();
	this.state.setDefault({
		editing: false
	});

	this.updateLog = {};
	this.removeLog = [];

	this.reset = () => {
		this.state.set('editing', false);
		this.updateLog = {};
		this.removeLog = [];
	}
});

Template.modal.events({
	'click button.editing': function(e,t) {
		t.state.set('editing', true);
	},

	'click button.cancel': function(e,t) {
		t.reset();
		t.$('table.events tbody tr').fadeIn();
	},

	'click button.save': function (e, t) {
		if (!_.isEmpty(t.updateLog)) {
			_.forEach(t.updateLog, (modifier, _id) => {
				console.log(modifier, _id)
				Events.update(_id, modifier, (e,r) => {
						console.log(e,r)
				})
			})
		}
		if (!_.isEmpty(t.removeLog)) {
			Events.batchRemove(t.removeLog, (e,r) => {
				console.log(e,r)
			})
		}
		t.reset()
	},

    'hidden.bs.modal .modal': function(e,t) {
			t.reset()
			Controller.resetSelectedDay()
    },

    'set.tosync .modal': function(e, t, data) {
			if (_.has(data.event, '_id')) {
				_.forEach(data.set, (value, prop) => {
					if (_.get(data.event, prop) == value) {
						_.unset(t.updateLog, [data.event._id, '$set', prop])
					} else {
						_.set(t.updateLog, [data.event._id, '$set', prop], value)
					}
				})
			} else {
				const day = Controller.selectedDay.get()
				const selector = _.pick(data.event, 'num', 'from', 'to', 'start')
				const sv = _.find(day.events, evt => {
					if (evt.tag !== 'rotation' && evt.events && evt.events.length) {
						return _.find(evt.events, selector)
					}
				})
				const index = _.findIndex(sv.events, selector)
				if (index !== -1) {
					_.forEach(data.set, (value, prop) => {
						const path = ['events', index, prop].join('.')
						if (_.get(data.event, prop) === value) {
							_.unset(t.updateLog, [sv._id, '$set', path])
						} else {
							_.set(t.updateLog, [sv._id, '$set', path], value)
						}
					})
				}
			}

			if (_.isEmpty(_.get(t.updateLog, data.event._id))) {
				_.unset(t.updateLog, data.event._id)
			}
    },

    'removeEvent.tosync .modal': function(e, t, evt) {
			if (_.has(evt, '_id')) {
				t.removeLog.push(evt._id)
			} else {
				const day = Controller.selectedDay.get()
				let selector
				if (evt.tag === 'vol' || evt.tag === 'mep') {
					selector = _.pick(evt, 'tag', 'from', 'to', 'start')
				} else {
					selector = _.pick(evt, 'tag', 'summary', 'start')
				}
				const duty = _.find(day.events, evt => {
					if (evt.tag !== 'rotation' && evt.events && evt.events.length) {
						return _.find(evt.events, selector)
					}
				})
				const newEvents = _.reject(duty.events, selector)
				_.set(t.updateLog, [duty._id, '$pull', 'events'], selector)
				_.set(t.updateLog, [duty._id, '$set', 'start'], getDutyStart(newEvents))
				_.set(t.updateLog, [duty._id, '$set', 'end'], getDutyEnd(newEvents))
			}
    }
})

Template.modal.helpers({
	fullDate() {
		const selectedDay = Controller.selectedDay.get()
		return selectedDay ? selectedDay.date.toLocaleString(DateTime.DATE_HUGE).replace(/ 1 /g, ' 1er ') : ''
	},

	selectedDay() {
    return Controller.selectedDay.get();
	},

	template() {
		const selectedDay = Controller.selectedDay.get()
		if (selectedDay) {
			switch (selectedDay.tag) {
				case 'rotation':
					return TemplatesIndex.modal.rotation
				// case 'sol':
					// return TemplatesIndex.modal.sol
				default:
					if (selectedDay.allday) {
						return TemplatesIndex.modal.allday
					} else {
						return TemplatesIndex.modal.default
					}
			}
		} else {
			return null;
		}
	},

	templateData() {
		return {
      state: { editing: Template.instance().state.get('editing') },
      day: Controller.selectedDay.get()
    }
	},

	editing() {
		return Template.instance().state.get('editing');
	}
});
