import { Meteor } from 'meteor/meteor'
import { Accounts } from 'meteor/accounts-base'
import pify from 'pify'

const loginConnect = function (trigramme, password, callback) {
	return Accounts.callLoginMethod({
		methodArguments: [{ trigramme, password }],
		userCallback: callback
	})
}

const pifyLoginConnect = pify(loginConnect)

Meteor.loginWithTOConnect = function (trigramme, password, cb) {
	if (_.isFunction(cb)) {
		return loginConnect(trigramme, password, cb)
	} else {
		return pifyLoginConnect(trigramme, password)
	}
}