import { Template } from 'meteor/templating'
import './loginForm.html'
import * as Ladda from 'ladda'

Template.loginForm.events({
	'submit form#login': async (e, t) => {
		e.preventDefault()

		const username = t.$('input[name=login]').val().toUpperCase()
    const pw = t.$('input[name=password]').val()

		if (username.length !== 3) {
			Notify.warn('Identifiant invalide !')
			return
		}

    if (!pw.length) {
      Notify.warn("Vous n'avez pas tapé de mot de passe.")
			return
    }

		const l = Ladda.create(t.find('button.login'))
    l.start()

		const success = await Connect.login(username, pw)
    console.log('Connect.login', success)
    // t.$('input[type=password]').val('')
    l.stop()
    if (success) App.sync()
		return false
	}
})

Template.loginForm.helpers({
  message() {
    return Connect.state.get('message')
  }
})
