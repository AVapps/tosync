import SimpleSchema from 'simpl-schema'
import { eventSchema } from './event.js'

const solSchema = new SimpleSchema({
  crew: {
    type: Array,
    optional: true
  },
  'crew.$': {
    type: String,
    regEx: /^[A-Z]{3}$/
  },
  instruction: {
    type: Array,
    optional: true
  },
  remarks: {
    type: String,
    optional: true
  },
})

solSchema.extend(eventSchema)

export { solSchema }