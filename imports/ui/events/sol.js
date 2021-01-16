import { Template } from 'meteor/templating'
import './sol.html'
import { DateTime } from 'luxon'

Template.solDescriptionText.helpers({
  jourSol(date) {
    return Controller.Remu.findJourSol(DateTime.fromMillis(date).toISODate())
  },

  isPNT() {
    return Controller.isPNT()
  },

  content() {
    return this.event.description
  }
})
