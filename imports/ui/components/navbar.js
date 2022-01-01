import { Template } from 'meteor/templating'
import './navbar.html'

import { Tracker } from 'meteor/tracker'
import { ReactiveVar } from 'meteor/reactive-var'

Template.navbar.onCreated(function () {
  this.classes = new ReactiveVar('btn-light')
})

Template.navbar.onRendered(function () {
  Tracker.autorun(() => {
    const isConnected = Connect.isOnline()
    const isWorking = Connect.running()
    if (isWorking) {
      this.classes.set('btn-light')
      this.$('#statusIcon')
        .removeClass('fa-user-cog')
        .addClass('fa-sync')
    } else {
      this.$('#statusIcon')
        .removeClass('fa-sync')
        .addClass('fa-user-cog')
      if (isConnected) {
        this.classes.set('btn-success')
      } else {
        this.classes.set('btn-warning')
      }
    }
  })
})

Template.navbar.helpers({
  classes() {
    return Template.instance().classes.get()
  },

  message() {
    return Connect.state.get('message')
  }
})
