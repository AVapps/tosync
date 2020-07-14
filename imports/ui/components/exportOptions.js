import { Template } from 'meteor/templating'
import './exportOptions.html'
import _ from 'lodash'

Template.exportOptions.onCreated(function () {

})

Template.exportOptions.onRendered(function () {

})

Template.exportOptions.onDestroyed(function () {

})

Template.exportOptions.helpers({
  options() {
    return _.keys(_.omit(Config.defaults('exportOptions'), Controller.isPNT() ? 'remu' : [ 'remuA', 'remuB' ]))
  },

  optionLabel(option) {
    switch (option) {
      case 'airport':
        return 'Aéroport'
      case 'hdv':
        return 'Heures de vol / MEP'
      case 'equipage':
        return 'Liste équipage'
      case 'remu':
        return 'Rémunération'
      case 'remuA':
        return 'Rémunération A'
      case 'remuB':
        return 'Rémunération B'
    }
  },

  optionChecked(option) {
    return Config.get(['exportOptions', option].join('.'))
  }
})

Template.exportOptions.events({
  'change input.js-eo-checkbox': (e,t) => {
    Config.set(['exportOptions', e.currentTarget.name].join('.'), e.currentTarget.checked)
  }

})
