import { Template } from 'meteor/templating'
import './emailSettings.html'

import { ReactiveVar } from 'meteor/reactive-var'
import { get as _get } from 'lodash'
import Swal from 'sweetalert2'
import { addEmail, removeEmail, verifyEmail } from '/imports/api/methods.js'

Template.emailSettings.onCreated(function () {
  this.editing = new ReactiveVar(false)
})

Template.emailSettings.onCreated(function () {
  this.editing.set(false)
})

Template.emailSettings.helpers({
  emailsCount() {
    const count = _get(Template.currentData(), 'emails.length')
    if (!count) {
      return 'Aucune adresse'
    } else if (count === 1) {
      return '1 adresse'
    } else {
      return `${ count } adresses`
    }
  },

  showAddButton() {
    return _get(Template.currentData(), 'emails.length') < 3
  },

  showRemoveButton() {
    return _get(Template.currentData(), 'emails.length') > 1
  },

  isEditing() {
    return Template.instance().editing.get()
  }
})

Template.emailSettings.events({
  'click .js-toggle-editing': (e,t) => {
    t.editing.set(!t.editing.get())
  },

  'click button.js-add-email': (e,t) => {
    const email = t.find('input.js-add-email').value
    if (email) {
      addEmail.call({ email }, err => {
        if (err) {
          Notify.error(err)
        } else {
          t.editing.set(false)
          Notify.success(`Un email de vérification a été envoyé à ${ email} .`)
        }
      })
    }
  }
})

Template.emailSetting.helpers({
  verifyEmail() {
    const email = _get(Template.currentData(), 'email.address')
    return (doneCb) => {
      verifyEmail.call({ email }, err => {
        if (err) {
          Notify.error(err)
        } else {
          Notify.success(`Un email de vérification a été envoyé à ${ email }.`)
        }
        doneCb()
      })
    }
  },

  removeEmail() {
    const email = _get(Template.currentData(), 'email.address')
    return async (doneCb) => {
      const result = await Swal.fire({
        title: 'Confirmez-vous la suppression ?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#00D66C',
        cancelButtonColor: '#ff3268',
        confirmButtonText: '<i class="fa fa-check"></i> Supprimer',
        cancelButtonText: '<i class="fa fa-times"></i> Annuler'
      })
      console.log(result)
      if (result.isConfirmed) {
        removeEmail.call({ email }, err => {
          if (err) {
            Notify.error(err)
          }
          doneCb()
        })
      } else {
        doneCb()
      }
    }
  }
})