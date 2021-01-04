import { Template } from 'meteor/templating'
import { Accounts } from 'meteor/accounts-base'
import { ReactiveDict } from 'meteor/reactive-dict'
import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import './reinit-mdp.html'
import * as Ladda from 'ladda'

Template.reinitialisationMdp.onCreated(function () {
  this.state = new ReactiveDict()
})

Template.reinitialisationMdp.onRendered(function () {
  this.state.set('emailSent', false)
})

Template.reinitialisationMdp.events({
  'submit form#reset-pwd': (e,t) => {
    e.preventDefault()

    if (e.currentTarget.checkValidity()) {
      const email = t.find('input[name=user-email]').value
      const l = Ladda.create(t.find('button.js-user-submit'))
      l.start()

      Accounts.forgotPassword({ email }, err => {
        t.find('input[name=user-email]').value = ''
        l.stop()
        if (err) {
          Notify.error(err)
        } else {
          t.state.set('emailSent', true)
        }
      })
    }
  }
})

Template.reinitialisationMdp.helpers({
  emailSent() {
    return Template.instance().state.get('emailSent')
  }
})
