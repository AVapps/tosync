Notify = {
	success: function (title, msg) {
		this.notify(title, msg, {type: Notifications.TYPES.SUCCESS, timeout: 5000});
	},
	error: function (err, msg) {
		console.log(err);
		var title = 'Erreur !',
			msg = msg || '';
		if (!_.isString(err)) {
			if (err && err.message && err.details) {
				title = err.message;
				msg = err.details;
			} else if (err && err.message) {
				msg = err.message;
			} else if (_.isObject(err)) {
				for (var k in err) {
					if (_.isString(err[k])) {
						msg = err[k];
						break;
					}
				}
			}
		} else {
			msg = err;
		}
		this.notify(title, msg, {type: Notifications.TYPES.ERROR});
	},
	warn: function (title, msg) {
		this.notify(title, msg, {type: Notifications.TYPES.WARNING, timeout: 10000});
	},
	info: function (title, msg) {
		this.notify(title, msg, {type: Notifications.TYPES.INFO, timeout: 10000});
	},
	notify: function(title, msg, options) {
		options = options || {};
		Notifications.addNotification(title, msg, options);
	}
};

_.extend(App, {
	success: function (title, msg) {
		return Notify.success(title, msg);
	},

	error: function (err, msg) {
		return Notify.error(err, msg);
	},

	warn: function (title, msg) {
		return Notify.warn(title, msg);
	},

	info: function (title, msg) {
		return Notify.info(title, msg);
	},

	notify: function(title, msg, options) {
		return Notify.notify(title, msg, options);
	}
});
