import { Template } from 'meteor/templating'
import { Meteor } from 'meteor/meteor'
import { Tracker } from 'meteor/tracker'
import './main.html'
import firstUseDrive from '/imports/api/client/lib/Driver.js'


Template.main.onRendered(function () {
  Tracker.autorun(c => {
    if (Meteor.userId()) {
      Config.onReady(() => {
        const count = Config.get('firstUse')
        if (!count || count < 2) {
          const newCount  = firstUseDrive(count)
          Config.set('firstUse', newCount)
        }
      })
      c.stop()
    }
  })
})

Template.main.helpers({
  isLoggedIn() {
    return !!Meteor.userId()
  },

  connectAuthentificated() {
    return Connect.authentificated()
  }
})
