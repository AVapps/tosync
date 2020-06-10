import { Template } from 'meteor/templating'
import './sol.html'

Template.solDescriptionText.helpers({
  jourSol(date) {
    return Controller.Remu.findJourSol(date.format('YYYY-MM-DD'))
  },

  isPNT() {
    return Controller.isPNT()
  },

  content() {
    return this.description.replace(/\\n/g, "\n")
  }
})
