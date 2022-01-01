import { Template } from 'meteor/templating'
import { Meteor } from 'meteor/meteor'
import './main.html'

import '../components/enrollModal.js'

Template.main.onRendered(function () {
  const setVh = () => {
    const vh = window.innerHeight * 0.01
    document.documentElement.style.setProperty('--vh', `${vh}px`)
  }

  window.addEventListener('load', setVh)
  window.addEventListener('resize', setVh)
})

Template.main.helpers({
  isLoggedIn() {
    return !!Meteor.userId()
  }
})
