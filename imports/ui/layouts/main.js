import { Template } from 'meteor/templating';
import './main.html';

Template.main.helpers({
	days: function () {
		return Calendar.getDaysData();
	},
	hasEvents: function () {
		return Controller.currentEvents.get().length;
	}
});
