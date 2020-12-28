import Noty from 'noty'
import 'noty/lib/noty.css'
import 'noty/lib/themes/sunset.css'

Noty.overrideDefaults({
	layout: 'top',
	theme: 'sunset',
	// closeWith: ['click', 'button'],
	// animation: {
	// 	open: 'animated fadeInRight',
	// 	close: 'animated fadeOutRight'
	// }
})

Notify = {
	success(title, msg) {
		return this.notify(title, msg, { type: 'success', timeout: 5000 })
	},

	error(err, msg) {
		console.log(err)
		if (!_.isString(err)) {
			if (err && err.message && err.details) {
				return this.notify(err.message, err.details, { type: 'error' })
			} else if (err && err.message) {
				return this.notify(err.message, undefined, { type: 'error' })
			} else if (_.isObject(err)) {
				for (let k in err) {
					if (_.isString(err[k])) {
						return this.notify(err[k], undefined, { type: 'error' })
					}
				}
			}
		} else {
			return this.notify(err, undefined, { type: 'error' })
		}
	},

	warn(title, msg) {
		return this.notify(title, msg, { type: 'warning', timeout: 10000 })
	},

	info(title, msg) {
		return this.notify(title, msg, {type: 'info', timeout: 10000 })
	},

	notify(title, msg, options) {
		options = options || {}
		if (title && msg) {
			options.text = `<p class="lead mb-0">${title }</p><p class="mb-0">${ msg }</p>`
		} else {
			options.text = title
		}

		return new Noty(options).show()
	}
}

_.extend(App, {
	success(title, msg) {
		return Notify.success(title, msg)
	},

	error(err, msg) {
		return Notify.error(err, msg)
	},

	warn(title, msg) {
		return Notify.warn(title, msg)
	},

	info(title, msg) {
		return Notify.info(title, msg)
	},

	notify: function(title, msg, options) {
		return Notify.notify(title, msg, options)
	}
})
