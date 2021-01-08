import { Template } from 'meteor/templating'
import './adminPNImport.html'
import { adminSubscribeUser } from '/imports/api/methods.js'
import * as Ladda from 'ladda'

Template.adminPNImport.events({
	'change input[type=file]': function (e,t) {
		const input = e.currentTarget
		if (input.files && input.files.length) {
			input.disabled = true
			const fr = new FileReader()

			fr.onload = function () {
				const collection = window[input.name]
				if (collection instanceof Static.Collection) {
					collection.importStaticData(fr.result, (error, result) => {
						if (error) {
							Notify.error(error)
						} else {
							Notify.success('Importation des données ' + input.name + ' terminée.')
						}
					})
				}
				input.value = ""
				input.disabled = false
			}

			fr.readAsText(input.files[0])
		}
	},

	'submit form#inscriptionAdmin': (e, t) => {
		e.preventDefault()

		if (e.currentTarget.checkValidity()) {
			const trigramme = t.find('input[name=trigramme]').value.toUpperCase()
			const email = t.find('input[name=email]').value
			const l = Ladda.create(t.find('button.js-admin-subscribe'))
			l.start()

			adminSubscribeUser.call({ trigramme, email }, (err, res) => {
				if (err) {
					Notify.error(err)
				} else if (res.success) {
					Notify.success(`E-mail d'inscription envoyé à ${ email } !`)
				}
				t.find('input[name=trigramme]').value = ''
				t.find('input[name=email]').value = ''
				l.stop()
			})
		}
	}
})
