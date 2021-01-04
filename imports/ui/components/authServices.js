import { Template } from 'meteor/templating'
import { Tracker } from 'meteor/tracker'
import { Meteor } from 'meteor/meteor'
import './authServices.html'
import './emailSettings.js'

import _ from 'lodash'
import * as Ladda from 'ladda'

import { disableGoogleAuth, subscribeLoggedUser } from '/imports/api/methods.js'
import Modals from '/imports/api/client/Modals.js'

Template.authServices.onCreated(function () {
  this.subscribe('userServices')
})

Template.authServices.onCreated(function () {
  this.autorun(c => {
    if (this.subscriptionsReady()) {
      const user = Meteor.user()
      if (!_.has(user, 'services.google') && !_.has(user, 'services.password')) {
        Tracker.afterFlush(() => {
          Modals.Enroll.open()
        })
        c.stop()
      }
    }
  })
})

Template.authServices.helpers({
  emails() {
    return _.get(Meteor.user(), 'emails')
  },

  hasPwd() {
    return _.has(Meteor.user(), 'services.password')
  },

  pwdEmail() {
    return _.get(_.find(Meteor.user().emails, { verified: true }), 'address')
  },

  hasEnrollToken() {
    return _.get(Meteor.user(), 'services.password.reset.reason') === 'enroll'
  },

  resetTokenEmail() {
    return _.get(Meteor.user(), 'services.password.reset.email')
  },

  hasResetToken() {
    return _.get(Meteor.user(), 'services.password.reset.reason') === 'reset'
  },

  resetPassword() {
    let email = _.get(_.find(Meteor.user().emails, { verified: true }), 'address')

    if (!email) {
      const trigramme = Meteor.user().username
      email = _.get(PN.findOne({ trigramme }), 'email')
    }

    return (doneCb) => {
      if (!email) {
        throw new Meteor.Error('no-verified-email', `Adresse e-mail introuvable !`)
      }

      Accounts.forgotPassword({ email }, err => {
        if (err) {
          Notify.error(err)
        } else {
          Notify.success(`Un email de réinitialisation de mot de passe a été envoyé à ${ email }.`)
        }
        doneCb()
      })
    }
  },

  hasGoogleAuth() {
    return _.has(Meteor.user(), 'services.google')
  },

  googleAuthEmail() {
    return _.get(Meteor.user(), 'services.google.email')
  },

  disableGoogleAuth() {
    return (doneCb) => {
      disableGoogleAuth.call(err => {
        if (err) {
          Notify.error(err)
        }
        doneCb()
      })
    }
  },

  enableGoogleAuth() {
    return (doneCb) => {
      Meteor.loginWithGoogle({ requestPermissions: ['openid', 'email'] }, (err) => {
        if (err) {
          switch (err.error) {
            case 'tosync.googleServiceAdded':
              // Inscription OK
              break
            default:
              Notify.error(err)
          }
        }
        doneCb()
      })
    }
  }
})

Template.authServices.events({
  'submit form#enrollMiniForm': (e, t) => {
    e.preventDefault()

    if (e.currentTarget.checkValidity()) {
      const emailInput = t.find('form#enrollMiniForm input[name=email]')
      emailInput.disabled = true
      const email = emailInput.value

      const l = Ladda.create(t.find('form#enrollMiniForm button.js-tosync-submit'))
      l.start()

      subscribeLoggedUser.call({ email }, err => {
        l.stop()
        if (err) {
          emailInput.value = ''
          emailInput.disabled = false
          Notify.error(err)
        } else {
          t.find('form#enrollMiniForm button.js-tosync-submit').disabled = true
          Notify.success(`Un e-mail de confirmation a été envoyé à ${ email }, merci de consulter votre boîte de réception.`)
          t.$('#pwdCollapse').collapse('hide')
        }
      })
    }
  }
})