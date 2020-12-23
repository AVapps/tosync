import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import '/imports/ui/layouts/main.js'
import '/imports/ui/pages/main.js'
import '/imports/ui/pages/inscription.js'
import '/imports/ui/pages/inscription-validation.js'

FlowRouter.route('/', {
  name: 'index',
  action() {
    this.render('main', 'mainPage')
  }
})

FlowRouter.route('/inscription', {
  name: 'inscription',
  action() {
    this.render('main', 'inscription')
  }
})

FlowRouter.route('/inscription/:token', {
  name: 'inscription.validation',
  action(params) {
    this.render('main', 'inscriptionValidation', params)
  }
})

FlowRouter.route('/reinit-mdp/:token', {
  name: 'inscription.validation',
  action(params) {
    console.log(params)
    this.render('main', 'reinit-mdp', params)
  }
})

FlowRouter.route('/verif-email/:token', {
  name: 'inscription.validation',
  action(params) {
    console.log(params)
    // this.render('main', 'inscription', params)
  }
})

FlowRouter.route('*', {
  name: 'index',
  action() {
    this.render('main', 'mainPage')
  }
})