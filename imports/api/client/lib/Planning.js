import _ from 'lodash'
import { Meteor } from 'meteor/meteor'
import { DateTime } from 'luxon'

export default class Planning {
	constructor(events, currentMonth) {
		this._events = events
		this.currentMonth = currentMonth
    this._groupedEvents = {}

		if (this._checkDuplicates()) {
      Controller.askForPlanningReparsing("Votre planning comporte des doublons. Cliquez sur OK pour les supprimer.", currentMonth)
		}

		this._groupEvents()

		this._groupedEvents.rotation = _.chain(this._groupedEvents.rotation)
			.filter(rot => {
				if (rot.sv && rot.sv.length) {
					return true
				} else {
					console.log("Rotation vide !", rot)
					Events.remove(rot._id)
				}
			})
			.forEach(rot => {
				_.forEach(rot.sv, sv => {
					if (sv.countVol > 5) {
						Controller.askForPlanningReparsing("Un service de vol comporte plus de 5 étapes. Si cela n'est pas correct, cliquez sur OK pour recalculer votre planning.", currentMonth)
					} else if (sv.TR > 15 || (sv.real && sv.real.TR > 15)) {
						Controller.askForPlanningReparsing("Un temps de service de vol est supérieur à 15h : cliquez sur OK pour recalculer votre planning.", currentMonth)
					}
				})
			})
			.value()
	}

	_groupEvents() {
		const groups = this._groupedEvents = _.groupBy(this._events, 'tag');
    if (_.has(groups, 'vol') || _.has(groups, 'mep')) {
      _.chain((groups.vol || []).concat(groups.mep || []))
        .sortBy('start')
  			.groupBy('rotationId')
  			.forEach(function (evts, rotationId) {
          const rotation = _.find(groups.rotation, { _id: rotationId })
  				if (rotation) {
            rotation.events = evts
  					const sv = _.groupBy(evts, 'svIndex')
  					rotation.sv = _.chain(sv)
  						.keys()
  						.map(i => {
                const etapes = sv[i]
                const counts = _.defaults(_.countBy(etapes, 'tag'), { vol: 0, mep: 0 })

                if (counts.vol === 0 && counts.mep === 0) {
                  console.log('!!! SV sans aucune etape !!!')
                }

                return {
                  type: counts.vol > 0 ? 'vol' : 'mep',
                  countVol: counts.vol,
                  countMEP: counts.mep,
                  events: etapes
                }
              })
  						.value()

            if (rotation.sv.length >= 2) {
              rotation.decouchers = _.reduce(rotation.sv, (dec, sv, index, col) => {
                if (index === 0) {
                  const last = _.last(sv.events)
                  dec.push({
                    start: last.end,
                    to: last.to
                  })
                } else {
                  const first = _.first(sv.events)
                  const prev = _.last(dec)
									if (DateTime.fromMillis(first.start).diff(DateTime.fromMillis(prev.start)).as('hours') >= 8) {
                    prev.end = first.start
										prev.duree = DateTime.fromMillis(prev.end).diff(DateTime.fromMillis(prev.start)).as('hours')
                    col[index - 1].stop = prev
                  } else {
                    dec.pop()
                  }
                  if (index < (col.length - 1)) { // Skip last sv
                    const last = _.last(sv.events)
                    dec.push({
                      start: last.end,
                      to: last.to
                    })
                  }
                }
                return dec
              }, [])
            } else {
              rotation.decouchers = []
            }
  				} else {
  					console.log('Rotation introuvable !', rotationId, evts)
  					Meteor.defer(() => {
  						Controller.reparseEventsOfMonth(this.currentMonth)
  					})
  				}
  			})
  			.value();
    }
	}

	_checkEvents() {
		return _.every(this._events, function (evt) {
			switch (evt.tag) {
				case 'vol':
				case 'mep':
					return _.has(evt, 'rotationId');
				default:
					return true;
			}
		});
	}

	_checkDuplicates() {
		const counts = _.countBy(this._events, 'slug')
		const hasDuplicates = _.some(counts, count => count > 1)
		if (hasDuplicates) console.log('[ Doublons trouvés ]', counts)
		return hasDuplicates
	}

	_filterEventsByDates(events, start, end) {
		return _.filter(events, function(evt) {
			return evt.end >= start && evt.start <= end
		})
	}

	groupedEvents() {
		return this._groupedEvents
	}

	groupedEventsThisMonth(month) {
		month = month || this.currentMonth
		const start = DateTime.fromObject(month).startOf('month').startOf('week').toMillis()
		const end = DateTime.fromObject(month).endOf('month').endOf('week').toMillis()
		return _.mapValues(this._groupedEvents, events => {
			return this._filterEventsByDates(events, start, end)
		})
	}

	eventsThisMonth(month) {
		month = month || this.currentMonth
		const start = DateTime.fromObject(month).startOf('month').toMillis()
		const end = DateTime.fromObject(month).endOf('month').toMillis()
		return this._filterEventsByDates(this._events, start, end)
	}

	eventsToSync(month) {
		month = month || this.currentMonth
		const monthStart = DateTime.fromObject(month).startOf('month').toMillis()
		const nextMonthEnd = DateTime.fromObject(month).plus({ month: 1 }).endOf('month').toMillis()
		let events = this._filterEventsByDates(this._events, monthStart, nextMonthEnd)
		const earliest = _.first(events)
		const latest = _.find(events, evt => evt.end > nextMonthEnd)
		if (earliest.start < monthStart || latest) {
			const actualStart = earliest.start
			let actualEnd = nextMonthEnd
			if (latest) actualEnd = latest.end
			events = this._filterEventsByDates(this._events, actualStart, actualEnd)
		}
		return events
	}
}
