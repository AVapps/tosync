import { Meteor } from 'meteor/meteor'
import { ValidatedMethod } from 'meteor/mdg:validated-method'
import SimpleSchema from 'simpl-schema'
import { Accounts } from 'meteor/accounts-base'
import { CallPromiseMixin } from 'meteor/didericis:callpromise-mixin'
import { DateTime } from 'luxon'
import _ from 'lodash'

function isPNT(userId) {
  const events = Events
    .find({
      userId,
      tag: 'vol'
    }, {
      limit: 30,
      sort: [ [ 'updated', 'desc' ] ],
      fields: { userId: 1, updated: 1, pnt: 1, pnc: 1 }
    })
    .fetch()

  const pnts = events.filter(evt => evt.pnt?.length).map(evt => evt.pnt)
  const pncs = events.filter(evt => evt.pnc?.length).map(evt => evt.pnc)

  // console.log('[isPNT]', userId, pnts, pnts.length, pncs, pncs.length)

  if (pnts.length < 3) return false

  const max = {
    pnt: _.chain(pnts).flatten().countBy().values().sortBy().last().value(),
    pnc: _.chain(pncs).flatten().countBy().values().sortBy().last().value(),
  }

  // console.log('[isPNT]', userId, max, pnts.length)

  return max.pnt > pnts.length / 2 && max.pnt > max.pnc ? true : false
}

function checkUserIsPNTWithCache() {
  const user = Meteor.user()
  if (_.has(user, 'isPNT.checkedAt') && DateTime.local().diff(DateTime.fromMillis(_.get(user, 'isPNT.checkedAt'))).as('days') <= 3) {
    return _.get(user, 'isPNT.value')
  }

  const _isPNT = isPNT(this.userId)
  Meteor.users.update(this.userId, {
    $set: {
      isPNT: {
        checkedAt: Date.now(),
        value: _isPNT
      }
    }
  })
  return _isPNT
}

export const isUserPNT = new ValidatedMethod({
  name: 'tosync.isUserPNT',
  mixins: [ CallPromiseMixin ],
  validate: null,
  run() {
    check(this.userId, Match.OneOf(String, Object))

    if (this.isSimulation) {
      return isPNT(this.userId)
    }

    return checkUserIsPNTWithCache()
  }
})

export const forceCheckUserIsPNT = new ValidatedMethod({
  name: 'tosync.forceCheckUserIsPNT',
  mixins: [ CallPromiseMixin ],
  validate: null,
  run() {
    check(this.userId, Match.OneOf(String, Object))

    const _isPNT = isPNT(this.userId)

    if (this.isSimulation) {
      return _isPNT
    }

    Meteor.users.update(this.userId, {
      $set: {
        isPNT: {
          checkedAt: Date.now(),
          value: _isPNT
        }
      }
    })
    return _isPNT
  }
})

export const getPayscale = new ValidatedMethod({
  name: 'tosync.getPayscale',
  mixins: [ CallPromiseMixin ],
  validate: null,
  run() {
    check(this.userId, Match.OneOf(String, Object))

    if (this.isSimulation) {
      if (window.localStorage) {
        return JSON.parse(localStorage.getItem('TOSYNC.baremePNT'))
      }
      return null
    }

    this.unblock()

    if (checkUserIsPNTWithCache()) {
      return {
        AF: Meteor.settings.remuAF,
        TO: Meteor.settings.remuTO
      }
    } else {
      return null
    }
  }
})

export const batchEventsRemove = new ValidatedMethod({
  name: 'tosync.Events.batchRemove',
  mixins: [ CallPromiseMixin ],
  validate: new SimpleSchema({
    ids: [ String ]
  }).validator(),
  run({ ids }) {
    if (!this.userId) {
      throw new Meteor.Error('tosync.notLoggedIn', 'Vous devez être connecté pour accéder à cette fonction.')
    }
    if (this.isSimulation) {
      return _.reduce(ids, (sum, _id) => {
        return sum + Events.remove(_id)
      }, 0)
    } else {
      return Events.remove({
        userId: this.userId,
        _id: { $in: ids }
      })
    }
  }
})

