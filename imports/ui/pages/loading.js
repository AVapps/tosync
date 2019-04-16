import { Template } from 'meteor/templating';
import './loading.html';

Template.loading.helpers({
	display: function () {
		return Session.get('calendarLoading') ? 'active' : '';
	}
});