import { Template } from 'meteor/templating'
import { ReactiveDict } from 'meteor/reactive-dict'
import * as Ladda from 'ladda'
import './LaddaButton.html'

Template.LaddaButton.onCreated(function () {
  this.state = new ReactiveDict({ loading: false })
})

Template.LaddaButton.onRendered(function () {
  if (!this.ladda) {
    this.ladda = Ladda.create(this.find('button'))
  }
  if (!this.laddaComp) {
    Tracker.autorun(comp => {
      if (!this.laddaComp) this.laddaComp = comp
      if (this.state.get('loading')) {
        this.ladda.start()
      } else {
        this.ladda.stop()
      }
    })
  }
})

Template.LaddaButton.onDestroyed(function () {
  if (this.laddaComp) this.laddaComp.stop()
})

Template.LaddaButton.helpers({

})

Template.LaddaButton.events({
	'click button': function (e,t) {
    if (!t.data.onClick || !_.isFunction(t.data.onClick)) return
    t.state.set('loading', true)
    function doneCb() {
      t.state.set('loading', false)
    }
    t.data.onClick(doneCb)
	}
})
