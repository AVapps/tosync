import { Template } from 'meteor/templating'
import './remuTOTab.html'

Template.monthModalContentRemuTOTab.helpers({
  selectedScale(grille) {
    return grille == Config.get('profil.grille') ? 'selected' : ''
  },

  annee() {
    return Config.get('profil.anciennete')
  },

  eHSchecked() {
    return Config.get('eHS') === 'A'
  }
})

Template.monthModalContentRemuTOTab.events({
  'change #grille': function(e,t) {
    Config.set('profil.grille', e.currentTarget.value)
  },

  'change #annee': function(e,t) {
    Config.set('profil.anciennete', e.currentTarget.value)
  },

  'change #eHSconfigA': function (e,t) {
    if (e.currentTarget.checked) {
      Config.set('eHS', 'A')
    } else {
      Config.set('eHS', 'B')
    }
  }
})
