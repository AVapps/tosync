import { Meteor } from 'meteor/meteor';
import { Excel } from './Exporter/Excel.js';
import { IcsFile } from './Exporter/IcsFile.js';
import parseIcsFile from '../toconnect/client/parseICSFile.js';
import swal from 'sweetalert2';

App = {
	templates: {
		events: {
			conge: 'congeDescriptionText',
			repos: 'reposDescriptionText',
			rotation: 'rotationDescriptionText',
			sol: 'solDescriptionText',
			vol: 'volDescriptionText'
		},

		modal: {
			rotation: 'rotationModalContent',
			// sv: 'svModalContent',
			sol: 'solModalContent',
			conge: 'defaultModalContent',
			repos: 'defaultModalContent',
			default: 'defaultModalContent',
			mois: 'monthModalContent'
		},

		titre: {
			rotation: _.template("Rotation <%= nbjours %>J du <%= tsStart.format('D MMMM') %>"),
			vol: _.template("<%= num %> | <%= from %> - <%= to %> | <%= type %>"),
			mep: _.template("<%= title %> | <%= from %> - <%= to %> | MEP")
		}
	},

	sync() {
		return Connect.getSyncData(function (data) {
			Sync.process(data);
		});
	},

	exportExcel() {
		Excel.generate(Controller.Planning);
	},

	exportIcs() {
		IcsFile.generate(this.eventsToSync());
	},

	importIcs(data) {
		const events = parseIcsFile(data);
		if (events.length) {
			Sync.importPastEvents(events);
			// App.success(added.length + " nouveaux évènements ont été importés !");
		} else {
			App.warn('Aucun évènement trouvé !');
		}
	},

	askForPlanningReparsing(message, cb) {
		swal({
		  title: 'Erreur de planning',
		  text: message,
		  type: 'warning',
		  showCancelButton: true,
			// buttonsStyling: false,
			// confirmButtonClass: 'btn btn-primary',
			// cancelButtonClass: 'btn btn-danger',
		  confirmButtonColor: '#2800a0',
		  cancelButtonColor: '#ff3268',
		  confirmButtonText: 'Ok',
			cancelButtonText: 'Annuler'
		}).then(() => {
			this.reparseEventsOfCurrentMonth(cb);
		  swal(
		    'Terminé !',
		    'Votre planning a été recalculé.',
		    'success'
		  )
		}, (dismiss) => {
			if (_.isFunction(cb)) cb(dismiss);
		});
	},

	reparseEventsOfCurrentMonth: _.throttle(_reparseEventsOfCurrentMonth, 5000, { 'trailing': false }),

	eventsToSync() {
		return Controller.Planning.eventsToSync();
	},

	support: {
		filereader : window.File && window.FileList && window.FileReader,
		isMobile: /iPhone|iPod|iPad|Android|BlackBerry/i.test(navigator.userAgent),
		isSafari: navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1
	},

	gares: [
		{
			"code":"GLE",
			"nom":"Gare Lille Europe"
		},
		{
			"code":"GLF",
			"nom":"Gare Lille Flandres"
		},
		{
			"code":"GNT",
			"nom":"Gare de Nantes"
		},
		{
			"code":"LPD",
			"nom":"Gare par dieu"
		},
		{
			"code":"LSE",
			"nom":"Gare St-Exupery"
		},
		{
			"code":"GPM",
			"nom":"Gare Montparnasse"
		},
		{
			"code":"GPN",
			"nom":"Gare du nord"
		},
		{
			"code":"GPE",
			"nom":"Gare de l'est"
		},
		{
			"code":"GPZ",
			"nom":"Gare St-Lazare"
		},
		{
			"code":"GPL",
			"nom":"Gare de Lyon"
		},
		{
			"code":"GPY",
			"nom":"Gare de Massy"
		},
		{
			"code":"GST",
			"nom":"Gare Strasbourg"
		},
		{
			"code":"GTZ",
			"nom":"Gare de Metz"
		}
	]
};

function _reparseEventsOfCurrentMonth(cb) {
	Meteor.call('getAllEventsOfMonth', Controller.currentMonth.get(), (error, eventsOfMonth) => {
		if (eventsOfMonth) {
			Sync.reparseEvents(eventsOfMonth);
			if (_.isFunction(cb)) cb(undefined, true);
		} else if (error) {
			console.log(error);
			if (_.isFunction(cb)) cb(error);
		}
	});
}
