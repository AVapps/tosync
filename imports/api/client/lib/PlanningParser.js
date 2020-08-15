import { _ } from 'meteor/underscore'
import moment from 'moment'

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
		// this.eventsByTag = _.sortBy(this.parsedEvents, 'tag');
		this.parsedEvents = _.sortBy(this.parsedEvents, 'start')
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
		_.forEach(this.events, (evt, index) => {
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
        case 'absence':
        case 'conges':
        case 'sanssolde':
        case 'blanc':
        case 'jisap':
        case 'repos':
        case 'maladie':
        case 'greve':
					this._completeRotation()
					this._addAllDayEvent(evt)
					break
				default:
					this._completeRotation()
					this.sols.push(evt)
          this.parsedEvents.push(evt)
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
    const restGTEMin = evt.start.diff(this._prev.end, 'hours', true) >= this.options.rotationBreakTime
    return restGTEMin && (
      this.options.bases.indexOf(evt.from) !== -1
      || this._prev.to != evt.from
      || ( this._rotation.base && this._prev.to === this._rotation.base )
    )
  }

	_addAllDayEvent(evt) {
		if (!(this.sols.length && _.last(this.sols).start.isSame(evt.start, 'day'))) {
			evt.start.startOf('day');
			evt.end.endOf('day');
			this.sols.push(evt);
			this.parsedEvents.push(evt);
		};
		return this;
	}

	_beginRotation(vol) {
		this._rotation = {
			tag: 'rotation',
			// base: vol.from,
			start: vol.start.clone(),
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
		this._rotation.vols.push(vol);
		this.parsedEvents.push(vol);
		return this;
	}

	_completeRotation() {
		if (!this._prev || !this._rotation) return;
		this._rotation.end = this._prev.end.clone();
    if (!this._rotation.base) {
      this._rotation.base = this._prev.to
    }
		this.rotations.push(this._rotation);
		this.parsedEvents.push(this._rotation);
		this._resetRotation();
		return this;
	}

	_resetRotation() {
		this._rotation = null;
		this._prev = null;
		return this;
	}

	parseSV(rotation) {
		this._resetSV();
		_.forEach(rotation.vols, evt => {
			if (!this._sv) {
				this._beginSV(evt);
			} else if (this._prev && evt.start.diff(this._prev.end, 'hours', true) >= this.options.stopoverBreakTime) {
				this._completeSV(rotation)
					._beginSV(evt);
			}
			this._addVolToSV(evt);
			this._prev = evt;
		});
		return this._completeSV(rotation);
	}

	_beginSV(evt) {
		this._sv = {
			start: evt.start.clone(),
			vols: []
		}
		return this;
	}

	_addVolToSV(vol) {
		this._sv.vols.push(vol);
		return this;
	}

	_completeSV(rotation) {
		const index = rotation.services.length;
		_.forEach(this._sv.vols, function (vol) {
			vol.svIndex = index;
		});
		rotation.services.push(this._sv);
		return this._resetSV();
	}

	_resetSV() {
		this._sv = null;
		this._prev = null;
		return this;
	}
}
