import _ from 'lodash'
import { DateTime } from 'luxon'
import Utils from './Utils.js'

const BASES = [ 'ORY', 'CDG', 'LYS', 'MPL', 'NTE' ]

export default class PlanningParser {

	constructor(events = [], options = {}) {
		this.events = _.sortBy(events, 'start')

    const base = Config.get('base')
    if (base === 'ORY') {
      options.bases = ['ORY', 'CDG']
    } else if (base && base.length === 3) {
      options.bases = [ base ]
    }

		_.defaults(options, {
			bases: ['ORY', 'CDG'],
			rotationBreakTime: 12.0,
			stopoverBreakTime: 7.0
		})

    this.options = options

		this._init()
		this._groupEvents()
		this.factorSolDays()
		this.parsedEvents = _.sortBy(this.parsedEvents.concat(this.sols), 'start')
	}

	firstEvent() {
		return _.first(this.parsedEvents)
	}

	lastEvent() {
		return _.last(this.parsedEvents)
	}

	_init() {
		this.rotations = []
		this.sols = []
		this.parsedEvents = []
		// this.eventsByTag = {}

		this._resetRotation()
		this._resetSV()
	}

	_groupEvents() {
		_.forEach(this.events, (evt) => {
			switch (evt.tag) {
				case 'vol':
				case 'mep':
					if (!this._rotation) {
						this._beginRotation(evt)
					} else if (this._shouldCompleteRotation(evt)) {
						this._completeRotation()._beginRotation(evt)
					}
					this._addVolToRotation(evt)
					this._prev = evt
					break
				default:
					this._completeRotation()
					if (_.includes(Utils.alldayTags, evt.tag)) {
						this._addAllDayEvent(evt)
					} else {
						this.sols.push(evt)
					}
					break
			}
		});

		this._completeRotation()

		_.forEach(this.rotations, rotation => {
			this.parseSV(rotation)
		})

		return this
	}

  _shouldCompleteRotation(evt) {
    if (!this._prev) return false
		const restGTEMin = DateTime.fromMillis(evt.start).diff(DateTime.fromMillis(this._prev.end)).as('hours') >= this.options.rotationBreakTime
    return restGTEMin && (
      this.options.bases.indexOf(evt.from) !== -1
      || this._prev.to != evt.from
      || ( this._rotation.base && this._prev.to === this._rotation.base )
    )
  }

	_addAllDayEvent(evt) {
		if (!(this.sols.length && DateTime.fromMillis(_.last(this.sols).start).hasSame(evt.start, 'day'))) {
			evt.start = DateTime.fromMillis(evt.start).startOf('day').toMillis()
			evt.end = DateTime.fromMillis(evt.end).endOf('day').toMillis()
			this.sols.push(evt)
		}
		return this
	}

	_beginRotation(vol) {
		this._rotation = {
			tag: 'rotation',
			// base: vol.from,
			start: vol.start,
			vols: [],
			services: []
		}
    if (BASES.indexOf(vol.from) !== -1) {
      this._rotation.base = vol.from
    } else {
      this._rotation.base = undefined
    }
		return this
	}

	_addVolToRotation(vol) {
		this._rotation.vols.push(vol)
		this.parsedEvents.push(vol)
		return this
	}

	_completeRotation() {
		if (!this._prev || !this._rotation) return
		this._rotation.end = this._prev.end
    if (!this._rotation.base) {
      this._rotation.base = this._prev.to
    }
		this.rotations.push(this._rotation)
		this.parsedEvents.push(this._rotation)
		this._resetRotation()
		return this
	}

	_resetRotation() {
		this._rotation = null
		this._prev = null
		return this
	}

	parseSV(rotation) {
		this._resetSV()
		_.forEach(rotation.vols, evt => {
			if (!this._sv) {
				this._beginSV(evt)
			} else if (this._prev && DateTime.fromMillis(evt.start).diff(DateTime.fromMillis(this._prev.end)).as('hours') >= this.options.stopoverBreakTime) {
				this._completeSV(rotation)._beginSV(evt)
			}
			this._addVolToSV(evt)
			this._prev = evt
		});
		return this._completeSV(rotation)
	}

	_beginSV(evt) {
		this._sv = {
			start: evt.start,
			vols: []
		}
		return this
	}

	_addVolToSV(vol) {
		this._sv.vols.push(vol)
		return this
	}

	_completeSV(rotation) {
		const index = rotation.services.length
		_.forEach(this._sv.vols, function (vol) {
			vol.svIndex = index
		})
		rotation.services.push(this._sv)
		return this._resetSV()
	}

	_resetSV() {
		this._sv = null
		this._prev = null
		return this
	}

	factorSolDays() {
		const result = []
		let memo
		_.forEach(this.sols, sol => {
			if (_.includes(Utils.alldayTags, sol.tag)) {
				if (memo) {
					if (memo.activity === sol.activity
						&& memo.summary === sol.summary
						&& DateTime.fromMillis(memo.end).plus({ days: 1 }).hasSame(sol.start, 'day')) {
						memo.end = sol.end
					} else {
						result.push(memo)
						memo = sol
					}
				} else {
					memo = sol
				}
			} else {
				if (memo) {
					result.push(memo)
					memo = null
				}
				result.push(sol)
			}
		})
		this.sols = result
	}
}
