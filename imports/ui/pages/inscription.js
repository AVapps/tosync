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
  this.state.set('errorMessage', null)
})

Template.inscription.events({
  'submit form#inscription': async (e,t) => {
    e.preventDefault()
    t.state.set('errorMessage', '')

    if (e.currentTarget.checkValidity()) {
      const email = t.find('input[name=email]').value
      const l = Ladda.create(t.find('button.js-user-subscribe'))
      l.start()

      subscribeUser.call({ email }, (err, res) => {
        if (err) {
          switch (err.error) {
            case 'tosync.subscribeUser.alreadySubscribed':
              t.state.set('errorMessage', `Un compte existe déjà pour cette adresse email.`)
              break
            default:
              Notify.error(err)
          }
        } else if (res.success) {
          t.state.set('emailSent', true)
        }
        t.find('input[name=email]').value = ''
        l.stop()
      })
    }
  }
})

Template.inscription.helpers({
  emailSent() {
    return Template.instance().state.get('emailSent')
  },

  errorMessage() {
    return Template.instance().state.get('errorMessage')
  }
})