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
      const trigramme = t.find('input[name=trigramme]').value.toUpperCase()
      const email = t.find('input[name=email]').value
      const l = Ladda.create(t.find('button.js-user-subscribe'))
      l.start()

      subscribeUser.call({ trigramme, email }, (err, res) => {
        if (err) {
          switch (err.error) {
            case 'pn-inconnu':
              t.state.set('errorMessage', `Le couple ( ${ trigramme } / ${ email } ) ne correspond à aucun PN connu. S'il s'agit d'une erreur, veuillez envoyer un e-mail à <a href="mailto:contact@avapps.fr" target="blank">contact@avapps.fr</a> en précisant vos nom, prénom, trigramme et fonction.`)
              break
            default:
              Notify.error(err)
          }
        } else if (res.success) {
          t.state.set('emailSent', true)
        }
        t.find('input[name=trigramme]').value = ''
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