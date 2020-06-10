import { Template } from 'meteor/templating'
import './remuA.html'

Template.rotationModalRemuATab.helpers({
  is(vol, tag) {
    return vol.tag === tag
  },

  num(index) {
    return index + 1
  },

  isPNT() {
    return Controller.isPNT()
  }
})
