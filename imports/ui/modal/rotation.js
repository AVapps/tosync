import { Template } from 'meteor/templating'
import './rotation.html'
import _ from 'lodash'

Template.rotationModalContent.onCreated(function() {
	this.activeTab = new ReactiveVar('main')
})

Template.rotationModalContent.helpers({
  activeTab() {
    return Template.instance().activeTab.get()
  },

  activeTabTemplate() {
    switch (Template.instance().activeTab.get()) {
      case 'main':
        return 'rotationModalMainTab'
      case 'remuA':
        return 'rotationModalRemuATab'
      case 'remuB':
        return 'rotationModalRemuBTab'
    }
  },

  isPNT() {
    return Controller.isPNT()
  }
})

Template.rotationModalContent.events({
  'click a.nav-link': function (e,t) {
    t.activeTab.set(t.$(e.currentTarget).data('target'))
  }
})

Template.rotationModalTabLink.helpers({
  active() {
    return this.target == this.activeTab ? 'active' : ''
  }
})
