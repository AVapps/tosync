import { Template } from 'meteor/templating'
import './toolbar.html'

import _ from 'lodash'

import Modals from '/imports/api/client/Modals.js'
import Export from '/imports/api/client/lib/Export.js'


Template.toolbar.helpers({
  disabledIfNoEvents() {
    return Controller.currentEvents.get().length ? '' : 'disabled'
  },

  categories() {
		return Export.getSyncCategories()
	},

  iCalendarTags() {
    return Config.get('iCalendarTags')
  },

  checked(tags, tag) {
    return _.includes(tags, tag)
  },

  crewMobileFormatChecked() {
    return Config.get('useCREWMobileFormat')
  }
})

Template.toolbar.events({
  'click button.js-icalendar-settings': function (e,t) {
    t.$('#iCalendarModal').modal('show')
  },

	'click button.js-icalendar-export': function (e, t) {
		e.preventDefault()
		App.exportIcs()
	},

  'click button.js-csv-export': function (e, t) {
		e.preventDefault()
		App.exportHdvTable()
	},

	'click button.js-icalendar-import': function (e, t) {
		e.preventDefault()

		if (App.support.isMobile) return App.warn("Cette fonctionnalité n'est pas disponible sur les terminaux mobiles !")

		if (!App.support.filereader) return App.warn("Votre navigateur ne prend pas en charge la lecture de fichiers !", "Utilisez la dernière version de Firefox, Safari ou Chrome.")

		if (!Meteor.userId()) return App.warn("Non connecté !", "Vous devez vous connecter pour pouvoir importer un fichier ics.")

		t.$('#filereader').trigger('click')
	},

	'change #filereader': function (e, t) {
		if (e.target.files && e.target.files.length) {
			if (e.target.files[0].type === 'text/calendar') {
				const fr = new FileReader()

				fr.onload = function () {
					App.importIcs(fr.result)
          e.target.value = ""
				}

				fr.onerror = function () {
					App.error("Une erreur s'est produite durant la lecture du fichier !")
          e.target.value = ""
				}

				fr.readAsText(e.target.files[0])

			} else {
				App.error('Format de fichier incorrect. Vous devez séléctionner un fichier .ics encodé utf-8.')
			}
		}
	},

  'change #exportFormat': function (e,t) {
    if (e.currentTarget.checked) {
      Config.set('useCREWMobileFormat', true)
    } else {
      Config.set('useCREWMobileFormat', false)
    }
  }
})

Template.iCalendarCategoryTagSwitch.helpers({
  name() {
    return 'iCalendar[' + this.tag + ']'
  },

	categoryLabel() {
		return Export.getSyncCategoryLabel(this.tag)
	}
})

Template.iCalendarCategoryTagSwitch.events({
  'change input': (e,t) => {
    if (e.currentTarget.checked) {
      // console.log('added', t.data.tag)
      Config.addTagToICalendar(t.data.tag)
    } else {
      // console.log('removed', t.data.tag)
      Config.removeTagFromICalendar(t.data.tag)
    }
  }
})
