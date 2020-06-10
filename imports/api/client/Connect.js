import { ReactiveVar } from 'meteor/reactive-var'
import { ReactiveDict } from 'meteor/reactive-dict'
import { DateTime } from 'luxon'
import { TOConnect } from '../toconnect/client/TOConnect.js'
import pify from 'pify'

const CONNECT_STATE_KEY = "CONNECT_STATE"

Connect = {
  _timeoutHandle: null,
	_tasks: {},
  state: new ReactiveDict(CONNECT_STATE_KEY, {
    username: null,
    connected: false,
    changesPending: false,
    signNeeded: false,
    working: false,
    credentials: null
  }),

	init() {
    this.debouncedLogin = _.debounce(this.login, 120000, { leading: true })
    Config.onReady(() => {
      const lastSessionCheck = Config.get('lastSessionCheck')
      const now = +new Date()
      if (now - lastSessionCheck > (1000 * 60 * 2)) {
        this.checkSession()
      }
    })
		return this
	},

	async login(username, password, doneCb) {
		check(username, String)
		check(password, String)
    // console.log('Connect.login')
		this.startTask('login')
    let state
    try {
      await pify(Meteor.loginConnect)(username, password)
      this.state.set('credentials',[ username, password ])
      this.state.set('username', username)
      state = await this.checkSession()
      if (_.isFunction(doneCb)) doneCb()

    } catch (error) {
      this._handleError(error)
      if (_.isFunction(doneCb)) doneCb(error)
    }
    this.endTask('login')
    return (state && _.has(state, 'connected')) ? state.connected : false
	},

	logout() {
		this.state.set('credentials', null)
		this.clearSession()
		return this
	},

	async validateChanges() {
    this.startTask('validateChanges')
    let state
    try {
      state = await TOConnect.validateChanges()
    } catch (error) {
      this._handleError(error)
    }
    if (_.isObject(state) && _.has(state, 'connected')) {
      this.handleState(state)
		}
    this.endTask('validateChanges')
    return state
  },

  async signPlanning() {
    this.startTask('signPlanning')
    let state
    try {
      state = await TOConnect.signPlanning()
    } catch (error) {
      this._handleError(error)
    }
    if (_.isObject(state) && _.has(state, 'connected')) {
      this.handleState(state)
		}
    this.endTask('signPlanning')
    return state
  },

	async getSyncData() {
		this.startTask('sync_data')
    let data
    try {
      data = await TOConnect.fetchSyncData()
    } catch (error) {
      this._handleError(error)
    }
    this.endTask('sync_data')
    return data
	},

	// Reactive datasource to check TO.Connect session state. true = online, false = offline
	authentificated() {
		return this.state.get('connected')
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

	async checkSession() {
		this.startTask('check_session')
    // console.log('Connect.checkSession.start')
    let state
    try {
      state = await pify(Meteor.call)('checkSession')
    } catch (error) {
      this._handleError(error)
    }
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
      this.state.set('changesPending', state.changesPending)
      this.state.set('signNeeded', state.signNeeded)
      if (state.changesPending) {
        App.requestChangesValidation()
      } else if (state.signNeeded) {
        App.requestPlanningSign()
      }
      this.startSession()
    } else {
      this._resetSession()
    }
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
    this.tryAutoReLogin()
		return this
	},

  async tryAutoReLogin() {
    console.log('Connect.tryAutoReLogin')
    const credentials = this.state.get('credentials')
		if (_.isArray(credentials)) {
      this.debouncedLogin.apply(this, credentials)
    }
  },

	_handleError(error) {
    console.log('Connect._handleError', error)
		if (error && _.has(error, 'error')) {
      switch (error.error) {
        case 401:
          this._resetSession()
          // Notify.error(error)
          break;
        case 503:
          Notify.error("TO.connect est (encore) injoignable !")
          break;
        default:
          Notify.error(error)
      }
		} else {
      Notify.error(error)
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
