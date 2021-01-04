import { Template } from 'meteor/templating'
import { Meteor } from 'meteor/meteor'
import './enrollModal.html'

import * as Ladda from 'ladda'
import _ from 'lodash'

import { subscribeLoggedUser } from '/imports/api/methods.js'

Template.enrollModal.onCreated(function () {
  this.state = new ReactiveDict()
})

Template.enrollModal.onRendered(function () {
  this.state.set('enrollEmail', false)
  this.state.set('googleEmail', false)
})

Template.enrollModal.events({
  'submit form#enrollForm': (e, t) => {
    e.preventDefault()

    if (e.currentTarget.checkValidity()) {
      const emailInput = t.find('input[name=email]')
      emailInput.disabled = true
      const email = emailInput.value

      const l = Ladda.create(t.find('button.js-tosync-submit'))
      l.start()

      subscribeLoggedUser.call({ email }, err => {
        emailInput.value = ''
        emailInput.disabled = false
        l.stop()
        if (err) {
          Notify.error(err)
        } else {
          t.state.set('enrollEmail', email)
        }
      })
    }
  },

  'click button.btn-google': (e, t) => {
    const l = Ladda.create(t.find('button.js-tosync-submit'))
    l.start()

    Meteor.loginWithGoogle({ requestPermissions: ['openid', 'email'] }, (err) => {
      l.stop()
      if (err) {
        switch (err.error) {
          case 'tosync.googleServiceAdded':
            console.log(err)
            t.state.set('googleEmail', err.reason)
            break
          default:
            Notify.error(err)
        }
      }
    })
  },
})

Template.enrollModal.helpers({
  enrollEmail() {
    return Template.instance().state.get('enrollEmail') || _.get(Meteor.user(), 'services.password.reset.email')
  },

  googleEmail() {
    return Template.instance().state.get('googleEmail') || _.get(Meteor.user(), 'services.google.email')
  }
})