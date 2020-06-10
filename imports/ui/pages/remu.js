import { Template } from 'meteor/templating'
import './remu.html'
import * as Ladda from 'ladda'

Template.remu.onCreated(function() {
	this.reparseButtonText = new ReactiveVar("Recalculer mon planning")
})

Template.remu.onRendered(function() {
	this.$reparseButton = this.$('button.reparse')
  this.ladda = Ladda.create(this.$reparseButton[0])

	this.reset = () => {
		this.reparseButtonText.set("Recalculer mon planning")
		this.$reparseButton.prop('disabled', false)
	}
})

Template.remu.helpers({
  isPNT() {
    return Controller.isPNT()
  },

	reparseButtonText() {
		return Template.instance().reparseButtonText.get()
	}
})

Template.remu.events({
	'click button.ep4': function (e,t) {
		e.preventDefault()

		// if (App.support.isSafari && !App.support.isMobile) {
		// 	alert("Si le fichier s'ouvre dans une fenêtre pressez les touches [CMD] + [S] pour l'enregistrer. Pour une meilleure compatibilité utilisez Firefox ou Chrome !")
		// }
    //
		// App.exportExcel()
	},

	'click button.reparse': function (e,t) {
		e.preventDefault()
		t.ladda.start()
		Controller.reparseEventsOfCurrentMonth((err, success) => {
			t.ladda.stop()
			t.$reparseButton.prop('disabled', true)
			t.reparseButtonText.set("Terminé")
		})
	},

	'hidden.bs.modal .modal': function (e,t) {
		t.reset()
  }
})
