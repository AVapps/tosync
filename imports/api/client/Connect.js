import { TOConnect } from '../toconnect/client/TOConnect.js';

Connect = {

	CONNECT_STATE_KEY: "CONNECT_STATE",
	CONNECT_RUNNING_KEY: "CONNECT_RUNNING",

	_timeoutHandle: null,
	_credentials: null,
	_tasks: {},

	init: function () {
		Session.setDefault(this.CONNECT_RUNNING_KEY, false);
		
		var currentState = Session.get(this.CONNECT_STATE_KEY);
		Session.setDefault(this.CONNECT_STATE_KEY, false);

		this.checkSession();
		return this;
	},

	login: function (username, password, doneCb) {
		check(username, String);
		check(password, String);
		var self = this;
		this.startTask('login');
		Meteor.loginConnect(username, password, function (error) {
			if (error) {
				self._handleError(error);
				App.error(error);
				if (_.isFunction(doneCb)) doneCb(error);
			} else {
				self._credentials = [username, password];
				Session.set('username', username);
				Session.set(self.CONNECT_STATE_KEY, true);
				self.startSession();
				if (_.isFunction(doneCb)) doneCb();
			}
			self.endTask('login');
		});
		return this;
	},

	logout: function () {
		this._credentials = null;
		this.clearSession();
		return this;
	},

	// getPlanning: function (success) {
	// 	check(success, Function);
	// 	this.startTask('planning');
	// 	var self = this;
	// 	Meteor.call('getPlanning', function (error, result) {
	// 		if (error) {
	// 			self._handleError(error);
	// 			App.error(error);
	// 		} else {
	// 			self.startSession();
	// 			if (result) {
	// 				success(result);
	// 			}
	// 		}
	// 		self.endTask('planning');
	// 	});
	// 	return this;
	// },

	getSyncData: function (success) {
		check(success, Function);
		this.startTask('sync_data');
		
		TOConnect.fetchSyncData((error, data) => {
			if (error) {
				this._handleError(error);
				App.error(error);
			} else {
				this.startSession();
				if (data) {
					success(data);
				}
			}
			this.endTask('sync_data');
		});
		return this;
	},

	// Reactive datasource to check TO.Connect session state. true = online, false = offline
	authentificated: function () {
		return Session.get(this.CONNECT_STATE_KEY);
	},

	running: function () {
		return Session.get(this.CONNECT_RUNNING_KEY);
	},

	startTask: function (task) {
		this._tasks[task] = true;
		return this._updateRunning();
	},

	endTask: function (task) {
		if (_.has(this._tasks, task)) delete this._tasks[task];
		return this._updateRunning();
	},

	_updateRunning: function () {
		var before = this.running(),
			now = _.some(this._tasks);
		if (before !== now) Session.set(this.CONNECT_RUNNING_KEY, now);
		return this;
	},

	startSession: function () {
		this.clearSession();
		var self = this;
		this._timeoutHandle = Meteor.setTimeout(function () {
			self._timeoutHandle = null;
			self.checkSession();
		}, 600000);
		return this;
	},

	clearSession: function () {
		if (this._timeoutHandle) {
			Meteor.clearTimeout(this._timeoutHandle);
			this._timeoutHandle = null;
		}
		return this;
	},

	checkSession: function () {
		var self = this;
		this.startTask('check_session');
		Meteor.call('checkSession', function (error, result) {
			console.log('*** checkSession ***', error, result);
			if (!error && result) {
				Session.set(self.CONNECT_STATE_KEY, true);
				self.startSession();
			} else {
				self._resartSession();
			}
			self.endTask('check_session');
		});
		return this;
	},

	_resartSession: function () {
		Session.set(this.CONNECT_STATE_KEY, false);
		this.clearSession();
		if (this._credentials) this.login.apply(this, this._credentials);
		return this;
	},

	_handleError: function (error) {
		if (error && error.error == 401) {
			this._resartSession();
		}
		return this;
	}
};

Template.registerHelper('ConnectOnline', function () {
	return Connect.authentificated();
});

Template.registerHelper('ConnectRunning', function () {
	return Connect.running();
});

Template.registerHelper('disabledOnConnectRunning', function () {
	return Connect.running() ? 'disabled' : '';
});