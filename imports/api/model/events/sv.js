import SimpleSchema from 'simpl-schema'
import { eventSchema } from './event.js'
import { mepSchema } from './mep.js'
import { volSchema } from './vol.js'

const svSchema = new SimpleSchema({
  rotationId: {
    type: String,
  },
  tag: {
    type: String,
    allowedValues: ['sv', 'mep']
  },
  events: {
    type: Array
  },
  'events.$': {
    type: SimpleSchema.oneOf(mepSchema, volSchema),
  },
  pnt: {
    type: Array,
    optional: true
  },
  'pnt.$': {
    type: String,
    regEx: /^[A-Z]{3}$/
  },
  pnc: {
    type: Array,
    optional: true
  },
  'pnc.$': {
    type: String,
    regEx: /^[A-Z]{3}$/
  },
  instruction: {
    type: Array,
    optional: true
  },
  hotel: {
    type: String,
    optional: true
  }
})

svSchema.extend(eventSchema)

export { svSchema }