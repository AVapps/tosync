import _ from 'lodash'
import { DateTime } from 'luxon'
import SyncTools from './lib/syncCalendarEvents.js'
import PdfPlanningImporter from './lib/PdfPlanningImporter'
import Utils from './lib/Utils.js'

Sync = {

	process(data) {
		console.log('Sync.process', data)
		if (_.has(data, 'import')) {
			this.importPlanning(data['import'])
		}

		if (_.has(data, 'fill')) {
			this.importPastEvents(data.fill)
		}

		if (_.has(data, 'upsert')) {
			this.importActivitePN(data.upsert)
		}
	},

	// Importe les évènements en synchronisant les évènements sur le période importée
	importPlanning(events) {
		return SyncTools.syncCalendarEvents(events, {
			restrictToLastEventEnd: false
		})
	},

	// Importe les évènements en synchronisant les évènements sur le période importée
	importPdfPlanning(planning) {
		const PdfImport = new PdfPlanningImporter(planning)
		console.log(PdfImport)
	},

	// Importe des évènements
	importPastEvents(events) {
		return SyncTools.syncCalendarEvents(events)
	},

	// Met à jour ou insère si absent les vols et rotations uniquement
	importActivitePN(events) {
		// Filtre les évènements pour ne garder que ceux des 31 jours précédents
		const oneMonthAgo = DateTime.local().minus({ days: 31 }).startOf('day').toMillis()
		events = _.filter(events, evt => {
			return evt.end >= oneMonthAgo
		})

		// Set defaults
		events = _.map(events, evt => {
			return _.defaults(_.omit(evt, 'blk', 'ts', 'tvnuit'), {
				tag: 'vol',
				category: 'FLT'
			})
		})

		return SyncTools.syncPastEvents(events)
	},

	recomputeRotation(rotationId) {
		return SyncTools.recomputeExistingRotation(rotationId)
	},

	reparseEvents(events) {
		return SyncTools.reparseEvents(events)
	},

  updateTags(events) {
    // Update tag of events
    _.forEach(events, evt => {
      if (evt.category) {
        const tag = Utils.findTag(evt.category)
        if (tag !== 'autre' && tag !== evt.tag) {
          evt.tag = tag
          console.log('NEW TAG', evt.summary, evt.category, evt.tag, tag)
          Events.update(evt._id, {
            $set: {
              tag: tag,
              slug: Utils.slug(evt)
            }
          })
        }
      }
    })
  }
}
