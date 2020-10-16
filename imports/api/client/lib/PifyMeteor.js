import { Meteor } from 'meteor/meteor'
import pify from 'pify'

export default {
  call: pify(Meteor.call),
  apply: pify(Meteor.apply)
}