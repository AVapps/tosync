import { Meteor } from 'meteor/meteor'
import _ from 'lodash'
import TOConnect from './lib/TOConnect.js'

function wrapPromiseFunction(func, context) {
  return Meteor.wrapAsync(function (...args) {
    const cb = args.pop()
    func.apply(context, args)
      .then(
        result => {
          cb(undefined, result)
        },
        reason => {
          cb(reason)
        }
      )
  }, context)
}

export default class TOConnectManager {
  constructor(userId) {
    this._userId = userId || null
    let session = ""
  	if (userId) {
      const user = Meteor.users.findOne(userId, {fields: {'services.toconnect.session': 1}})
      if (user && _.has(user, 'services.toconnect.session')) {
        session = _.get(user, 'services.toconnect.session')
      }
    }
  	// console.log('TOConnectManager.init', session)
    this.toconnect = new TOConnect(session)

    this.loginSync = wrapPromiseFunction(this.login, this)
    this.getUserDataSync = wrapPromiseFunction(this.getUserData, this)
  }

  setUserId(userId) {
		if (this._userId === null) {
			this._userId = userId
		} else {
			throw new Meteor.Error(500, "Erreur !", "Il est interdit de tranférer une session à un autre utilisateur !")
		}
	}

  getSession() {
    // console.log(this.toconnect.getSession(), this.toconnect.cookieJar.serializeSync())
    return this.toconnect.getSession()
  }

  saveSession() {
    const session = this.getSession()
    // console.log('TOConnectManager.saveSession', this._userId, session, this.toconnect.cookieJar.serializeSync())
    if (this._userId && session) {
      return Meteor.users.update(this._userId, {
        '$set': {
          'services.toconnect.session': session
        }
      })
    }
  }

  revokeSession() {
		this.toconnect.revokeSession()
    return Meteor.users.update(this._userId, {
      '$set': {
        'services.toconnect.session': ''
      }
    })
	}

  async login(login, password) {
		const resp = await this.toconnect.login(login, password)
    this.saveSession()
    return resp
	}

	async checkSession() {
		const resp = await this.toconnect.checkSession()
    this.saveSession()
    return resp
	}

	async getUserData() {
		const resp = await this.toconnect.getUserData()
    this.saveSession()
    return resp
	}

	async getPlanning() {
		const resp = await this.toconnect.getPlanning()
    this.saveSession()
    return resp
	}

  async validateChanges() {
		const resp = await this.toconnect.validateChanges()
    this.saveSession()
    return resp
	}

  async signPlanning() {
		const resp = await this.toconnect.signPlanning()
    this.saveSession()
    return resp
	}

	async getActivitePN(debut, fin) {
		const resp = await this.toconnect.getActivitePN(debut, fin)
    this.saveSession()
    return resp
	}
}
