import { Template } from 'meteor/templating';
import './login.html';

Template.login.helpers({
	showStatus: function () {
		return !Session.get('showLogin') && Meteor.user();
	}
});

Template.loggedIn.onRendered(function () {
	this.$('button').tooltip();
});

Template.loggedIn.events({
	'click button.relogin': function (e, t) {
		Session.set('showLogin', true);
	},
	'click button.logout': function (e, t) {
		Meteor.logout(function (error) {
			if (error) {
				App.error(error);
			}
		});
	}
});

Template.loggedOut.events({
	'submit': function (e, t) {
		e.preventDefault();
		var username = t.$('input[name=login]').val().toUpperCase();

		if (username.length !== 3) {
			App.error('Identifiant invalide !');
			return;
		}

		var l = Ladda.create(t.find('button.import')).start();

		Connect.login(username, t.$('input[name=password]').val(), function (error) {
			Session.set('showLogin', false);
			l.stop();
			t.$('input[type=password]').val('');
		});

		Tracker.autorun(function (c) {
			if (Connect.authentificated()) {
				App.sync();
				c.stop();
			}
		});

		return false;
	}
});

Template.connectButton.onRendered(function () {
	this.$('button').tooltip();
	var l = Ladda.create(this.find('button.connect-sync')).start();
	Tracker.autorun(c => {
		this.laddaComp = c;
		if (Connect.running()) {
			l.start();
		} else {
			l.stop();
		}
	});
});

Template.connectButton.onDestroyed(function () {
	this.laddaComp.stop();
});

Template.connectButton.events({
	'click button': function (e, t) {
		App.sync();
	}
});

Template.loggedIn.helpers({
	nom() {
		return Meteor.user().profile.nom;
	},

	prenom() {
		return Meteor.user().profile.prenom;
	},

	username: function () {
		return Meteor.user().profile.prenom + ' ' + Meteor.user().profile.nom;
	}
});