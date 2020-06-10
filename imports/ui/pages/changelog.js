import { Meteor } from 'meteor/meteor'
import { Template } from 'meteor/templating'
import './changelog.html'

Template.changelog.helpers({
  isAdmin() {
    const user = Meteor.user()
    return user && user.username && user.username === Meteor.settings.public.adminUser
  }
})
