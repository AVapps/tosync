import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import moment from 'moment';
import SyncTools from './lib/syncCalendarEvents.js';

Sync = {

	process(data) {
		console.log(data);
		if (_.has(data, 'import')) {
			this.importPlanning(data['import']);
		} else if (_.has(data, 'importError')) {
			App.error(data.importError);
		}

		if (_.has(data, 'fill')) {
			this.importPastEvents(data.fill);
		}

		if (_.has(data, 'upsert')) {
			this.importActivitePN(data.upsert);
		} else if (_.has(data, 'activitePNError')) {
			App.error(data.activitePNError);
		}
	},

	// Importe les évènements en synchronisant les évènements sur le période importée
	importPlanning(events) {
		return SyncTools.syncCalendarEvents(events, {
			restrictToLastEventEnd: false
		});
	},

	// Importe des évènements
	importPastEvents(events) {
		return SyncTools.syncCalendarEvents(events);
	},

	// Met à jour ou insère si absent les vols et rotations uniquement
	importActivitePN(events) {
		// Filtre les évènements pour ne garder que ceux des 31 jours précédents
		const oneMonthAgo = moment().subtract(31, 'days').startOf('day');
		events = _.filter(events, evt => {
			return evt.end.isAfter(oneMonthAgo) || evt.end.isSame(oneMonthAgo);
		});

		// Set defaults
		events = _.map(events, evt => {
			return _.defaults(_.omit(evt, 'blk', 'ts', 'tvnuit'), {
				tag: 'vol',
				category: 'FLT'
			});
		});

		return SyncTools.syncPastEvents(events);
	},

	recomputeRotation(rotationId) {
		return SyncTools.recomputeExistingRotation(rotationId);
	},

	reparseEvents(events) {
		return SyncTools.reparseEvents(events);
	}

};
