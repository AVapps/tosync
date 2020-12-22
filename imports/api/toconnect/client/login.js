import { Meteor } from 'meteor/meteor'
import { Accounts } from 'meteor/accounts-base'
import pify from 'pify'

const loginConnect = function (trigramme, pwd, callback) {
	return Accounts.callLoginMethod({
		methodArguments: [{ trigramme, pwd }],
		userCallback: callback
	})
}

const pifyLoginConnect = pify(loginConnect)

Meteor.loginWithTOConnect = function (trigramme, pwd, cb) {
	if (_.isFunction(cb)) {
		return loginConnect(trigramme, pwd, cb)
	} else {
		return pifyLoginConnect(trigramme, pwd)
	}
}