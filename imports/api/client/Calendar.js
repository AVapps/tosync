import _ from 'lodash'
import { Mongo } from 'meteor/mongo'
import { DateTime } from 'luxon'
import '/imports/lib/luxon-ejson.js'
import Utils from './lib/Utils'

function _transformEvent(doc) {
  _.extend(doc, {
    debut: DateTime.fromMillis(doc.start),
    fin: DateTime.fromMillis(doc.end)
  })
  if (doc.real) {
    if (doc.real.start) doc.debutR = DateTime.fromMillis(doc.real.start)
    if (doc.real.end) doc.finR = DateTime.fromMillis(doc.real.end)
  }
  return doc
}

const WEEKDAYS = {
  1: { short: 'Lu', long: 'Lundi' },
  2: { short: 'Ma', long: 'Mardi' },
  3: { short: 'Me', long: 'Mercredi' },
  4: { short: 'Je', long: 'Jeudi' },
  5: { short: 'Ve', long: 'Vendredi' },
  6: { short: 'Sa', long: 'Samedi' },
  7: { short: 'Di', long: 'Dimanche' },
}

Calendar = {
	cmonth: DateTime.local(),
	start: DateTime.local(),
	end: DateTime.local(),

  days: new Mongo.Collection(null),
  onDayUpdated: () => {},

	init: function () {
		this.buildEmptyCalendar()
	},

  buildCalendarDays(currentMonth) {
    this.cmonth = DateTime.fromObject(currentMonth)
		this.start = this.cmonth.startOf('month').startOf('week')
		this.end = this.cmonth.endOf('month').endOf('week')

    let cursor = this.start
    const now = DateTime.local()
    let index = 0

		while (cursor.startOf('day') <= this.end.startOf('day')) {
      const day = {
        tag: '',
        allday: false,
        label: '',
  			date: cursor,
        slug: cursor.toFormat("yyyy-MM-dd"),
  			weekday: WEEKDAYS[cursor.weekday].short,
        day: cursor.day,
  			dof: cursor.weekday,
  			classes: [],
        events: []
  		}

  		// day.classes.push('calendar-dow-' + day.dof)
  		day.classes.push('calendar-day-' + day.slug)

  		if (cursor.startOf('day') < now.startOf('day')) {
  			day.classes.push('past')
      } else if (cursor.startOf('day') === now.startOf('day')) {
  			day.classes.push('today')
  		}

  		if (cursor.startOf('month') < this.cmonth.startOf('month')) {
  			day.classes.push('adjacent-month', 'last-month')
      } else if (cursor.startOf('month') > this.cmonth.startOf('month')) {
  			day.classes.push('adjacent-month', 'next-month')
  		}

      this.days.update({ index }, { $set: day })

      cursor = cursor.plus({ day: 1 })
      index++
    }
    
    while (index <= 41) {
      this.days.update({ index }, {
        $set: {
          tag: '',
          allday: false,
          label: '',
          date: cursor,
          slug: cursor.toFormat("yyyy-MM-dd"),
          weekday: WEEKDAYS[cursor.weekday].short,
          day: cursor.day,
          dof: cursor.weekday,
          classes: ['hidden'],
          events: []
        }
      })
      cursor = cursor.plus({ day: 1 })
      index++
    }
  },

  buildEmptyCalendar() {
    // Clear calendar
    this.days.remove({})
    const now = DateTime.local()
    for (let i = 0; i <= 41; i++) {
      const dow = (i % 7) + 1
      this.days.insert({
        index: i,
        tag: '',
        allday: false,
        label: '',
        date: now,
        slug: i,
  			weekday: WEEKDAYS[dow].short,
  			day: '',
  			dof: dow,
        classes: i <= 34 ? [] : ['hidden'],,
        events: []
      })
    }
  },

  observeEvents(eventsCursor) {
    return eventsCursor.observe({
      added: (doc) => {
        doc = _transformEvent(doc)
        // console.log('Calendar.observeEvents ADDED', doc)
        if (doc.debut.hasSame(doc.fin, 'day')) {
          this.addEventToDate(doc, doc.debut)
        } else {
          let cursor = doc.debut
          while (cursor.startOf('day') <= doc.fin.startOf('day')) {
            this.addEventToDate(doc, cursor)
            cursor = cursor.plus({ day: 1 })
          }
        }
      },
      removed: (doc) => {
        doc = _transformEvent(doc)
        // console.log('Calendar.observeEvents REMOVED', doc)
        if (doc.debut.hasSame(doc.fin, 'day')) {
          this.removeEventFromDate(doc, doc.debut)
        } else {
          let cursor = doc.debut
          while (cursor.startOf('day') <= doc.fin.startOf('day')) {
            this.removeEventFromDate(doc, cursor)
            cursor = cursor.plus({ day: 1 })
          }
        }
      },
      changed: (doc, oldDoc) => {
        doc = _transformEvent(doc)
        oldDoc = _transformEvent(oldDoc)
        // console.log('Calendar.observeEvents UPDATED', doc, oldDoc)
        if (doc.debut.hasSame(oldDoc.debut, 'day') && doc.fin.hasSame(oldDoc.fin, 'day')) {
          if (doc.debut.hasSame(doc.fin, 'day')) {
            this.updateEventFromDate(doc, doc.debut)
          } else {
            let cursor = doc.debut
            while (cursor.startOf('day') <= doc.fin.startOf('day')) {
              this.updateEventFromDate(doc, cursor)
              cursor = cursor.plus({ day: 1 })
            }
          }
        } else {
          // Remove
          if (oldDoc.debut.hasSame(oldDoc.fin, 'day')) {
            this.removeEventFromDate(oldDoc, oldDoc.debut)
          } else {
            let cursor = oldDoc.debut
            while (cursor.startOf('day') <= doc.fin.startOf('day')) {
              this.removeEventFromDate(oldDoc, cursor)
              cursor = cursor.plus({ day: 1 })
            }
          }
          // Then add
          if (doc.debut.hasSame(doc.fin, 'day')) {
            this.addEventToDate(doc, doc.debut)
          } else {
            let cursor = doc.debut
            while (cursor.startOf('day') <= doc.fin.startOf('day')) {
              this.addEventToDate(doc, cursor)
              cursor = cursor.plus({ day: 1 })
            }
          }
        }
      }
    })
  },

  addBlancs() {
    const weekday = DateTime.local().weekday
    const maxDate = DateTime.local().set({ weekday : weekday >= 4 ? 4 : -3 }).plus({ days: 31 }).toISODate()
    this.days.update({ events: [], slug: { $lte: maxDate }}, {
      $set: { tag: 'blanc', allday: true, label: 'Blanc' }
    }, { multi: true })
  },

  addEventToDate(doc, date) {
    const slug = date.toISODate()
    const day = this.days.findOne({ slug })
    if (!day) return

    const found = _.find(day.events, { _id: doc._id })
    if (found) {
      this.updateEventFromDate(doc, date)
    } else {
      const position = _.findIndex(day.events, evt => evt.start > doc.start)
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
      this.onDayUpdated(slug)
    }
  },

  removeEventFromDate(doc, date) {
    const slug = date.toISODate()
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
    this.onDayUpdated(slug)
  },

  updateEventFromDate(doc, date) {
    const slug = date.toISODate()
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
    this.onDayUpdated(slug)
  },

  getDayParams(events) {
    // console.log('getDayParams', events)
    const hasRotation = _.some(events, evt => {
      return _.includes(['rotation', 'vol'], evt.tag)
    })
    if (hasRotation) {
      return {
        tag: 'rotation',
        allday: false,
        label: 'Rotation'
      }
    } else {
      if (!events.length || !_.has(_.first(events), 'tag')) {
        return { tag: 'blanc', allday: true, label: 'Blanc' }
      }
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
  },

  getBlancEvents() {
    return this.days.find({ tag: 'blanc', events: [] }).map(day => {
      return {
        tag: 'blanc',
        start: day.date.toMillis(),
        end: day.date.endOf('day').toMillis(),
        summary: 'Blanc',
        description: ''
      }
    })
  }
};
