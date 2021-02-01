import { Template } from 'meteor/templating'
import './allday.html'
import Utils from '/imports/api/client/lib/Utils.js'
import { get } from 'lodash'

Template.alldayModalContent.helpers({
  daySummary() {
    return get(this.day, 'events.0.summary')
  },

  eventInterval() {
    const event = get(this.day, 'events.0')
    if (event && event.debut && event.fin) {
      if (event.debut.hasSame(event.fin, 'day')) {
        // return `${ event.debut.toLocaleString(DateTime.DATE_HUGE) }`.replace(/ 1 /g, ' 1er ')
        return ''
      } else {
        const startFormat = { weekday: 'short', day: 'numeric' }
        const endFormat = { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }
        if (event.debut.month !== event.fin.month) {
          startFormat.month = 'long'
        }
        if (event.debut.year !== event.fin.year) {
          startFormat.year = 'numeric'
        }
        return `Du ${event.debut.toLocaleString(startFormat)} au ${event.fin.toLocaleString(endFormat)}`.replace(/ 1 /g, ' 1er ')
      }
    }
    return ''
  },

  hasSeveralEvents() {
    return this.day.events && this.day.events.length > 1
  },

  showEvent(evt) {
    return evt.tag != 'rotation'
  },

  tagLabel(tag) {
    return Utils.tagLabel(tag)
  },

  tagLabelClass(tag) {
    return Utils.tagLabelClass(tag)
  }
})