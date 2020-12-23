import { Template } from 'meteor/templating'
import './login.html'
import { Meteor } from 'meteor/meteor'
import { Tracker } from 'meteor/tracker'
import firstUseDrive from '/imports/api/client/lib/Driver.js'
import * as Ladda from 'ladda'


Template.loginPage.onRendered(function () {
  Tracker.autorun(c => {
    if (Meteor.userId()) {
      Config.onReady(() => {
        const count = Config.get('firstUse')
        if (!count || count < 2) {
          const newCount = firstUseDrive(count)
          Config.set('firstUse', newCount)
        }
      })
      c.stop()
    }
  })
})

Template.loginPage.events({
  'submit form#newLogin': (e, t) => {
    e.preventDefault()

    if (e.currentTarget.checkValidity()) {
      const username = t.find('input[name=user-email]').value
      const password = t.find('input[name=user-password]').value
      
      const l = Ladda.create(t.find('button.js-tosync-login'))
      l.start()

      Meteor.loginWithPassword(username, password, (err) => {
        if (err) {
          // TODO : message à afficher pour proposer contact email en cas de problème
          Notify.error(err)
        }
        l.stop()
      })
    }
  },

  'click .js-google-button': (e,t) => {
    const l = Ladda.create(e.currentTarget)
    l.start()
    Meteor.loginWithGoogle({ requestPermissions: ['openid', 'email'] }, (err) => {
      if (err) {
        // TODO : message à afficher pour proposer contact email en cas de problème
        Notify.error(err)
      }
      l.stop()
    })
  }
})