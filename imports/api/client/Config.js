import _ from 'lodash'
import { Ground } from 'meteor/adrienv:grounddb'
import Utils from './lib/Utils.js'
import Export from './lib/Export.js'
import { DateTime } from 'luxon'

const NOW = DateTime.local()

Config = {
	_collection: null,
	_collectionReady: new ReactiveVar(false),
	_ready: new ReactiveVar(false),
  _onReadyListeners: [],

	_defaults: {
		calendarMode: 'table',
		googleCalendarIds: {},
    iCalendarTags: ['rotation', 'vol', 'sol', 'instruction', 'repos', 'conges'],
    eventsColors: {
      'vol': undefined,
      'rotation': undefined,
      'repos': undefined,
      'conges': undefined,
      'sol': undefined,
      'instruction': undefined,
      'sanssolde': undefined,
      'maladie': undefined,
      'blanc': undefined
    },
    exportOptions: {
      airport: true,
      hdv: true,
      equipage: true,
      remu: true,
      remuA: true,
      remuB: true
    },
		currentMonth: {
			month: NOW.month,
			year: NOW.year
		},
		Hcsr: 5.20,
    eHS: 'B',
    useCREWMobileFormat: false,
    base: 'ORY',
    profil: {
      anciennete: 0,
      echelon: 1,
      fonction: 'OPL',
      categorie: 'A',
      grille: 'OPLA',
      atpl: false,
      classe: 5
    },
    firstUse: 0,
    lastSessionCheck: 0
	},

	init() {
		this._collection = new Ground.Collection('config')
		this._collection.once('loaded', () => {
			this._collectionReady.set(true)
		})

		Tracker.autorun((c) => {
			this._ready.set(false)
			if (this._collectionReady.get() && Meteor.userId()) {
				const userId = Meteor.userId()
				const config = this._collection.findOne({ userId }, { reactive: false })

				if (!config) {
					this._collection.insert(_.defaults({ userId }, this._defaults))
				} else {
          if (config.googleCalendarIds && _.some(config.googleCalendarIds, (list, key) => _.includes(Utils.tags, key))) {
            this.resetCalendarIds()
          }

          _.forEach(['iCalendarTags', 'eventsColors', 'exportOptions'], option => {
            if (!_.has(config, option)) {
              this._collection.update(config._id, {
                $set: {
                  [option]: _.get(this._defaults, option)
                }
              })
            }
          })
				}

				this._ready.set(true)
        c.stop()

        Meteor.defer(() => {
          _.forEach(this._onReadyListeners, fn => {
            Tracker.nonreactive(() => {
              fn.call(this, this)
            })
          })
        })
			}
		})
	},

  onReady(fn) {
    if (_.isFunction(fn)) {
      if (Tracker.nonreactive(() => this.ready())) {
        fn.call(this, this)
      } else {
        this._onReadyListeners.push(fn)
      }
    }
  },

	ready() {
		return this._ready.get()
	},

  defaults(field) {
    if (field) {
			this._checkField(field)
      return _.get(this._defaults, field)
		} else {
			return this._defaults
		}
  },

	get(field) {
		if (field) {
			this._checkField(field)
			const config = this._collection.findOne(this._selector(), { fields: { [field]: 1 }})
      if (this.ready() && _.has(config, field)) {
        return _.get(config, field)
      } else {
        return _.get(this._defaults, field)
      }
		} else {
			return this.ready() ? this._collection.findOne(this._selector()) : this._defaults
		}
	},

	set(field, value) {
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

	addTagToCalendarId(calendarId, tag) {
		check(calendarId, String)
		if (!_.includes(Export.getSyncCategories(), tag)) throw Meteor.Error("Invalid Tag");
		return this._collection.update(this._selector(), {
			$addToSet: {
				['googleCalendarIds.' + this._escapeDots(calendarId)]: tag
			}
		});
	},

	removeTagFromCalendarId(calendarId, tag) {
		check(calendarId, String)
		if (!_.includes(Export.getSyncCategories(), tag)) throw Meteor.Error("Invalid Tag");
		return this._collection.update(this._selector(), {
			$pull: {
				['googleCalendarIds.' + this._escapeDots(calendarId)]: tag
			}
		})
	},

  addTagToICalendar(tag) {
		check(tag, String)
		if (!_.includes(Export.getSyncCategories(), tag)) throw Meteor.Error("Invalid Tag");
		return this._collection.update(this._selector(), {
			$addToSet: {
				'iCalendarTags': tag
			}
		});
	},

	removeTagFromICalendar(tag) {
		check(tag, String)
		if (!_.includes(Export.getSyncCategories(), tag)) throw Meteor.Error("Invalid Tag");
		return this._collection.update(this._selector(), {
			$pull: {
				'iCalendarTags': tag
			}
		})
	},

  getCalendarTags() {
    return _.mapKeys(this.get('googleCalendarIds'), (val, key) => {
      return this._unescapeDots(key)
    })
  },

	resetCalendarIds() {
		return this._collection.update(this._selector(), {
			'$set': _.pick(this._defaults, 'googleCalendarIds')
		});
	},

	_checkField(field) {
		check(field, String)
		if (!_.has(this._defaults, field)) throw new Meteor.Error('Unknown Config field', "Please provide à supported field !")
	},

	_selector() {
		return { userId: Meteor.userId() }
	},

	_escapeDots(str) {
		return str.replace(/\./g, "\uff0E")
	},

	_unescapeDots(str) {
		return str.replace(/\uff0E/g, '.')
	}
}
