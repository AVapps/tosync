import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
import { Accounts } from 'meteor/accounts-base'

import '/imports/ui/layouts/main.js'
import '/imports/ui/pages/main.js'
import '/imports/ui/pages/inscription.js'
import '/imports/ui/pages/new-password.js'
import '/imports/ui/pages/reinit-mdp.js'




// FlowRouter.route('/', {
//   name: 'index',
//   action() {
//     this.render('main', 'mainPage')
//   }
// })

FlowRouter.route('/inscription', {
  name: 'inscription',
  action() {
    this.render('main', 'inscription')
  }
})

FlowRouter.route('/recuperation', {
  name: 'recuperation',
  action() {
    this.render('main', 'inscription', {
      recuperationMode: true
    })
  }
})

FlowRouter.route('/inscription/:token', {
  name: 'inscription.validation',
  action(params) {
    this.render('main', 'nouveauMdp', {
      ...params,
      title: `Inscription / Récupération de compte TO.sync`,
      subtitle: `Choisissez votre mot de passe spécifique TO.sync`
    })
  }
})

FlowRouter.route('/reinit-mdp', {
  name: 'reinit-mdp',
  action() {
    this.render('main', 'reinitialisationMdp')
  }
})

FlowRouter.route('/reinit-mdp/:token', {
  name: 'reinitialisation-mdp',
  action(params) {
    this.render('main', 'nouveauMdp', {
      ...params,
      title: `Réinitialisation de mot de passe`,
      subtitle: `Choisissez un nouveau mot de passe spécifique TO.sync`
    })
  }
})

FlowRouter.route('/verif-email/:token', {
  name: 'verif-email',
  action({ token }) {
    Accounts.verifyEmail(token, err => {
      if (err) {
        Notify.error(err)
      } else {
        Notify.success(`Votre adresse électronique a bien été confirmée !`)
      }
      FlowRouter.go('/')
    })
    this.render('main', 'mainPage')
  }
})

FlowRouter.route('/:month', {
  name: 'index',
  action() {
    this.render('main', 'mainPage')
  }
})

FlowRouter.route('*', {
  name: 'index',
  action() {
    this.render('main', 'mainPage')
  }
})
