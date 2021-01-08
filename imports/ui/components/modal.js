import { Meteor } from 'meteor/meteor'
import { Template } from 'meteor/templating'
import './modal.html'
import _ from 'lodash'
import TemplatesIndex from '/imports/api/client/lib/TemplatesIndex.js'

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

	'click button.save': function(e,t) {
        if (!_.isEmpty(t.updateLog)) {
            _.forEach(t.updateLog, (set, _id) => {
                console.log(set, _id);
                Events.update(_id, { $set: set }, (e,r) => {
                    console.log(e,r);
                });
            });
        }
		if (!_.isEmpty(t.removeLog)) {
			Events.batchRemove(t.removeLog, (e,r) => {
				console.log(e,r)
			})
		}
		t.reset();
	},

    'hidden.bs.modal .modal': function(e,t) {
        t.reset();
        Controller.resetSelectedDay();
    },

    'set.tosync .modal': function(e, t, data) {
		_.forEach(data.set, (value, prop) => {
            if (_.get(data.event, prop) == value) {
                _.unset(t.updateLog, [data.event._id, prop]);
            } else {
                _.set(t.updateLog, [data.event._id, prop], value);
            }
        });
        if (_.isEmpty(_.get(t.updateLog, data.event._id))) {
            _.unset(t.updateLog, data.event._id);
        }
    },

    'removeEvent.tosync .modal': function(e, t, _id) {
        t.removeLog.push(_id);
    }
});

Template.modal.helpers({
	selectedDay() {
    return Controller.selectedDay.get();
	},

	template() {
		const selectedDay = Controller.selectedDay.get();
		if (selectedDay) {
			switch (_.first(selectedDay.events).tag) {
				case 'rotation':
				case 'vol':
				case 'mep':
					return TemplatesIndex.modal.rotation;
				// case 'sol':
					// return TemplatesIndex.modal.sol;
				default:
					return TemplatesIndex.modal.default;
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
