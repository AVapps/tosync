import { Template } from 'meteor/templating'
import './colorSelect.html'
import _ from 'lodash'
import 'bootstrap/js/dist/popover.js'

Template.colorSelect.onCreated(function () {
  this.selectedId = new ReactiveVar(this.data.value)
  this.hidden = new ReactiveVar(true)
})

Template.colorSelect.onRendered(function () {
  // this.$('.cs-popper-content').hide()
})

Template.colorSelect.onDestroyed(function () {
  // if (this.popper) this.popper.destroy()
})

Template.colorSelect.helpers({
  colorItemAttr(color, selectedId) {
    return {
      style: `color: ${color.foreground}; background-color: ${color.background};`,
      'data-selected': color.id == Template.instance().selectedId.get() ? '' : false,
      'data-value': color.id
    }
  },

  popperClass() {
    return Template.instance().hidden.get() ? 'hide' : 'show'
  },

  selectedId() {
    return Template.instance().selectedId.get()
  }
})

Template.colorSelect.events({
    'click .cs-item': (e,t) => {
    t.selectedId.set(e.currentTarget.dataset.value)
    if (_.isFunction(t.data.onChange)) {
      t.data.onChange(e.currentTarget.dataset.value)
    }
  }
})
