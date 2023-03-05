import { Template } from 'meteor/templating'
import './remu.html'

Template.remu.onCreated(function () {

})

Template.remu.onRendered(function () {

})

Template.remu.helpers({
	isPNT() {
		return Controller.isPNT()
	},

	onReparseClick() {
		return async (doneCb) => {
			try {
				await Controller.reparseEventsOfCurrentMonth()
				Notify.success('Votre planning a été recalculé.')
			} catch (e) {
				Notify.error(e)
			} finally {
				doneCb()
			}
		}
	},

	onRefreshClick() {
		return async (doneCb) => {
			try {
				const isPNT = await Controller.checkIsPNT()
				if (isPNT) {
					await Controller.loadPayscale()
				}
				Notify.success('Actualisation terminée.')
			} catch (e) {
				Notify.error(e)
			} finally {
				doneCb()
			}
		}
	}
})

Template.remu.events({
	'click button.ep4': function (e, t) {
		e.preventDefault()

		// if (App.support.isSafari && !App.support.isMobile) {
		// 	alert("Si le fichier s'ouvre dans une fenêtre pressez les touches [CMD] + [S] pour l'enregistrer. Pour une meilleure compatibilité utilisez Firefox ou Chrome !")
		// }
		//
		// App.exportExcel()
	}
})
