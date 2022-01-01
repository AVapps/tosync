import { Meteor } from 'meteor/meteor'
import { ReactiveVar } from 'meteor/reactive-var'
import { ReactiveDict } from 'meteor/reactive-dict'
import { DateTime } from 'luxon'

const CONNECT_STATE_KEY = "CONNECT_STATE"

function wait(ms) {
  return new Promise((resolve, reject) => {
    Meteor.setTimeout(resolve, ms)
  })
}

Connect = {
  _timeoutHandle: null,
  _retryCount: 0,
  _backOffDelay: 2000,
	_tasks: {},
  state: new ReactiveDict(CONNECT_STATE_KEY, {
    username: null,
    online: false,
    message: ''
  }),

	init() {
    window.addEventListener('offline', () => {
      this.state.set('online', false)
    }, false)

    window.addEventListener('online', () => {
      this.state.set('online', true)
    }, false)

    this.state.set('online', navigator.onLine)
		return this
	},

	// Reactive datasource to check TO.Connect session state. true = online, false = offline
  isOnline() {
    return this.state.get('online')
  },

	running() {
		return this.state.get('working')
	},

	_handleError(error, silent) {
    console.log('Connect._handleError', error)
		if (error && _.has(error, 'error')) {
      switch (error.error) {
        case 401:
          this._resetSession()
          this.tryAutoReLogin()
          if (!silent) Notify.error(error)
          break;
        case 503:
          if (!silent) Notify.warn("connect.fr.transavia.com ne répond pas, merci de patienter quelques instants avant d'essayer de vous connecter à nouveau !")
          break;
        default:
          if (!silent) Notify.error(error)
      }
		} else {
      if (!silent) Notify.error(error)
    }
		return this
	}
}

Template.registerHelper('ConnectOnline', function () {
	return Connect.isOnline()
})

Template.registerHelper('ConnectRunning', function () {
	return Connect.running()
})

Template.registerHelper('disabledOnConnectRunning', function () {
	return Connect.running() ? 'disabled' : '';
})
