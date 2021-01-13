import SimpleSchema from 'simpl-schema'
import { solSchema } from './sol.js'
import { dutySubEventSchema } from './dutySubEvent.js'

const dutySchema = new SimpleSchema({
  tag: {
    type: String,
    allowedValues: [ 'duty' ]
  },
  events: {
    type: Array
  },
  'events.$': {
    type: dutySubEventSchema
  },
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
  hotel: {
    type: String,
    optional: true
  }
})

dutySchema.extend(solSchema)

export { dutySchema }