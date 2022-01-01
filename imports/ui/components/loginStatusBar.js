import { Template } from 'meteor/templating'
import './loginStatusBar.html'
import _ from 'lodash'
import Modals from '/imports/api/client/Modals.js'
import * as Ladda from 'ladda'

Template.loginStatusBar.helpers({
  userProfile() {
    return _.get(Meteor.user(), 'profile')
  },

  bases() {
    return ['ORY','LYS','MPL','NTE']
  },

  selectedBase(base) {
    return base === Config.get('base') ? 'selected' : ''
  }
})

Template.loginStatusBar.events({
	'click button.logout': function (e,t) {
		Meteor.logout(function (error) {
			if (error) App.error(error)
		})
	},

  'change select#baseSelect': (e,t) => {
    if (e.currentTarget.value && e.currentTarget.value.length === 3) {
      Config.set('base', e.currentTarget.value)
    } else {
      Config.set('base', null)
    }
  }
})