export const getEventsInterval = new ValidatedMethod({
  name: 'tosync.Events.getInterval',
  mixins: [ CallPromiseMixin ],
  validate: new SimpleSchema({
    start: { type: SimpleSchema.Integer },
    end: {
      type: SimpleSchema.Integer,
      optional: true,
      custom: function () {
        if (this.isSet && this.value < this.field('start').value) {
          return SimpleSchema.ErrorTypes.VALUE_NOT_ALLOWED
        }
      }
    }
  }).validator(),
  run({ start, end }) {
    if (!this.userId) {
      throw new Meteor.Error('tosync.getEvents.notLoggedIn', 'Vous devez être connecté pour accéder à cette fonction.')
    }

    const overlapStart = Events.findOne({
      tag: 'rotation',
      userId: this.userId,
      start: { $lt: start },
      end: { $gte: start }
    }, { sort: [ [ 'start', 'asc' ] ], fields: { start: 1, end: 1 } })

    const query = {
      userId: this.userId,
      end: { $gte: overlapStart ? overlapStart.start : start }
    }

    if (end) {
      const overlapEnd = Events.findOne({
        tag: 'rotation',
        userId: this.userId,
        start: { $lte: end },
        end: { $gt: end }
      }, { sort: [ [ 'end', 'desc' ] ], fields: { start: 1, end: 1 } })

      query.start = { $lte: overlapEnd ? overlapEnd.end : end }
    }

    return Events.find(query, {
      sort: [ [ 'start', 'asc' ], [ 'end', 'desc' ] ]
    }).fetch()
  }
})

