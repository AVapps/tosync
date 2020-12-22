import { takeRight } from 'lodash'
import { ValidatedMethod } from 'meteor/mdg:validated-method'
import SimpleSchema from 'simpl-schema'
import { Accounts } from 'meteor/accounts-base'

export const subscribeUser = new ValidatedMethod({
  name: 'tosync.subscribeUser',
  validate: new SimpleSchema({
    trigramme: { type: String, regEx: /^[A-z]{3}$/ },
    email: { type: String, regEx: /^[a-z._\-]+@fr.transavia.com$/ }
  }).validator(),
  run({ trigramme, email }) {
    const pn = PN.findOne({ trigramme, email })
    if (pn) {
      if (this.isSimulation) {
        console.log(pn)
        return { success: true }
      }

      const user = Accounts.findUserByUsername(trigramme, { _id: 1 })

      if (user) {
        Accounts.addEmail(user._id, pn.email, false)
        Accounts.sendEnrollmentEmail(user._id, pn.email)
      } else {
        const userId = Accounts.createUser({
          username: pn.trigramme,
          email: pn.email,
          profile: {
            email: pn.email,
            fonction: pn.fonction,
            nom: pn.nom,
            prenom: pn.prenom,
            name: [ pn.prenom, pn.nom ].join(' ')
          }
        })
        Accounts.sendEnrollmentEmail(userId, pn.email)
      }
      return { success: true }
    } else {
      throw new Meteor.Error('pn-inconnu', "Aucun couple « trigramme / adresse électronique » correspondant n'a été trouvé !")
    }
  }
})