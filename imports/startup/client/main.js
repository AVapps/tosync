import { Meteor } from 'meteor/meteor'

import './helpers.js'

import '/imports/api/client/lib/format.min.js'
import '/imports/api/client/lib/moment.lang.fr'

import '/imports/api/client/App.js'
import '/imports/api/client/Notifications.js'
import Gapi from '/imports/api/client/Gapi.js'
// import '/imports/api/client/Remu.js';
import '/imports/api/client/Sync.js'
import '/imports/api/client/Config.js'

import '/imports/api/client/collections.js'
import '/imports/api/toconnect/client/login.js'

import '/imports/api/client/Calendar.js'
import '/imports/api/client/Connect.js'
import '/imports/api/client/Controller.js'
import '/imports/api/client/Modals.js'

import '/imports/lib/moment-ejson.js'

// Service worker for offline access
Meteor.startup(() => {
  if (navigator && navigator.serviceWorker) {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('Service Worker successfully registered !'))
      .catch(err => console.log('ServiceWorker registration failed: ', err))
  }
})

// Session Init
Session.set('calendarList', [])
Session.set('calendarLoading', false)
Session.setDefault('showLogin', false)

Config.init()
Connect.init()
Controller.init()

window.handleGapiClientLoad = function () {
  console.log('GAPI.handleGapiClientLoad')
	Meteor.defer(() => {
    Gapi.loadClient()
  })
}
