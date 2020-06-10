import { Template } from 'meteor/templating'
import './changes.html'

import Modals from '/imports/api/client/Modals.js'

Template.changes.helpers({
  tableContent() {
    return Connect.state.get('changesPending')
  },

  onConfirmClick() {
    return async (doneCb) => {
      try {
        await Connect.validateChanges()
      } catch (e) {
        console.log('validateChanges', e)
      }
      doneCb()
      Modals.Changes.close()
    }
  }
})
