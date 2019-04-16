export class PlanningParser {

	constructor(events, options) {
		// this.events = _.sortBy(events, 'start');
		this.events = events;
		this.options = options || {};
		
		_.defaults(this.options, {
			bases: ['ORY', 'CDG'],
			rotationBreakTime: 10.0,
			stopoverBreakTime: 7.0
		});

		this._init();
		this._groupEvents();
	}

	_init() {
		this.rotations = [];
		this.sols = [];
		this.groupedEvents = [];

		this._resetRotation();
		this._resetSV();
	}

	_groupEvents() {
		var self = this;
		_.forEach(this.events, function (evt) {
			switch (evt.tag) {
				case 'vol':
				case 'mep':
					if (!self._rotation) {
						self._beginRotation(evt);
					} else if (self._prev
						&& (self.options.bases.indexOf(self._prev.to) !== -1 || self.options.bases.indexOf(evt.from) !== -1)
						&& evt.start.diff(self._prev.end, 'hours', true) >= self.options.rotationBreakTime) {
						self._completeRotation()
							._beginRotation(evt);
					}
					self._addVolToRotation(evt);
					self._prev = evt;
					break;
				case 'conges':
				case 'repos':
					self._completeRotation();
					self._addAllDayEvent(evt);
					break;
				case 'simu':
				case 'instruction':
				case 'stage':
				case 'sol':
				case 'delegation':
				case 'autre':
					self._completeRotation();
					self.sols.push(evt);
					break; 
			}
		});

		this._completeRotation();

		_.forEach(this.rotations, function (rotation) {
			self.parseSV(rotation);
		});

		return this;
	}

	_addAllDayEvent(evt) {
		if (!(this.sols.length && _.last(this.sols).start.isSame(evt.start, 'day'))) {
			this.sols.push(evt);
			this.groupedEvents.push(evt);
		};
		return this;
	}

	_beginRotation(vol) {
		this._rotation = {
			tag: 'rotation',
			base: vol.from,
			start: vol.start.clone(),
			vols: [],
			services: []
		};
		return this;
	}

	_addVolToRotation(vol) {
		this._rotation.vols.push(vol);
		return this;
	}

	_completeRotation() {
		if (!this._prev || !this._rotation) return;
		this._rotation.end = this._prev.end.clone();
		this.rotations.push(this._rotation);
		this.groupedEvents.push(this._rotation);
		this._resetRotation();
		return this;
	}

	_resetRotation() {
		this._rotation = null;
		this._prev = null;
		return this;
	}

	parseSV(rotation) {
		var self = this;
		this._resetSV();
		_.forEach(rotation.vols, function (evt) {
			if (!self._sv) {
				self._beginSV(evt);
			} else if (self._prev && evt.start.diff(self._prev.end, 'hours', true) >= self.options.stopoverBreakTime) {
				self._completeSV(rotation)
					._beginSV(evt);
			}
			self._addVolToSV(evt);
			self._prev = evt;
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
		var index = rotation.services.length;
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