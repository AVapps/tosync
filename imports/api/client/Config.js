import moment from 'moment';

Config = {
	_collection: null,
	_collectionReady: new ReactiveVar(false),
	_ready: new ReactiveVar(false),

	_defaults: {
		calendarMode: 'table',
		googleCalendarIds: {},
		currentMonth: {
			month: moment().month(),
			year: moment().year()
		},
		Hcsr: 5.20
	},

	calendarTags: ['rotation', 'vol', 'sol', 'instruction', 'repos', 'conges', 'maladie', 'greve'],

	init: function () {
		this._collection = new Ground.Collection('config', {
			connection: null,
			transform: (doc) => {
				if (!_.has(doc, 'googleCalendarIds')) return doc;
				let ids = {};
				_.forEach(doc.googleCalendarIds, (list, calendarId) => {
					ids[this._unescapeDots(calendarId)] = list;
				});
				doc.googleCalendarIds = ids;
				return doc;
			}
		});
		this._collection.on('loaded', () => {
			this._collectionReady.set(true);
		});

		const self = this;
		Tracker.autorun(function (c) {
			self._ready.set(false);
			if (self._collectionReady.get() && Meteor.userId()) {
				const userId = Meteor.userId();
				const config = self._collection.findOne({userId}, {reactive: false});

				if (!config) {
					self._collection.insert(_.defaults({userId}, self._defaults));
				}

				if (config && config.googleCalendarIds && _.some(config.googleCalendarIds, (list, key) => _.contains(self.calendarTags, key))) {
					self._collection.update({userId}, {
						$unset: {
							'googleCalendarIds.rotations': "",
							'googleCalendarIds.vols': "",
							'googleCalendarIds.sol': "",
							'googleCalendarIds.repos': "",
							'googleCalendarIds.conges': "",
						}
					});
				}

				self._ready.set(true);
			}
		});
	},

	ready: function () {
		return this._ready.get();
	},

	get: function (field) {
		if (field) {
			this._checkField(field);
			const config = this._collection.findOne(this._selector(), { fields: { [field]: 1 }});
			return this.ready() ? config && config[field] : this._defaults[field];
		} else {
			return this.ready() ? this._collection.findOne(this._selector()) : this._defaults;
		}
	},

	set: function (field, value) {
		this._checkField(field);
		Tracker.autorun( c => {
			if (this.ready()) {
				this._collection.update({ userId: Meteor.userId() }, {
					$set: {
						[field]: value
					}
				});
				c.stop();
			}
		});
		return this;
	},

	addTagToCalendarId: function (calendarId, tag) {
		check(calendarId, String);
		if (!_.contains(this.calendarTags, tag)) throw Meteor.Error("Invalid Tag");
		return this._collection.update(this._selector(), {
			$addToSet: {
				['googleCalendarIds.' + this._escapeDots(calendarId)]: tag
			}
		});
	},

	removeTagFromCalendarId: function (calendarId, tag) {
		check(calendarId, String);
		if (!_.contains(this.calendarTags, tag)) throw Meteor.Error("Invalid Tag");
		return this._collection.update(this._selector(), {
			$pull: {
				['googleCalendarIds.' + this._escapeDots(calendarId)]: tag
			}
		});
	},

	resetCalendarIds: function() {
		return this._collection.update(this._selector(), {
			'$set': _.pick(this._defaults, 'googleCalendarIds')
		});
	},

	defaults: function () {
		return this._defaults;
	},

	_checkField: function (field) {
		check(field, String);
		if (!_.has(this._defaults, field)) throw new Meteor.Error('Unknown Config field', "Please provide à supported field !");
	},

	_selector: function () {
		return {
			userId: Meteor.userId()
		};
	},

	_escapeDots: function (str) {
		return str.replace(/\./g, "\uff0E");
	},

	_unescapeDots: function (str) {
		return str.replace(new RegExp("\uff0E", 'g'), '.');
	}
}
