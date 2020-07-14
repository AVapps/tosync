import { Template } from 'meteor/templating'
import './google.html'

import _ from 'lodash'
import * as Ladda from 'ladda'

import Utils from '/imports/api/client/lib/Utils'
import Modals from '/imports/api/client/Modals.js'
import Gapi from '/imports/api/client/Gapi.js'
import Export from '/imports/api/client/lib/Export.js'

window.Gapi = Gapi

Template.google.helpers({
	calendarList() {
    const list = Gapi.getCalendarList()
  	if (_.isArray(list)) return list
    return []
	},

  colors() {
    const colors = Gapi.getColors()
  	if (_.isArray(colors)) return colors
    return []
	},

  selectedColor(tag) {
    return Config.get(['eventsColors', tag].join('.'))
  },

  calendarTags(calendar) {
    return _.get(Config.getCalendarTags(), calendar.id) || []
  },

  isSignedIn() {
    return Gapi.isSignedIn()
  },

  colorChanged(tag) {
    return (color) => {
      return (color) => {
        Config.set(['eventsColors', tag].join('.'), color)
      }
    }
  },

  categories() {
		return Export.getSyncCategories()
	},

  categoryLabel(tag) {
		return Export.getSyncCategoryLabel(tag)
	}
})

Template.google.events({
	'click button.js-sync': function (e,t) {
    if (!t.ladda) {
      t.ladda = Ladda.create(e.currentTarget)
    }

		t.ladda.start()

    const progressBar = t.$('.progress-bar')
		const progress = (value) => {
			progressBar.css('width', value + '%')
			progressBar.attr('aria-valuenow', value)
      t.ladda.setProgress(value/100)
		}

		Gapi.syncEvents(App.eventsToSync(), progress).then(
      results => {
        Modals.Google.close()
        progress(0)
        t.ladda.stop()
  		},
      error => {
        if (error.error == 'sync-warning') {
          App.warn(error.reason)
        } else {
          App.error(error)
        }
        t.ladda.stop()
      }
    )
	},

  'click button.js-sign-in': function(e,t) {
    Gapi.signIn({
      prompt: 'select_account'
    })
  },

	'click button.js-change-user': async function(e,t) {
    await Gapi.signOut()
    Gapi.signIn({
      prompt: 'select_account'
    })
	},

  'click button.js-revoke': function(e,t) {
    Gapi.revoke()
    Modals.Google.close()
  },

  'click button.js-sign-out': function(e,t) {
    Gapi.signOut()
    Modals.Google.close()
  },
})

Template.googleCalendarLine.helpers({
	bgColor() {
		return this.calendar && {
			style: ['background-color:' + this.calendar.backgroundColor, 'color:' + this.calendar.foregroundColor].join(';')
		}
	},

	categories() {
		return Export.getSyncCategories()
	},

  checked(tag) {
		return _.includes(this.tags, tag)
	}
})

Template.googleCalendarLineTagSwitch.helpers({
  name() {
    return this.calendarId + '[' + this.tag + ']'
  },

	categoryLabel() {
		return Export.getSyncCategoryLabel(this.tag)
	}
})


Template.googleCalendarLineTagSwitch.events({
  'change input': function (e,t) {
    if (e.currentTarget.checked) {
      // console.log('added', t.data.calendarId, t.data.tag)
      Gapi.addTagToCalendarId(t.data.calendarId, t.data.tag)
    } else {
      // console.log('removed', t.data.calendarId, t.data.tag)
      Gapi.removeTagFromCalendarId(t.data.calendarId, t.data.tag)
    }
  }
})
