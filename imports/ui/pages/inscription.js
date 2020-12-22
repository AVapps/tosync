import { Template } from 'meteor/templating'
import { ReactiveDict } from 'meteor/reactive-dict'
import './inscription.html'
import * as Ladda from 'ladda'
import { subscribeUser } from '/imports/api/methods.js'

Template.inscription.onCreated(function () {
  this.state = new ReactiveDict()
})

Template.inscription.onRendered(function () {
  this.state.set('emailSent', false)
})

Template.inscription.events({
  'submit form#inscription': async (e,t) => {
    e.preventDefault()

    if (e.currentTarget.checkValidity()) {
      const trigramme = t.find('input[name=trigramme]').value.toUpperCase()
      const email = t.find('input[name=user-email]').value
      const l = Ladda.create(t.find('button.js-user-subscribe'))
      l.start()
      console.log(trigramme, email)
      subscribeUser.call({ trigramme, email }, (err, res) => {
        if (err) {
          Notify.error(err)
        } else if (res.success) {
          t.state.set('emailSent', true)
        }
        t.find('input[name=trigramme]').value = ''
        t.find('input[name=user-email]').value = ''
        l.stop()
      })
    }
  }
})

Template.inscription.helpers({
  emailSent() {
    return Template.instance().state.get('emailSent')
  }
})