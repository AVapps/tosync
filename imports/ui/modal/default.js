import { Template } from 'meteor/templating'
import './default.html'
import Utils from '../../api/client/lib/Utils.js'
import _ from 'lodash'

Template.defaultModalContent.helpers({
  showEvent(evt) {
    return evt.tag != 'rotation'
  },
  
  hasEvents(evt) {
    return evt.events && evt.events.length
  },

  isPNT() {
    return Controller.isPNT()
  },

  showValueTable() {
    return _.has(this.day, 'tag') && this.day.tag != 'autre' && !_.includes(Utils.alldayTags, this.day.tag)
  }
})

Template.defaultModalEvent.helpers({
  tags(evt) {
    switch (evt.tag) {
      case 'simu':
      case 'instructionSimu':
        return ['simu', 'instructionSimu', 'stage']
      case 'sol':
      case 'instructionSol':
        return ['sol', 'instructionSol', 'stage']
      default:
        if (_.has(Utils.categories, evt.category) && _.get(Utils.categories, evt.category) == evt.tag) {
          return [ evt.tag ]
        } else {
          return Utils.tags
        }
    }
  },

  tagLabel(tag) {
    return Utils.tagLabel(tag)
  },

  isSelected(tag) {
    return this.event.tag === tag ? 'selected' : ''
  }
})

Template.defaultModalValueRow.helpers({
  hasKey() {
    return _.has(this.day, this.key)
  },

  title() {
    return this.key.replace(/(AF)|(TO)/g, '')
  },

  getKey() {
    return _.get(this.day, this.key)
  }
})

Template.defaultModalEvent.events({
  'change select': function (e, t) {
    const tag = e.currentTarget.value
    t.$('tr').trigger('set.tosync', { event: this.event, set: { tag }})
  },
  
  'click .remove-button': function (e,t) {
    t.$(e.currentTarget).trigger('removeEvent.tosync', this.event)
    t.$('tr').fadeOut()
  }
})
