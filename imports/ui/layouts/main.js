import { Template } from 'meteor/templating'
import { Meteor } from 'meteor/meteor'
import { Tracker } from 'meteor/tracker'
import './main.html'
import firstUseDrive from '/imports/api/client/lib/Driver.js'

Template.main.helpers({
  isLoggedIn() {
    return !!Meteor.userId()
  },

  connectAuthentificated() {
    return Connect.authentificated()
  }
})
