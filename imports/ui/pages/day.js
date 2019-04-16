import { Template } from 'meteor/templating';
import './day.html';

Template.day.onCreated(function() {
	this.state = new ReactiveDict();
	this.state.setDefault({
		editing: false
	});
});

Template.day.events({
	'click button.editing': function(e,t) {
		t.state.set('editing', true);
	},

	'click button.cancel': function(e,t) {
		t.state.set('editing', false);
	},

	'click button.save': function(e,t) {
		console.log(this);
		t.state.set('editing', false);
	},
});

Template.day.helpers({
	selectedDay() {
		return Controller.selectedDay.get();
	},

	template() {
		const selectedDay = Controller.selectedDay.get();
		switch (_.first(selectedDay.events).tag) {
			case 'rotation':
			case 'vol':
				return App.templates.modal.rotation;
			case 'sol':
				// return App.templates.modal.sol;
			default:
				return App.templates.modal.default;
		}
	},

	templateData() {
		return _.extend({ editing: Template.instance().state.get('editing') }, Controller.selectedDay.get());
	},

	editing() {
		return Template.instance().state.get('editing');
	}
});
