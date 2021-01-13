import SimpleSchema from 'simpl-schema'
import { eventSchema } from './event.js'

const mepSchema = new SimpleSchema({
  tag: {
    type: String,
    allowedValues: ['mep']
  },
  num: {
    type: String,
    optional: true
  },
  type: {
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
  }
})

mepSchema.extend(eventSchema)

export { mepSchema }