import SimpleSchema from 'simpl-schema'

export const peqSchema = new SimpleSchema({
  peq: {
    type: Object,
    optional: true
  },

  'peq.pnt': {
    type: Array,
    optional: true
  },
  'peq.pnt.$': {
    type: String,
    regEx: /^©?[A-Z]{3}$/
  },

  'peq.pnc': {
    type: Array,
    optional: true
  },
  'peq.pnc.$': {
    type: String,
    regEx: /^[A-Z]{3}$/
  },

  'peq.mep': {
    type: Array,
    optional: true
  },
  'peq.mep.$': {
    type: String,
    regEx: /^[A-Z]{3}$/
  }
})

export const groundCrewSchema = new SimpleSchema({
  peq: {
    type: Object,
    optional: true
  },

  'peq.sol': {
    type: Array,
    optional: true
  },
  'peq.sol.$': {
    type: String,
    regEx: /^[A-Z]{3}$/
  },

  'peq.mep': {
    type: Array,
    optional: true
  },
  'peq.mep.$': {
    type: String,
    regEx: /^[A-Z]{3}$/
  }
})