import { Template } from 'meteor/templating'
import { ReactiveVar } from 'meteor/reactive-var'
import './moisPNC.html'



Template.monthModalContentPNC.helpers({
  stats() {
    return Controller.statsRemu()
  }
})

Template.monthModalContentPNC.events({

})
