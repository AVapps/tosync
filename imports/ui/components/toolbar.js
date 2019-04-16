import { Template } from 'meteor/templating';
import './toolbar.html';

Template.toolbar.onRendered(function() {
	this.$googleButton = this.$('button.google').ladda();
});

Template.toolbar.events({
	'click button.google': function (e, t) {
		var inputs = t.$('input, button.import').prop('disabled', true);
		t.$googleButton.ladda('start');

		var success = function () {
			Modals.Google.open();
			t.$googleButton.ladda('stop');
			inputs.prop('disabled', false);
		};

		var error = function (msg) {
			App.error(msg);
			t.$googleButton.ladda('stop');
			inputs.prop('disabled', false);
		};

		Gapi.checkAuth(function () {
			Gapi.loadCalendarList();
			success();
		}, error);
	},

	'click button.export': function (e, t) {
		e.preventDefault();
		App.exportIcs();
	},

	'click button.icsimport': function (e, t) {
		e.preventDefault();

		if (App.support.isMobile) return App.warn("Cette fonctionnalité n'est pas disponible sur les terminaux mobiles !");

		if (!App.support.filereader) return App.warn("Votre navigateur ne prend pas en charge la lecture de fichiers !", "Utilisez la dernière version de Firefox, Safari ou Chrome.");

		if (!Meteor.userId()) return App.warn("Non connecté !", "Vous devez vous connecter pour pouvoir importer un fichier ics.");

		t.$('#filereader').trigger('click');
	},

	'change #filereader': function (e, t) {
		if (e.target.files && e.target.files.length) {
			if (e.target.files[0].type === 'text/calendar') {
				const fr = new FileReader();

				fr.onload = function () {
					App.importIcs(fr.result);
				};

				fr.onerror = function () {
					App.error("Une erreur s'est produite durant la lecture du fichier !");
				};

				fr.readAsText(e.target.files[0]);

			} else {
				App.error('Format de fichier incorrect. Vous devez séléctionner un fichier .ics encodé utf-8.');
			}
		}
	}
});
