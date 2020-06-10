import { Template } from 'meteor/templating'
import { ReactiveVar } from 'meteor/reactive-var'
import { Tracker } from 'meteor/tracker'
import './remuAFTab.html'

Template.monthModalContentRemuAFTab.helpers({
  profil() {
    return Config.get('profil')
  },

  isCDB() {
    return Config.get('profil.fonction') == 'CDB'
  },

  eHSchecked() {
    return Config.get('eHS') === 'B'
  }
})

Template.monthModalContentRemuAFTab.events({
  'change #eHSconfigB': function (e,t) {
    if (e.currentTarget.checked) {
      Config.set('eHS', 'B')
    } else {
      Config.set('eHS', 'A')
    }
  }
})

function getCategories(echelon) {
  if (typeof echelon === 'string') echelon = parseInt(echelon)
  switch (echelon) {
    case 1:
      return ['A', 'B', 'C']
    case 2:
      return ['B', 'C']
    case 3:
    default:
      return ['C']
  }
}

Template.profilAFForm.onCreated(function() {
  this.categories = new ReactiveVar(getCategories(this.data.profil.echelon))
})

Template.profilAFForm.helpers({
  selectedFonction(fonction) {
    return fonction == this.profil.fonction ? 'selected' : ''
  },

  categories() {
    return Template.instance().categories.get()
  },

  categoriesDisabled() {
    return this.profil.echelon >= 3 ? 'disabled' : ''
  },

  selectedCategory(categorie) {
    return categorie == this.profil.categorie ? 'selected' : ''
  },

  atplChecked() {
    return (this.profil.atpl || this.profil.fonction == 'CDB') ? 'checked' : ''
  },

  atplDisabled() {
    return this.profil.fonction == 'CDB' ? 'disabled' : ''
  }
})

Template.profilAFForm.events({
  'change #fonction': function(e,t) {
    Config.set('profil.fonction', e.currentTarget.value)
  },

  'change #categorie': function(e,t) {
    Config.set('profil.categorie', e.currentTarget.value)
  },

  'change #echelon': function(e,t) {
    const echelon = e.currentTarget.value
    t.categories.set(getCategories(echelon))

    if (echelon >= 3 && t.data.categorie != 'C') Config.set('profil.categorie', 'C')
    if (echelon == 2 && t.data.categorie == 'A') Config.set('profil.categorie', 'B')

    Config.set('profil.echelon', echelon)
  },

  'change #classe': function(e,t) {
    Config.set('profil.classe', e.currentTarget.value)
  },

  'change #atpl': function(e,t) {
    Config.set('profil.atpl', e.currentTarget.checked)
  }
})
