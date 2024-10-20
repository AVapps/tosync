import SimpleSchema from 'simpl-schema'
import { eventSchema } from './event.js'

const volSchema = new SimpleSchema({
  tag: {
    type: String,
    allowedValues: ['vol']
  },
  num: {
    type: String,
    optional: true
  },
  type: {
    type: String,
    optional: true
  },
  immat: {
    type: String,
    optional: true
  },
  from: {
    type: String,
    regEx: /^[A-Z]{3}$/
  },
  to: {
    type: String,
    regEx: /^[A-Z]{3}$/
  },
  tz: {
    type: String
  },
  fonction: {
    type: String,
    regEx: /^[A-Z]{3}$/
  },
  remarks: {
    type: String,
    optional: true
  },
  real: {
    type: Object,
    optional: true
  },
  'real.start': {
    type: SimpleSchema.Integer, // Datetime timestamp
  },
  'real.end': {
    type: SimpleSchema.Integer, // Datetime timestamp
  }
})

volSchema.extend(eventSchema)

export { volSchema }