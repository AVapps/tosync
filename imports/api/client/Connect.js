import { Meteor } from 'meteor/meteor'
import { ReactiveVar } from 'meteor/reactive-var'
import { ReactiveDict } from 'meteor/reactive-dict'
import { DateTime } from 'luxon'
import { TOConnect } from '../toconnect/client/TOConnect.js'
import pify from 'pify'

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
    connected: false,
    changesPending: false,
    signNeeded: false,
    working: false,
    credentials: null,
    message: ''
  }),

	init() {
    this.debouncedLogin = _.debounce(this.login, 120000, { leading: true })

    window.addEventListener('offline', () => {
      this.state.set('online', false)
    }, false)

    window.addEventListener('online', () => {
      this.state.set('online', true)
    }, false)

    this.state.set('online', navigator.onLine)

    Config.onReady(() => {
      const lastSessionCheck = Config.get('lastSessionCheck')
      Tracker.autorun(() => {
        if (this.state.get('online')) {
          const now = +new Date()
          if (now - lastSessionCheck > (1000 * 60 * 2)) {
            this.checkSession(true)
          }
        } else {
          this.clearSession()
        }
      })
    })
		return this
	},

	async login(username, password, doneCb) {
		check(username, String)
		check(password, String)
    console.log('Connect.login')
		this.startTask('login')
    this.state.set('message', "Connexion...")
    let state, shouldRetry
    do {
      try {
        if (this._retryCount) {
          this.state.set('message', `${ this._retryCount + 1 }e tentative...`)
        }
        await pify(Meteor.loginConnect)(username, password)
        state = await this.checkSession(false)
        // console.log('Connect.login state', state)
        if (state && state.connected) {
          this.state.set('credentials',[ username, password ])
          this.state.set('username', username)
          this.resetBackoff()
        }
        if (_.isFunction(doneCb)) doneCb()
      } catch (error) {
        // console.log('Connect.login error', error)
        shouldRetry = await this.backoff(error)
        if (!shouldRetry) {
          this._handleError(error)
          if (_.isFunction(doneCb)) doneCb(error)
        }
      }
    } while (shouldRetry)
    this.state.set('message', "")
    this.endTask('login')
    return (state && _.has(state, 'connected')) ? state.connected : false
	},

	logout() {
		this.state.set('credentials', null)
		this.clearSession()
		return this
	},

  async backoff(error) {
    if (error && error.error == 503) {
      if (this._retryCount < 4) {
        this._retryCount++
        console.log('Connect.backoff', this._retryCount, this._backOffDelay)
        await wait(this._backOffDelay)
        this._backOffDelay *= 2
        return true
      } else {
        this.resetBackoff()
      }
    }
  },

  async autoBackoff() {
    if (this._backOffDelay) {
      await wait(this._backOffDelay)
      this._backOffDelay *= 2
    }
  },

  resetBackoff() {
    this._retryCount = 0
    this._backOffDelay = 2000
  },

	async validateChanges() {
    this.startTask('validateChanges')
    this.state.set('message', "Validation du planning...")
    let state
    try {
      state = await TOConnect.validateChanges()
    } catch (error) {
      this._handleError(error)
    }
    if (_.isObject(state) && _.has(state, 'connected')) {
      this.handleState(state)
		}
    this.state.set('message', "")
    this.endTask('validateChanges')
    return state
  },

  async signPlanning() {
    this.startTask('signPlanning')
    this.state.set('message', "Validation du planning...")
    let state
    try {
      state = await TOConnect.signPlanning()
    } catch (error) {
      this._handleError(error)
    }
    if (_.isObject(state) && _.has(state, 'connected')) {
      this.handleState(state)
		}
    this.state.set('message', "")
    this.endTask('signPlanning')
    return state
  },

	async getSyncData() {
		this.startTask('sync_data')
    this.state.set('message', "Synchronisation...")
    let data
    try {
      data = await TOConnect.fetchSyncData()
    } catch (error) {
      this._handleError(error)
    }
    this.state.set('message', "")
    this.endTask('sync_data')
    return data
	},

  async getPlanning(type) {
		this.startTask('sync_data')
    this.state.set('message', "Synchronisation...")
    let data
    try {
      data = await TOConnect.getPlanning(type)
    } catch (error) {
      this._handleError(error)
    }
    this.state.set('message', "")
    this.endTask('sync_data')
    return data
	},

	// Reactive datasource to check TO.Connect session state. true = online, false = offline
	authentificated() {
		return this.state.get('connected')
  },

  isOnline() {
    return this.state.get('online')
  },

  isWorking() {
		return this.state.get('working')
	},

  signNeeded() {
		return this.state.get('signNeeded')
	},

  changesPending() {
		return this.state.get('changesPending')
	},

	running() {
		return this.state.get('working')
	},

	startTask(task) {
		this._tasks[task] = true
		return this._updateWorkingState()
	},

	endTask(task) {
		if (_.has(this._tasks, task)) delete this._tasks[task]
		return this._updateWorkingState()
	},

	_updateWorkingState() {
		this.state.set('working', _.some(this._tasks))
	},

	startSession() {
    // console.log('Connect.startSession', this._timeoutHandle)
		this.clearSession()
		this._timeoutHandle = Meteor.setTimeout(() => {
      // console.log('Connect.startSession.Timeout', this._timeoutHandle)
			this._timeoutHandle = null
			this.checkSession()
		}, 300000)
		return this
	},

	clearSession() {
    // console.log('Connect.clearSession', this._timeoutHandle)
		if (this._timeoutHandle) {
      // console.log('Connect.clearSession.clearing', this._timeoutHandle)
			Meteor.clearTimeout(this._timeoutHandle)
			this._timeoutHandle = null
		}
		return this
	},

	async checkSession(retry) {
		this.startTask('check_session')
    // console.log('Connect.checkSession.start')
    let state, shouldRetry
    do {
      try {
        state = await pify(Meteor.call)('checkSession')
      } catch (error) {
        shouldRetry = await this.backoff(error)
        if (!shouldRetry) this._handleError(error, true)
      }
    } while (retry && shouldRetry)
    console.log('Connect.checkSession', state)
    if (_.isObject(state) && _.has(state, 'connected')) {
      this.handleState(state)
      Config.set('lastSessionCheck', +new Date())
    }
    this.endTask('check_session')
		return state
	},

  handleState(state) {
    this.state.set('connected', state.connected)
    if (state.connected) {
      this.state.set('changesPending', this.parsePendingChanges(state.changesPending))
      this.state.set('signNeeded', state.signNeeded)
      if (state.changesPending) {
        App.requestChangesValidation()
      } else if (state.signNeeded) {
        App.requestPlanningSign()
      }
      this.startSession()
    } else {
      this._resetSession()
      this.tryAutoReLogin()
    }
  },

  parsePendingChanges(changesPending) {
    if (!_.isString(changesPending)) return changesPending
    const m = changesPending.match(/<\!\[CDATA\[(<tr.+<\/tr>)\]\]/)
    if (m) {
      const rows = m[1]
      const data = _.sortBy(
        $(rows).map((i,el) => {
          const tds = $('td', el)
          return {
            html: el.outerHTML,
            date: (tds[2].innerText || tds[9].innerText).split('/').reverse().join('-') + ' ' + (tds[3].innerText || tds[10].innerText)
          }
        }).get(), 'date').map(r => r.html).join()
      return data
    }
    return true
  },

  setDisconnedState() {
    this.state.set('connected', false)
    this.state.set('changesPending', false)
    this.state.set('signNeeded', false)
  },

	_resetSession() {
    // console.log('Connect._resetSession()')
		this.setDisconnedState()
		this.clearSession()
		return this
	},

  async tryAutoReLogin() {
    console.log('Connect.tryAutoReLogin')
    const credentials = this.state.get('credentials')
		if (_.isArray(credentials)) {
      return this.debouncedLogin.apply(this, credentials)
    }
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
	return Connect.authentificated()
})

Template.registerHelper('ConnectRunning', function () {
	return Connect.isWorking()
})

Template.registerHelper('disabledOnConnectRunning', function () {
	return Connect.isWorking() ? 'disabled' : '';
})
