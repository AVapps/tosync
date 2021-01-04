import { Template } from 'meteor/templating'
import { ReactiveDict } from 'meteor/reactive-dict'
import { Accounts } from 'meteor/accounts-base'
import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import './new-password.html'
import * as Ladda from 'ladda'

Template.nouveauMdp.events({
  'submit form#password-reset': (e,t) => {
    e.preventDefault()

    if (e.currentTarget.checkValidity()) {
      const newPassword = t.find('input[name=user-password]').value
      const l = Ladda.create(t.find('button.js-user-submit'))
      l.start()

      Accounts.resetPassword(t.data.token, newPassword, (err) => {
        t.find('input[name=user-password]').value = ''
        l.stop()
        if (err) {
          Notify.error(err)
        } else {
          FlowRouter.go('/')
          Notify.success(`Votre nouveau mot de passe a été enregistré, vous pouvez maintenant vous connecter en utilisant vos identifiants spécifiques TO.sync !`)
        }
      })
    }
  }
})
