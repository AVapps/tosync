import _ from 'lodash'
import { Mongo } from 'meteor/mongo'
import { ReactiveVar } from 'meteor/reactive-var'
import Utils from './lib/Utils'

function _transformEvent(doc) {
  _.extend(doc, {
    start: moment(doc.start),
    end: moment(doc.end)
  })
  if (doc.real) {
    if (doc.real.start) doc.real.start = moment(doc.real.start)
    if (doc.real.end) doc.real.end = moment(doc.real.end)
  }
  return doc
}

Calendar = {
	cmonth: moment(),
	start: moment(),
	end: moment(),

	days: new Mongo.Collection(null),

	init: function () {
		this.buildEmptyCalendar()
	},

  buildCalendarDays(currentMonth) {
    // Clear calendar
    this.days.remove({})

    this.cmonth = moment(currentMonth)
		this.start = this.cmonth.clone().startOf('month').startOf('week')
		this.end = this.cmonth.clone().endOf('month').endOf('week')

    const days = []
    const cursor = this.start.clone()
		const now = moment()

		while (cursor.isBefore(this.end, 'day') || cursor.isSame(this.end, 'day')) {
      const day = {
  			date: cursor.clone(),
        slug: cursor.format("YYYY-MM-DD"),
  			weekday: cursor.format('dd'),
  			day: cursor.date(),
  			dof: cursor.weekday(),
  			classes: [],
        events: []
  		}

  		day.classes.push('calendar-dow-' + day.dof)
  		day.classes.push('calendar-day-' + day.date.format("YYYY-MM-DD"))

  		if (cursor.isBefore(now, 'day')) {
  			day.classes.push('past')
  		} else if (cursor.isSame(now, 'day')) {
  			day.classes.push('today')
  		}

  		if (cursor.isBefore(this.cmonth, 'month')) {
  			day.classes.push('adjacent-month', 'last-month')
  		} else if (cursor.isAfter(this.cmonth, 'month')) {
  			day.classes.push('adjacent-month', 'next-month')
  		}

  		this.days.insert(day)

  		cursor.add(1, 'day')
		}
  },

  buildEmptyCalendar() {
    // Clear calendar
    this.days.remove({})

    const now = moment()
    const weekdays = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']

    for (let i = 0; i <= 34; i++) {
      const dow = i % 7
      this.days.insert({
        date: now,
        slug: i,
  			weekday: weekdays[dow],
  			day: '',
  			dof: dow,
  			classes: ['calendar-dow-' + dow],
        events: []
      })
    }
  },

  observeEvents(eventsCursor) {
    return eventsCursor.observe({
      added: (doc) => {
        doc = _transformEvent(doc)
        // console.log('Calendar.observeEvents ADDED', doc)
        if (doc.start.isSame(doc.end, 'day')) {
          this.addEventToDate(doc, doc.start)
        } else {
          const cursor = doc.start.clone()
          while (!cursor.isAfter(doc.end, 'day')) {
            this.addEventToDate(doc, cursor)
            cursor.add(1, 'day')
          }
        }
      },
      removed: (doc) => {
        doc = _transformEvent(doc)
        // console.log('Calendar.observeEvents REMOVED', doc)
        if (doc.start.isSame(doc.end, 'day')) {
          this.removeEventFromDate(doc, doc.start)
        } else {
          const cursor = doc.start.clone()
          while (!cursor.isAfter(doc.end, 'day')) {
            this.removeEventFromDate(doc, cursor)
            cursor.add(1, 'day')
          }
        }
      },
      changed: (doc, oldDoc) => {
        doc = _transformEvent(doc)
        // console.log('Calendar.observeEvents UPDATED', doc, oldDoc)
        if (doc.start.isSame(oldDoc.start, 'day') && doc.end.isSame(oldDoc.end, 'day')) {
          if (doc.start.isSame(doc.end, 'day')) {
            this.updateEventFromDate(doc, doc.start)
          } else {
            const cursor = doc.start.clone()
            while (!cursor.isAfter(doc.end, 'day')) {
              this.updateEventFromDate(doc, cursor)
              cursor.add(1, 'day')
            }
          }
        } else {
          // Remove
          oldDoc = _transformEvent(oldDoc)
          if (oldDoc.start.isSame(oldDoc.end, 'day')) {
            this.removeEventFromDate(oldDoc, oldDoc.start)
          } else {
            const cursor = oldDoc.start.clone()
            while (!cursor.isAfter(oldDoc.end, 'day')) {
              this.removeEventFromDate(oldDoc, cursor)
              cursor.add(1, 'day')
            }
          }
          // Then add
          if (doc.start.isSame(doc.end, 'day')) {
            this.addEventToDate(doc, doc.start)
          } else {
            const cursor = doc.start.clone()
            while (!cursor.isAfter(doc.end, 'day')) {
              this.addEventToDate(doc, cursor)
              cursor.add(1, 'day')
            }
          }
        }
      }
    })
  },

  addEventToDate(doc, date) {
    const slug = date.format('YYYY-MM-DD')
    Tracker.nonreactive(() => {
      const day = this.days.findOne({ slug })
      if (!day) return

      const found = _.find(day.events, { _id: doc._id })
      if (found) {
        this.updateEventFromDate(doc, date)
      } else {
        const position = _.findIndex(day.events, evt => evt.start.isAfter(doc.start))
        const params = this.getDayParams([doc].concat(day.events))

        this.days.update({ slug }, {
          $push: {
            events: {
              $each: [ doc ],
              $position: position !== -1 ? position : day.events.length
            }
          },
          $addToSet: { classes: 'event' },
          $set: params
        })
      }
    })
  },

  removeEventFromDate(doc, date) {
    const slug = date.format('YYYY-MM-DD')
    const day = this.days.findOne({ slug })
    if (!day) return
    const updatedEvents = _.reject(day.events, { _id: doc._id })
    if (_.isEmpty(updatedEvents)) {
      this.days.update(day._id, {
        $unset: { tag: '', allday: '' },
        $pull: { classes: 'event' },
        $set: { events: [] }
      })
    } else {
      const params = this.getDayParams(updatedEvents)
      this.days.update(day._id, {
        $pull: { events: { _id: doc._id }},
        $set: params
      })
    }
  },

  updateEventFromDate(doc, date) {
    const slug = date.format('YYYY-MM-DD')
    const day = this.days.findOne({ slug })
    if (!day) return
    const updatedEvents = _.reject(day.events, { _id: doc._id })
    updatedEvents.push(doc)
    const params = this.getDayParams(updatedEvents)
    // console.log('Calendar.updateEventFromDate', slug, date, doc, day, updatedEvents, params)
    this.days.update({ slug, 'events._id': doc._id }, {
      $set: _.extend(params, {
        'events.$': doc
      })
    })
  },

	generateDaysData(events) {
    events = _.filter(events, evt => {
			if (evt.start && evt.end && moment.isMoment(evt.start) && moment.isMoment(evt.end)) {
				return evt.end.isAfter(this.start) && evt.start.isBefore(this.end)
			} else {
				return false
			}
		})

    const eventsByDate = {}

    _.forEach(events, evt => {
      if (evt.start.isSame(evt.end, 'day')) {
        const slug = evt.start.format('YYYY-MM-DD')
        if (!_.has(eventsByDate, slug)) eventsByDate[slug] = []
        eventsByDate[slug].push(evt)
      } else {
        const cursor = evt.start.clone()
        while (cursor.isBefore(evt.end, 'day') || cursor.isSame(evt.end, 'day')) {
          const slug = cursor.format('YYYY-MM-DD')
          if (!_.has(eventsByDate, slug)) eventsByDate[slug] = []
          eventsByDate[slug].push(evt)
          cursor.add(1, 'day')
        }
      }
    })

    this.days.find().forEach(day => {
      if (_.has(eventsByDate, day.slug)) {
        const events = _.get(eventsByDate, day.slug)
        const params = this.getDayParams(events)
        this.days.update(day._id, {
          $set: _.extend(params, { events }),
          $addToSet: { classes: 'event' }
        })
      } else {
        this.days.update(day._id, {
          $unset: { tag: '', allday: '' },
          $pull: { classes: 'event' },
          $set: { events: [] }
        })
      }
    })

    _.forEach(eventsByDate, (events, slug) => {
      const params = this.getDayParams(events)

      this.days.update({ slug }, {
        $set: _.extend(params, { events }),
        $addToSet: { classes: 'event' }
      })
    })
	},

  getDayParams(events) {
    // console.log('getDayParams', events)
    const hasRotation = _.some(events, evt => {
      return _.includes(['rotation', 'mep', 'vol'], evt.tag)
    })
    if (hasRotation) {
      return {
        tag: 'rotation',
        allday: false
      }
    } else {
      if (!events.length || !_.has(_.first(events), 'tag')) debugger
      const specialCategoryEvent = _.find(events, evt => _.includes(['simu', 'instructionSol', 'instructionSimu', 'stage', 'delegation', 'reserve'], evt.tag))
      const tag = specialCategoryEvent ? specialCategoryEvent.tag : _.first(events).tag
      return { tag, allday: _.includes(Utils.alldayTags, tag) }
    }
  },

  findDay(slug) {
    return this.days.findOne({ slug })
  },

  getDays() {
    return this.days.find({}, { sort: [['slug', 'asc']] })
  }
};
