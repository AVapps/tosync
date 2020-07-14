import { Template } from 'meteor/templating'
import './colorSelect.html'
import _ from 'lodash'
import Popper from 'popper.js'
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
  'click .cs-button': (e,t) => {
    // const hidden = t.hidden.get()
    // if (hidden) {
    //   t.hidden.set(false)
    //   t.$('.cs-popper-content').show()
    //   t.popper = new Popper(t.find('.cs-button'), t.find('.cs-popper-content'), {
    //     placement: 'right'
    //   })
    // } else {
    //   t.hidden.set(true)
    //   t.$('.cs-popper-content').hide()
    //   t.popper.destroy()
    // }
  },

  'click .cs-item': (e,t) => {
    t.selectedId.set(e.currentTarget.dataset.value)
    if (_.isFunction(t.data.onChange)) {
      t.data.onChange(e.currentTarget.dataset.value)
    }
  }
})
