import { Meteor } from 'meteor/meteor'
import parseIcsFile from '/imports/api/client/lib/parseICSFile.js'
import Modals from '/imports/api/client/Modals.js'
import Swal from 'sweetalert2'
import _ from 'lodash'

App = {
	async sync() {
    if (!Connect.state.get('signNeeded') && !Connect.state.get('changesPending')) {
      const data = await Connect.getSyncData()
      Sync.process(data)
      return data
    }
	},

	async exportIcs() {
    const { IcsFile } = await import('./Exporter/IcsFile.js')
    const currentMonth = Controller.currentMonth.get()
    const filename = [ 'TO.sync', 'planning', currentMonth.year, currentMonth.month].join('_') + '.ics'
    
    const tags = Config.get('iCalendarTags')
    const content = Config.get('exportOptions')
    const useCREWMobileFormat = Config.get('useCREWMobileFormat')

    const icsFile = new IcsFile(this.eventsToSync())
    icsFile.generate({ tags, content, useCREWMobileFormat })
    icsFile.save(filename)
	},

	async exportHdvTable() {
    const { HdvTable } = await import('./Exporter/HdvTable.js')
    const currentMonth = Controller.currentMonth.get()
    const filename = ['TO.sync', 'HDV', currentMonth.year, currentMonth.month].join('_') + '.csv'
		HdvTable.generate(Controller.Planning.eventsThisMonth(), filename)
	},

	importIcs(data) {
		const events = parseIcsFile(data)
		if (events.length) {
			Sync.importPastEvents(events)
			// App.success(added.length + " nouveaux évènements ont été importés !")
		} else {
			App.warn('Aucun évènement trouvé !')
		}
	},

  async importPdf(arrayBuffer) {
    const Pdf = (await import('./lib/Pdf.js')).default
    const pdf = await Pdf.extractData(arrayBuffer)
    console.log(pdf)

    const { PdfPlanningParser } = await import('./lib/PdfPlanningParser.js')
    const planning = new PdfPlanningParser(pdf)
    console.log(planning)
    Sync.importPdfPlanning(planning)
  },

	updateTags(cb) {
    Meteor.call('getAllEventsOfMonth', Controller.currentMonth.get(), (error, eventsOfMonth) => {
  		if (eventsOfMonth) {
  			Sync.updateTags(eventsOfMonth)
  			if (_.isFunction(cb)) cb(undefined, true)
  		} else if (error) {
  			console.log(error)
  			if (_.isFunction(cb)) cb(error)
  		}
  	})
  },

	eventsToSync() {
		return _.sortBy(Controller.Planning.eventsToSync().concat(Controller.Calendar.getBlancEvents()), 'start')
	},

	support: {
		filereader : window.File && window.FileList && window.FileReader,
		isMobile: /iPhone|iPod|iPad|Android|BlackBerry/i.test(navigator.userAgent),
		isSafari: navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1
	}
}
