import { Meteor } from 'meteor/meteor'
import { Excel } from './Exporter/Excel.js'
import { IcsFile } from './Exporter/IcsFile.js'
import parseIcsFile from '/imports/api/toconnect/client/parseICSFile.js'
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

  async requestChangesValidation() {
    return Swal.fire({
      title: 'Modifications de planning',
      html: `<p>Des modifications de planning sont en attente de validation. Voulez-vous que TO.sync les valide pour vous ?</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#00D66C',
      cancelButtonColor: '#ff3268',
      confirmButtonText: '<i class="fa fa-check"></i> Ouvrir la page de validation',
      cancelButtonText: '<i class="fa fa-times"></i> Annuler'
    }).then((result) => {
      if (result.value) {
        Modals.Changes.open()
      }
    })
  },

  async requestPlanningSign() {
    return Swal.fire({
      title: 'Planning non signé',
      html: `<p><strong>TO.sync peut signer votre planning pour vous, mais seul le planning publié sur TO.connect fait foi !</strong></p><p>L'importation et la synchronisation de votre planning par TO.sync ne peuvent être garanties à 100%, <strong>il est nécessaire de consulter votre planning sur TO.connect.</strong></p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#00D66C',
      cancelButtonColor: '#ff3268',
      confirmButtonText: '<i class="fa fa-signature"></i> Signer mon planning',
      cancelButtonText: '<i class="fa fa-times"></i> Annuler'
    }).then(async (result) => {
      if (result.value) {
        await Connect.signPlanning()
        return App.sync()
      }
    })
  },

	exportExcel() {
		Excel.generate(Controller.Planning)
	},

	exportIcs() {
		IcsFile.generate(this.eventsToSync())
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
