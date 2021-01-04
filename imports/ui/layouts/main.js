import { Template } from 'meteor/templating'
import { Meteor } from 'meteor/meteor'
import './main.html'

import '../components/enrollModal.js'

Template.main.helpers({
  isLoggedIn() {
    return !!Meteor.userId()
  },

  connectAuthentificated() {
    return Connect.authentificated()
  }
})
