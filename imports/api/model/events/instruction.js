import SimpleSchema from 'simpl-schema'

const instructionObjectSchema = new SimpleSchema({
  code: {
    type: String
  },
  type: {
    type: String,
    optional: true
  },
  title: {
    type: String,
    optional: true
  },
  inst: {
    type: String,
    regEx: /^[A-Z]{3}$/,
    optional: true
  },
  fonction: {
    type: String,
    optional: true
  },
  tags: {
    type: Array,
    optional: true
  },
  'tags.$': {
    type: String,
    optional: true
  },
  peq: {
    type: Object,
    optional: true,
    blackbox: true
  }
})

export const instructionSchema = new SimpleSchema({
  instruction: {
    type: Object,
    optional: true
  },
  'instruction.own': {
    type: Array,
    optional: true
  },
  'instruction.own.$': {
    type: instructionObjectSchema,
    optional: true
  },
  'instruction.other': {
    type: Array,
    optional: true
  },
  'instruction.other.$': {
    type: instructionObjectSchema,
    optional: true
  }
})