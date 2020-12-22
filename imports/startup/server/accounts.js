import { Meteor } from 'meteor/meteor'
import { Accounts } from 'meteor/accounts-base'
import TOConnectLoginHandler from '../../api/toconnect/server/TOConnectLoginHandler.js'

Accounts.registerLoginHandler('TOConnect', TOConnectLoginHandler)

// Paramètres e-mail compte avec mot de passe
Accounts.urls.enrollAccount = (token) => {
  return Meteor.absoluteUrl(`inscription/${token}`)
}

Accounts.urls.resetPassword = (token) => {
  return Meteor.absoluteUrl(`reinit-mdp/${token}`)
}

Accounts.urls.verifyEmail = (token) => {
  return Meteor.absoluteUrl(`verif-email/${token}`)
}

Accounts.emailTemplates.siteName = 'TO.sync'
Accounts.emailTemplates.from = 'TO.sync <nepasrepondre@tosync.avapps.fr>'

Accounts.emailTemplates.enrollAccount = {
  subject(user) {
    return `Bienvenue sur TO.sync ${ user.profile.prenom } !`
  },
  text(user, url) {
    return `Bonjour ${user.profile.prenom },

Pour activer ou récupérer votre compte il vous suffit de cliquer sur le lien ci-dessous puis de créer un mot de passe spécifique TO.sync :

${ url }

Si vous n'avez pas effectué de demande d'inscription ou de récupération de compte sur ${ Meteor.absoluteUrl() }, veuillez ignorer ce message.

À bientôt sur TO.sync,
AdrienV`
  }
}

Accounts.emailTemplates.resetPassword = {
  subject() {
    return 'TO.sync - Réinitialisation de mot de passe'
  },
  text(user, url) {
    return `Bonjour ${user.profile.prenom},

Pour réinitialiser votre mot de passe il vous suffit de cliquer sur le lien ci-dessous puis d'en créer un nouveau :

${url}

Si vous n'avez pas effectué de demande de réinitialisation de mot de passe sur ${ Meteor.absoluteUrl() }, veuillez ignorer ce message.

À bientôt sur TO.sync,
AdrienV`
  }
}

Accounts.emailTemplates.verifyEmail = {
  subject() {
    return "Activez votre compte TO.sync dès maintenant !"
  },
  text(user, url) {
    return `Bonjour ${user.profile.prenom},

Pour activer votre compte TO.sync il vous suffit de cliquer sur le lien ci-dessous :

${url}

Si vous n'avez pas effectué de demande d'inscription sur ${ Meteor.absoluteUrl() }, veuillez ignorer ce message.

À bientôt sur TO.sync,
AdrienV`
  }
}