export const subscribeUser = new ValidatedMethod({
  name: 'tosync.subscribeUser',
  validate: new SimpleSchema({
    email: { type: String, regEx: /^[a-z._\-]+@fr.transavia.com$/ }
  }).validator(),
  run({ email }) {
    if (this.isSimulation) return

    const pn = PN.findOne({ email })
    if (pn) {
      const user = Accounts.findUserByUsername(pn.trigramme, { _id: 1, emails: 1 })
      if (user) {
        console.log('tosync.subscribeUser', `Récupération du compte : ${email} - ${pn.trigramme} [${user._id}]`)
        if (!_.isArray(user.emails) || !_.find(user.emails, email => email.address == pn.email)) {
          Accounts.addEmail(user._id, pn.email, false)
        }
        Accounts.sendEnrollmentEmail(user._id, pn.email)
      } else {
        const userByEmail = Accounts.findUserByEmail(email, { _id: 1, emails: 1 })
        if (userByEmail) {
          console.log('tosync.subscribeUser', `Récupération du compte avec changement du username : ${email} - ${pn.trigramme} [${userByEmail._id}]`)
          Accounts.setUsername(userByEmail._id, pn.trigramme)
          Accounts.sendEnrollmentEmail(userByEmail._id, pn.email)
        } else {
          console.log('tosync.subscribeUser', `Création d'un nouveau compte pour : ${email} - ${pn.trigramme}`)
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
      }
      return { success: true }
    } else {
      const user = Accounts.findUserByEmail(email, { _id: 1, emails: 1 })
      if (user) {
        console.log('tosync.subscribeUser', `Un compte existe déjà pour l'adresse ${email}`)
        throw new Meteor.Error('tosync.subscribeUser.alreadySubscribed', 'Un compte existe déjà pour cette adresse email.')
      } else {
        console.log('tosync.subscribeUser', `Création d'un nouveau compte pour : ${email}`)
        const [ prenom, nom ] = email.split('@')[ 0 ].split('.')
        Accounts.createUserVerifyingEmail({
          username: email,
          email,
          profile: {
            email,
            name: [ capitalizeName(prenom), capitalizeName(nom) ].join(' '),
            nom: capitalizeName(nom),
            prenom: capitalizeName(prenom)
          }
        })
        return { success: true }
      }
    }
  }
})

function capitalizeName(name) {
  return name
    .split('-').map(_.capitalize).join('-')
}

function isAdmin(userId = Meteor.userId()) {
  if (userId) {
    const user = Meteor.users.findOne({ _id: userId }, { fields: { username: 1 } })
    return user && user.username && user.username === Meteor.settings.public.adminUser
  }
  return false
}

export const adminSubscribeUser = new ValidatedMethod({
  name: 'tosync.adminSubscribeUser',
  validate: new SimpleSchema({
    trigramme: { type: String, regEx: /^[A-z]{3}$/ },
    email: { type: String, regEx: SimpleSchema.RegEx.Email }
  }).validator(),
  run({ trigramme, email }) {
    if (!this.userId) {
      throw new Meteor.Error('tosync.adminSubscribeUser.notLoggedIn', 'Vous devez être connecté pour accéder à cette fonction.')
    }

    if (!isAdmin(this.userId)) {
      throw new Meteor.Error('tosync.adminSubscribeUser.notAdmin', "Vous n'êtes pas autorisé à accéder à cette fonction.")
    }

    if (!this.isSimulation) {
      const user = Accounts.findUserByUsername(trigramme, { _id: 1, emails: 1 })
      if (user) {
        if (!_.isArray(user.emails) || !_.find(user.emails, email => email.address == email)) {
          Accounts.addEmail(user._id, email, false)
        }
        Accounts.sendEnrollmentEmail(user._id, email)
      } else {
        const newUser = {
          username: trigramme,
          email: email,
          profile: {
            email: email
          }
        }
        const pn = PN.findOne({ email })
        if (pn) {
          _.assign(newUser.profile, {
            fonction: pn.fonction,
            nom: pn.nom,
            prenom: pn.prenom,
            name: [ pn.prenom, pn.nom ].join(' ')
          })
        }
        const userId = Accounts.createUser(newUser)
        Accounts.sendEnrollmentEmail(userId, email)
      }
    }

    return { success: true }
  }
})

export const subscribeLoggedUser = new ValidatedMethod({
  name: 'tosync.subscribeLoggedUser',
  validate: new SimpleSchema({
    email: { type: String, regEx: SimpleSchema.RegEx.Email }
  }).validator(),
  run({ email }) {
    if (!this.userId) {
      throw new Meteor.Error('tosync.subscribeLoggedUser.notLoggedIn', 'Vous devez être connecté pour accéder à cette fonction.')
    }

    if (!this.isSimulation) {
      const user = Accounts.user()
      if (user) {
        if (!_.isArray(user.emails) || !_.find(user.emails, em => em.address == email)) {
          Accounts.addEmail(this.userId, email, false)
        }
        Accounts.sendEnrollmentEmail(this.userId, email)
      } else {
        throw new Meteor.Error('user-not-found', `Compte utilisateur introuvable !`)
      }
    }
  }
})

export const disableGoogleAuth = new ValidatedMethod({
  name: 'tosync.disableGoogleAuth',
  validate: null,
  run() {
    if (!this.userId) {
      throw new Meteor.Error('tosync.disableGoogleAuth.notLoggedIn',
        'Vous devez être connecté pour accéder à cette fonction.')
    }

    if (!this.isSimulation && _.has(Meteor.user(), 'services.google')) {
      Meteor.users.update(this.userId, { $unset: { 'services.google': '' } })
    }
  }
})

export const addEmail = new ValidatedMethod({
  name: 'tosync.addEmail',
  validate: new SimpleSchema({
    email: { type: String, regEx: SimpleSchema.RegEx.Email }
  }).validator(),
  run({ email }) {
    if (!this.userId) {
      throw new Meteor.Error('tosync.addEmail.notLoggedIn', 'Vous devez être connecté pour accéder à cette fonction.')
    }

    const emails = _.get(Meteor.user(), 'emails')

    if (_.isArray(emails) && _.find(emails, { address: email })) {
      throw new Meteor.Error('tosync.addEmail.alreadyAdded', 'Cette adresse a déjà été ajoutée !')
    }

    if (emails.length >= 3) {
      throw new Meteor.Error('tosync.addEmail.upperLimitReached', `Le nombre d'adresses électroniques enregistrées est limité à 3.`)
    }

    if (!this.isSimulation) {
      Accounts.addEmail(this.userId, email, false)
      Accounts.sendVerificationEmail(this.userId, email)
    }
  }
})

export const verifyEmail = new ValidatedMethod({
  name: 'tosync.verifyEmail',
  validate: new SimpleSchema({
    email: { type: String, regEx: SimpleSchema.RegEx.Email }
  }).validator(),
  run({ email }) {
    if (!this.userId) {
      throw new Meteor.Error('tosync.verifyEmail.notLoggedIn', 'Vous devez être connecté pour accéder à cette fonction.')
    }

    const emails = _.get(Meteor.user(), 'emails')

    if (!_.isArray(emails) || !_.find(emails, { address: email })) {
      throw new Meteor.Error('tosync.verifyEmail.notFound', `Adresse introuvable !`)
    }

    if (!this.isSimulation) {
      Accounts.sendVerificationEmail(this.userId, email)
    }
  }
})

export const removeEmail = new ValidatedMethod({
  name: 'tosync.removeEmail',
  validate: new SimpleSchema({
    email: { type: String, regEx: SimpleSchema.RegEx.Email }
  }).validator(),
  run({ email }) {
    if (!this.userId) {
      throw new Meteor.Error('tosync.removeEmail.notLoggedIn', 'Vous devez être connecté pour accéder à cette fonction.')
    }

    const emails = _.get(Meteor.user(), 'emails')

    if (!_.isArray(emails) || !_.find(emails, { address: email })) {
      throw new Meteor.Error('tosync.removeEmail.notFound', `Adresse introuvable !`)
    }

    if (emails.length <= 1) {
      throw new Meteor.Error('tosync.removeEmail.lowerLimitReached', `Vous devez conserver au moins une adresse électronique de contact pour vous connecter !`)
    }

    if (!this.isSimulation) {
      Accounts.removeEmail(this.userId, email)
    }
  }
})