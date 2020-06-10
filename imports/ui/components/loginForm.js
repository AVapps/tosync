import { Template } from 'meteor/templating'
import './loginForm.html'
import * as Ladda from 'ladda'

Template.loginForm.events({
	'submit form#login': function (e, t) {
		e.preventDefault()

		const username = t.$('input[name=login]').val().toUpperCase()

		if (username.length !== 3) {
			App.error('Identifiant invalide !')
			return;
		}

		const l = Ladda.create(t.find('button.login')).start()

		Connect.login(username, t.$('input[name=password]').val(), (error) => {
			// Session.set('showLogin', false)
			t.$('input[type=password]').val('')
      App.sync()
      l.stop()
		})

		return false
	}
})
