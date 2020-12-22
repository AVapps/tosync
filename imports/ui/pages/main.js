import { Template } from 'meteor/templating'
import './main.html'

Template.mainPage.helpers({
  isLoggedIn() {
    return !!Meteor.userId()
  }
})