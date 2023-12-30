import { Meteor } from 'meteor/meteor'
import { OAuthEncryption } from 'meteor/oauth-encryption'
import { Accounts } from 'meteor/accounts-base'

Accounts.config({
  restrictCreationByEmailDomain: 'fr.transavia.com',
  forbidClientAccountCreation: true,
  sendVerificationEmail: true
})

Accounts.beforeExternalLogin((type, data, user) => {
  if (user) {
    // L'utilisateur existe déjà, il s'agit d'un simple login
    return true
  } else {
    // Il s'agit d'une première tentive de connexion
    const userId = Meteor.userId()
    if (userId && type === 'google' && data.email && data.id) {
      // Vérifie si le compte google n'est pas déjà utilisé par un autre compte utilisateur TO.sync
      const googleUser = Meteor.users.findOne({ 'services.google.id': data.id }, { fields: { _id: 1 } })
      if (googleUser) {
        throw new Meteor.Error('tosync.googleAccountAlreadyUsed', `Un autre compte TO.sync utilise déjà ce compte google pour s'authentifier !`)
      }

      // Ajoute les serviceData à l'utilisateur
      const setAttrs = {}
      Object.keys(data).forEach(key => {
        let value = data[ key ]
        if (OAuthEncryption && OAuthEncryption.isSealed(value)) {
          value = OAuthEncryption.seal(OAuthEncryption.open(value), userId)
        }
        setAttrs[ `services.google.${key}` ] = value
      })
      Meteor.users.update(userId, { $set: setAttrs })

      Accounts.addEmail(userId, data.email, !!data.verified_email)
      console.log(`-> Google OAuth credentials for ${data.email} added to user ${userId}.`)
      throw new Meteor.Error('tosync.googleServiceAdded', data.email)
    }
    return true
  }
})

ServiceConfiguration.configurations.upsert({
  service: "google"
}, {
  $set: {
    clientId: Meteor.settings.google.clientId,
    loginStyle: "popup",
    secret: Meteor.settings.google.secret
  }
});

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
    return `Bienvenue sur TO.sync !`
  },
  text(user, url) {
    return `Bonjour ${user.profile.prenom},

Pour poursuivre votre inscription ou votre récupération de compte il vous suffit de cliquer sur le lien ci-dessous puis de créer un nouveau mot de passe spécifique TO.sync :

${url}

Si vous n'êtes pas à l'origne de cette demande, veuillez ignorer ce message.

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

Pour réinitialiser votre mot de passe il vous suffit de cliquer sur le lien ci-dessous puis d'en choisir un nouveau :

${url}

Si vous n'avez pas effectué de demande de réinitialisation de mot de passe sur ${Meteor.absoluteUrl()}, veuillez ignorer ce message.

À bientôt sur TO.sync,
AdrienV`
  }
}

Accounts.emailTemplates.verifyEmail = {
  subject() {
    return "Confirmez votre adresse enregistrée sur TO.sync dès maintenant !"
  },
  text(user, url) {
    return `Bonjour ${user.profile.prenom},

Pour confirmer votre adresse électronique il vous suffit de cliquer sur le lien ci-dessous :

${url}

Si vous n'êtes pas à l'origne de cette demande, veuillez ignorer ce message.

À bientôt sur TO.sync,
AdrienV`
  }
}
