import { Template } from 'meteor/templating'
import { ReactiveVar } from 'meteor/reactive-var'
import './moisPNT.html'

Template.monthModalContentPNT.onCreated(function() {
	this.activeTab = new ReactiveVar('activite')
})

Template.monthModalContentPNT.helpers({
  activeTab() {
    return Template.instance().activeTab.get()
  },

  activeTabTemplate() {
    switch (Template.instance().activeTab.get()) {
      case 'activite':
        return 'monthModalContentActiviteTab'
      case 'remuAF':
        return 'monthModalContentRemuAFTab'
      case 'remuTO':
        return 'monthModalContentRemuTOTab'
      case 'profil':
        return 'monthModalContentProfilTab'
    }
  },

	configHcsr() {
		return Config.get('Hcsr')
	},

  remuData() {
    return {
      salaire: Controller.salaire(),
      stats: Controller.statsRemu()
    }
  }

})

Template.monthModalContentPNT.events({
	'change input[name=hcsr]': function (e,t) {
		Config.set('Hcsr', e.currentTarget.value)
	},

  'click a.nav-link': function (e,t) {
    e.preventDefault()
    t.activeTab.set(t.$(e.currentTarget).data('target'))
  }
})

Template.monthModalContentTabLink.helpers({
  active() {
    return this.target == this.activeTab ? 'active' : ''
  }
})
