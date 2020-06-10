import { Template } from 'meteor/templating'
import './loginStatusBar.html'
import _ from 'lodash'
import Modals from '/imports/api/client/Modals.js'
import * as Ladda from 'ladda'

Template.loginStatusBar.helpers({
  userProfile() {
    return _.get(Meteor.user(), 'profile')
  },

  signNeeded() {
    return Connect.signNeeded()
  },

  changesPending() {
    return Connect.changesPending()
  },

  syncAvailable() {
    return !Connect.signNeeded() && !Connect.changesPending()
  },

  onSignClick() {
    return (doneCb) => {
      App.requestPlanningSign().finally(doneCb)
    }
  }
})

Template.loginStatusBar.events({
	'click button.logout': function (e,t) {
		Meteor.logout(function (error) {
			if (error) App.error(error)
		})
	},

  'click button.js-validateChanges': function (e,t) {
		Modals.Changes.open()
	},

  'submit form#login': function (e,t) {
		e.preventDefault()

		const username = t.$('input[name=login]').val().toUpperCase()

		if (username.length !== 3) {
			App.error('Identifiant invalide !')
			return;
		}

		const l = Ladda.create(t.find('button.login')).start()

		Connect.login(username, t.$('input[name=password]').val(), (error) => {
			// Session.set('showLogin', false)
			l.stop()
			t.$('input[type=password]').val('')
		})

		return false
	}
})

/*** connectButton ***/
Template.connectButton.onDestroyed(function () {
  if (this.laddaComp) this.laddaComp.stop()
})

Template.connectButton.helpers({

})

Template.connectButton.events({
	'click button': function (e,t) {
    if (!t.laddaComp) {
      const l = Ladda.create(e.currentTarget)
      Tracker.autorun(c => {
    		if (!t.laddaComp) t.laddaComp = c
    		if (Connect.running()) {
          l.start()
    		} else {
      		l.stop()
    		}
    	})
    }
		App.sync()
	}
})
