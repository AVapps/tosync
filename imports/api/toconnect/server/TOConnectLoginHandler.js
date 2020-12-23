import { Meteor } from 'meteor/meteor'
import TOConnectManager from './TOConnectManager.js'

export default function loginHandler(loginRequest) {
  //there are multiple login handlers in meteor.
  //a login request go through all these handlers to find it's login hander
  //so in our login handler, we only consider login requests which has trigramme field
  if(!loginRequest.trigramme) {
    return undefined
  }

  const connect = new TOConnectManager()

  if (connect.loginSync(loginRequest.trigramme, loginRequest.pwd)) {
    const user = Meteor.users.findOne({ username: loginRequest.trigramme })

    if(!user) {
      const userId = Meteor.users.insert({
        createdAt: +(new Date),
        username: loginRequest.trigramme,
        active: true,
        profile: connect.getUserDataSync(),
        services: {
          toconnect: {
            id: loginRequest.trigramme,
            session: connect.getSession()
          }
        }
      })
      // Update old events
      Events.update({ userId: loginRequest.trigramme }, {'$set': { userId }}, { multi: true })
      return { userId }
    } else {
      connect.setUserId(user._id)

      if (!user.active) {
        const profil = connect.getUserDataSync()
        Meteor.users.update(user._id, {
          '$set': {
            createdAt: +(new Date),
            active: true,
            profile: {
              nom: profil.nom || user.profile.nom,
              prenom: profil.prenom || user.profile.prenom,
              name: (profil.nom || user.profile.nom) + ' ' + (profil.prenom || user.profile.prenom),
              fonction: profil.fonction || user.profile.fonction,
              email: profil.email || user.profile.email,
            }
          }
        })
        // Update old events
        Events.update({ userId: loginRequest.trigramme }, {'$set': { userId: user._id }}, { multi: true })
      }

      if (!user.profile.nom) {
        const profil = connect.getUserDataSync()
        Meteor.users.update(user._id, {
          '$set': {
            'profile.nom': profil.nom
          }
        })
      }
      connect.saveSession()
      return { userId: user._id }
    }
  } else {
    throw new Meteor.Error(401, "Erreur d'authentification !")
  }
}
