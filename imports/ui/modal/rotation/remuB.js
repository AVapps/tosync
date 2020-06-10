import { Template } from 'meteor/templating'
import './remuB.html'

Template.rotationModalRemuBTab.helpers({
  is(vol, tag) {
    return vol.tag === tag
  },

  num(index) {
    return index + 1
  }
})
