import { Template } from 'meteor/templating'
import { ReactiveDict } from 'meteor/reactive-dict'
import * as Ladda from 'ladda'
import Modals from '/imports/api/client/Modals.js'
import Gapi from '/imports/api/client/Gapi.js'
import './GoogleButton.html'

Template.GoogleButton.onCreated(function () {
  this.state = new ReactiveDict({ loading: false })
})

Template.GoogleButton.onRendered(function () {
  if (!this.ladda) {
    this.ladda = Ladda.create(this.find('.js-google-button'))
    this.setProgress = (value) => {
      this.ladda.setProgress(value/100)
    }
  }
  if (!this.laddaComp) {
    Tracker.autorun(comp => {
      if (!this.laddaComp) this.laddaComp = comp
      if (this.state.get('loading')) {
        this.ladda.start()
      } else {
        this.ladda.stop()
      }
    })
  }
})

Template.GoogleButton.onDestroyed(function () {
  if (this.laddaComp) this.laddaComp.stop()
})

Template.GoogleButton.helpers({
  isSignedIn() {
    return Gapi.isSignedIn()
  }
})

Template.GoogleButton.events({
  'click button.js-google-button': function (e,t) {
    t.state.set('loading', true)
		if (Gapi.isSignedIn()) {
  		Gapi.syncEvents(App.eventsToSync(), t.setProgress).then(
        results => {
          Modals.Google.close()
          t.setProgress(0)
          t.state.set('loading', false)
    		},
        error => {
          if (error.error == 'sync-warning') {
            App.warn(error.reason)
            Modals.Google.open()
          } else {
            App.error(error)
          }
          t.setProgress(0)
          t.state.set('loading', false)
        }
      )
    } else {
      Gapi.signIn().then(
        value => {
          Modals.Google.open()
    			t.state.set('loading', false)
        },
        reason => {
          console.log(reason)
    			t.state.set('loading', false)
        }
      )
    }
	},


    'click button.js-google-settings': function (e,t) {
  		Modals.Google.open()
  	}
})
