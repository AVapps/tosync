import { Template } from 'meteor/templating'
import './adminPNImport.html'

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
	}
})
