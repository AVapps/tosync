import { Template } from 'meteor/templating'
import './changes.html'

import _ from 'lodash'

import Modals from '/imports/api/client/Modals.js'

Template.changes.helpers({
  showTable() {
    return _.isString(Connect.state.get('changesPending'))
  },

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
