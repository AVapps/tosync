import { Meteor } from 'meteor/meteor'
import { Tracker } from 'meteor/tracker'
import { ReactiveVar } from 'meteor/reactive-var'
import { Session } from 'meteor/session'

import Planning from './lib/Planning.js'
import RemuPNT from './lib/RemuPNT.js'
import RemuPNC from './lib/RemuPNC.js'

import { migrateEvents, needsMigration } from './lib/migrateEvents.js'

import _ from 'lodash'
import Swal from 'sweetalert2'
import PifyMeteor from './lib/PifyMeteor'
import { DateTime } from 'luxon'

window.DateTime = DateTime

const NOW = DateTime.local()
const isPNT = new ReactiveVar(false)

Session.setDefault('currentMonth', { year: NOW.year, month: NOW.month })

Controller = {
	eventsStart: DateTime.local(),
  eventsEnd: DateTime.local(),

  currentMonth: new ReactiveVar(Session.get('currentMonth'), _.isEqual),

	selectedDay: new ReactiveVar(null, _.isEqual),
	currentEventsCount: new ReactiveVar(0),

	Calendar: null,
  Planning: null,
	Remu: null,

  _stopPlanningCompute: false,
  _isLoading: new ReactiveVar(true),
  _bareme: null,
  _salaire: new ReactiveVar({ AF: {}, TO: {} }),
	_statsRemu: new ReactiveVar({ HC: 0.0, eHS: 0.0, tv: 0.0 }),

	init() {
    this.reparseEventsOfCurrentMonth = _.debounce(this._reparseEventsOfCurrentMonth, 3000, { leading: true, trailing: false })

    this.Calendar = Calendar
    this.Calendar.init()

    this.Calendar.onDayUpdated = (isoDate) => {
      const day = Tracker.nonreactive(() => this.selectedDay.get())
      if (day && day.slug === isoDate) {
        // Refresh day modal content
        console.log('REFRESH', isoDate)
        this.setSelectedDay(this.Calendar.days.findOne({ slug: isoDate }, { reactive: false }))
      }
    }

    this.EventsSubs = null

    // Autoruns
    this.currentMonthAutorun()
    this.isPNTAutorun()
    this.firstUseAutorun()

    Events.once('loaded', () => {
      const twoYearsAgo = NOW.startOf('month').minus({ years: 2 }).toMillis()
      Events.removeFromCacheBefore(twoYearsAgo)
      this.onEventsLoadedAutoruns()
    })
  },
  
  currentMonthAutorun() {
    Tracker.autorun(() => {
      // Construit le calendrier vide du mois
      const currentMonth = this.currentMonth.get()
      this.Calendar.buildCalendarDays(currentMonth)

      Events.stopSync()

      const cmonth = DateTime.fromObject(currentMonth)
      this.eventsStart = cmonth.minus({ month: 1 })
      this.eventsEnd = cmonth.endOf('month').plus({ month: 1 })

      console.time('Events.loaded & EventsSubs.ready')
      this.EventsSubs = Meteor.subscribe('cloud_events', this.eventsStart.toMillis(), this.eventsEnd.toMillis(), Meteor.userId())
    })
  },

  firstUseAutorun() {
    Tracker.autorun(c => {
      if (Meteor.userId()) {
        Config.onReady(async () => {
          const count = Config.get('firstUse')
          if (!count || count < 2) {
            const { firstUseDrive } = await import('/imports/api/client/lib/Driver.js')
            const newCount = firstUseDrive(count)
            Config.set('firstUse', newCount)
          }
        })
        c.stop()
      }
    })
  },

  isPNTAutorun() {
    Tracker.autorun(() => {
      if (Meteor.userId()) {
        if (window.localStorage) {
          const key = [ Meteor.userId(), 'isPNT' ].join('.')
          const cachedIsPNT = JSON.parse(localStorage.getItem(key))
          if (cachedIsPNT && _.has(cachedIsPNT, 'lastCheckAt')) {
            const lastCheckAt = DateTime.fromMillis(_.get(cachedIsPNT, 'lastCheckAt'))
            if (NOW.diff(lastCheckAt).as('days') < 10) {
              return isPNT.set(_.get(cachedIsPNT, 'value'))
            }
          }
        }

        console.time('Controller.isPNT')
        Meteor.call('isPNT', (e, r) => {
          if (!e && _.isBoolean(r)) {
            isPNT.set(r)
            console.log('Controller.isPNT', r)
            if (window.localStorage) {
              const key = [Meteor.userId(), 'isPNT'].join('.')
              localStorage.setItem(key, JSON.stringify({
                lastCheckAt: +new Date(),
                value: r
              }))
            }
          } else {
            isPNT.set(false)
          }
          console.timeEnd('Controller.isPNT')
        })
      } else {
        isPNT.set(false)
      }
    })
  },

  onEventsLoadedAutoruns() {
    Tracker.autorun(() => {
      // Rempli le calendrier avec les évènements du mois
      console.time('Controller.updateCalendarEventsObserver')
      const currentMonth = this.currentMonth.get()
      const userId = Meteor.userId()
      console.log(currentMonth, userId)
      Tracker.nonreactive(() => {
        const eventsCursor = Events.find({
          userId,
          end: { $gte: DateTime.fromObject(currentMonth).startOf('month').startOf('week').toMillis() },
          start: { $lte: DateTime.fromObject(currentMonth).endOf('month').endOf('week').toMillis() }
        }, { sort: [['start', 'asc'], ['end', 'desc']] })

        this.Calendar.observeEvents(eventsCursor)
        this.Calendar.addBlancs()
      })

      console.timeEnd('Controller.updateCalendarEventsObserver')
    })

    Tracker.autorun(() => {
      if (this.EventsSubs.ready()) {
        // Synchronise la base de données locale avec les données du serveur
        console.timeEnd('Events.loaded & EventsSubs.ready')
        Events.sync({
          userId: Meteor.userId(),
          end: { $gte: this.eventsStart.toMillis() },
          start: { $lte: this.eventsEnd.toMillis() }
        })
      }
    })

		Tracker.autorun(async () => {
      const currentMonth = this.currentMonth.get()
      const eventsCursor = Events.find({
        userId: Meteor.userId(),
        end: { $gte: DateTime.fromObject(currentMonth).startOf('month').startOf('week').toMillis() },
        start: { $lte: DateTime.fromObject(currentMonth).endOf('month').endOf('week').toMillis() }
      }, { sort: [['start', 'asc'], ['end', 'desc']] })
      const events = eventsCursor.fetch()

      this.currentEventsCount.set(events.length)

      console.log('Controller.eventsChanged', events)

      if (!this._stopPlanningCompute) {
        console.time('Controller.calculPlanning')
        this.Planning = new Planning(events, currentMonth)
        console.timeEnd('Controller.calculPlanning')

        Tracker.autorun(() => {
          const isPNT = this.isPNT()

          // console.log('Controller.isPNT changed or HV100 & HV100AF ready', isPNT)

          if (isPNT) {
            if (HV100AF.ready() && HV100.ready()) {
              this.Remu = new RemuPNT(this.Planning.groupedEvents(), currentMonth)
              this._statsRemu.set(this.Remu.stats)
              Tracker.autorun(() => {
                if (Config.ready()) {
                  const profil = Config.get('profil')
                  // console.log('Controller.profilChanged', profil)
                  if (_.has(this._bareme, 'AF') && _.has(this._bareme, 'TO')) {
                    this.calculSalaire(this.Remu.stats, profil)
                  } else {
                    Meteor.call('getPayscale', (e, r) => {
                      if (!e && _.has(r, 'AF') && _.has(r, 'TO')) {
                        this._bareme = r
                        this.calculSalaire(this.Remu.stats, profil)
                      }
                    })
                  }
                } else {
                  this._bareme = null
                }
              })
            }
          } else if (HV100.ready()) {
            this.Remu = new RemuPNC(this.Planning.groupedEventsThisMonth(), currentMonth)
            this._statsRemu.set(this.Remu.stats)
          }
        })
      }
		})
  },

  calculSalaire(statsRemu, profil) {
    if (this.Remu) {
      this._salaire.set({
        AF: this.Remu.calculSalaireAF(this._bareme, profil),
        TO: this.Remu.calculSalaireTO(this._bareme, profil)
      })
    }
  },

  salaire() {
    return this._salaire.get()
  },

  statsRemu() {
    return this._statsRemu.get()
  },

  isPNT() {
    return isPNT.get()
  },

  setIsPNT(_isPNT) {
    return isPNT.set(_isPNT)
  },

  loading() {
    return this._isLoading.get()
  },

	setSelectedDay(day) {
    if (day.tag && !day.allday) {
      if (day.tag === 'rotation') {
        day.events = _.map(day.events, evt => evt ? this.Remu.findEvent(evt): null)
        day.etapes = _.filter(day.events, evt => _.has(evt, 'tag') && (evt.tag === 'vol' || evt.tag === 'mep'))
        day.rotation = _.find(day.events, { tag: 'rotation' })
        if (day.rotation) {
          day.svs = _.filter(day.rotation.sv, sv => {
            return sv.tsStart.hasSame(day.date, 'day') || sv.tsEnd.hasSame(day.date, 'day')
          })
        } else {
          day.svs = {}
        }
      } else {
        const data = this.Remu.findJourSol(day.slug)
        _.extend(day, _.pick(data, 'HcsAF', 'PVAF', 'majoNuitPVAF', 'HcsTO', 'HcsiTO', 'HcsrTO', 'HcSimuInstTO'))
      }
    }
		this.selectedDay.set(day)
    console.log('Controller.setSelectedDay', day)
	},

	resetSelectedDay() {
		this.selectedDay.set(null)
  },
  
  forceSync() {
    Events.removeLocalOnlyFrom({
      userId: Meteor.userId(),
      end: { $gte: this.eventsStart.toMillis() },
      start: { $lte: this.eventsEnd.toMillis() }
    })
  },

  async _reparseEventsOfCurrentMonth() {
    this._stopPlanningCompute = true
    console.log('Controller._reparseEventsOfCurrentMonth')
    this.forceSync()
    try {
      const eventsOfMonth = await PifyMeteor.call('getAllEventsOfMonth', this.currentMonth.get())
      Sync.reparseEvents(eventsOfMonth)
    } catch (error) {
      console.log(error)
    } finally {
      this._stopPlanningCompute = false
    }
  },

  askForPlanningReparsing(message, cb) {
		Swal.fire({
		  title: 'Erreur de planning',
		  text: message,
		  icon: 'warning',
		  showCancelButton: true,
			// buttonsStyling: false,
			// confirmButtonClass: 'btn btn-primary',
			// cancelButtonClass: 'btn btn-danger',
		  confirmButtonColor: '#2800a0',
		  cancelButtonColor: '#ff3268',
		  confirmButtonText: 'Ok',
			cancelButtonText: 'Annuler'
		}).then(async (result) => {
      if (result.value) {
        await this.reparseEventsOfCurrentMonth()
        Swal.fire(
          'Terminé !',
          'Votre planning a été recalculé.',
          'success'
        )
      } else {
        if (_.isFunction(cb)) cb(dismiss)
      }
		})
	},

  _sortEvents(events) {
		events = _.sortBy(events, 'start')
	},

	prevMonth() {
    const currentMonth = this._prevMonth(this.currentMonth.get())
    this.currentMonth.set(currentMonth)
    Session.set('currentMonth', currentMonth)
	},

	nextMonth() {
    const currentMonth = this._nextMonth(this.currentMonth.get())
    this.currentMonth.set(currentMonth)
    Session.set('currentMonth', currentMonth)
	},

	_prevMonth(date) {
		if (date.month === 1) {
			return {
				month: 12,
				year: date.year - 1
			}
		} else {
			return {
				month: date.month - 1,
				year: date.year
			}
		}
	},

	_nextMonth(date) {
		if (date.month === 12) {
			return {
				month: 1,
				year: parseInt(date.year) + 1
			}
		} else {
			return {
				month: parseInt(date.month) + 1,
				year: date.year
			}
		}
	}
}
