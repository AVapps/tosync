import { Template } from 'meteor/templating';
import './google.html';

Template.google.onRendered(function() {
	this.$syncButton = this.$('button.sync').ladda();
	this.$progressBar = this.$('.progress-bar');
});

Template.google.helpers({
	calendarList: function () {
		var list = Gapi.getCalendarList();
		if (_.isArray(list)) return list;
		return [];
	}
});

Template.google.events({
	'change select': function (e,t) {
		var obj = {};
		if (e.added) {
			// console.log('added', e.added.id, e.currentTarget.name);
			Config.addTagToCalendarId(e.currentTarget.name, e.added.id);
		}
		if (e.removed) {
			// console.log('removed', e.removed.id, e.currentTarget.name);
			Config.removeTagFromCalendarId(e.currentTarget.name, e.removed.id);
		}
	},

	'click button.sync': function (e,t) {
		t.$syncButton.ladda( 'start' );

		const progress = (value) => {
			t.$progressBar.css('width', value + '%');
			t.$progressBar.attr('aria-valuenow', value);
		};

		progress(0);

		Gapi.syncEvents(App.eventsToSync(), progress, (error, results) => {
			if (error) {
				App.error(error);
			} else {
				Modals.Google.close();
			}
			t.$syncButton.ladda( 'stop' );
			progress(0);
		});
	},

	'click button.authorize': function (e,t) {
		Gapi.authorize(_.noop, (err) => App.error(err));
	}
});

const tagLabel = {
	rotation: 'Rotations',
	sol: 'Activités sol',
	instruction: 'Instruction',
	vol: 'Vols',
	repos: 'Repos',
	conges: 'Congés',
	maladie: 'Maladie',
	greve: 'Grève'
}

Template.googleCalendarLine.helpers({
	bgColor: function () {
		return this && {
			style: ['background-color:' + this.backgroundColor, 'color:' + this.foregroundColor].join(';')
		};
	},

	selected: function (id, tag) {
		return _.contains(Config.get('googleCalendarIds')[id], tag) ? 'selected' : '';
	},

	categories: function () {
		return Config.calendarTags;
	},

	categoryLabel: function (category) {
		return tagLabel[category];
	}
});

Template.googleCalendarLine.onRendered(function () {
	this.$('select').select2({width: "100%"});

	this.autorun(() => {
		Template.currentData();
		this.$('select').select2('destroy').select2({width: "100%"});
	});
});
