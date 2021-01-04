import { Template } from 'meteor/templating'
import './login.html'
import { Meteor } from 'meteor/meteor'
import { Tracker } from 'meteor/tracker'
import { ReactiveDict } from 'meteor/reactive-dict'
import firstUseDrive from '/imports/api/client/lib/Driver.js'
import * as Ladda from 'ladda'

Template.loginPage.onCreated(function () {
  this.state = new ReactiveDict()
})

Template.loginPage.onRendered(function () {
  this.state.set('googleErrorMessage', null)

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
  'submit form#newLogin': (e,t) => {
    e.preventDefault()

    if (e.currentTarget.checkValidity()) {
      const username = t.find('input[name=email]').value
      const password = t.find('input[name=user-password]').value
      
      const l = Ladda.create(t.find('button.js-tosync-login'))
      l.start()

      Meteor.loginWithPassword(username, password, (err) => {
        if (err) {
          Notify.error(err)
          t.find('input[name=user-password]').value = ''
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
        switch (err.error) {
          case 403:
            t.state.set('googleErrorMessage', `Pour vous connecter avec Google, vous devez d'abord activer l'authentification Google depuis les paramètres de votre compte TO.sync. Si vous possédez plusieurs comptes Google, veillez à bien sélectionner celui que vous avez utlisé lors de l'activation.`)
            break
          default:
            Notify.error(err)
        }
      } else {
        t.state.set('googleErrorMessage', null)
      }
      l.stop()
    })
  }
})

Template.loginPage.helpers({
  googleErrorMessage() {
    return Template.instance().state.get('googleErrorMessage')
  }
})