import { Template } from 'meteor/templating'
import './changes.html'

import Modals from '/imports/api/client/Modals.js'

Template.changes.helpers({
  tableContent() {
    return Connect.state.get('changesPending')
  },

  onConfirmClick() {
    return async (doneCb) => {
      await Connect.validateChanges()
      Modals.Changes.close()
      doneCb()
      App.sync()
    }
  }
})
