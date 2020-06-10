import { Template } from 'meteor/templating'
import './navbar.html'

import { Tracker } from 'meteor/tracker'
import { ReactiveVar } from 'meteor/reactive-var'

Template.navbar.onCreated(function () {
  this.classes = new ReactiveVar('btn-light')
})

Template.navbar.onRendered(function () {
  Tracker.autorun(() => {
    const isConnected = Connect.authentificated()
    const isWorking = Connect.isWorking()
    if (isWorking) {
      this.classes.set('btn-light')
      this.$('#navbar button.status-button [data-fa-i2svg]')
        .removeClass('fa-user-check fa-user-times')
        .addClass('fa-sync')
    } else {
      if (isConnected) {
        this.classes.set('btn-success')
        this.$('#navbar button.status-button [data-fa-i2svg]')
          .removeClass('fa-sync fa-user-times')
          .addClass('fa-user-check')
      } else {
        this.classes.set('btn-warning')
        this.$('#navbar button.status-button [data-fa-i2svg]')
          .removeClass('fa-user-check fa-sync')
          .addClass('fa-user-times')
      }
    }
  })
})

Template.navbar.helpers({
  classes() {
    return Template.instance().classes.get()
  }
})
