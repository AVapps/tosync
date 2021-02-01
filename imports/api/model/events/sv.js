import SimpleSchema from 'simpl-schema'
import { eventSchema } from './event.js'
import { mepSchema } from './mep.js'
import { volSchema } from './vol.js'
import { peqSchema } from './peq.js'
import { instructionSchema } from './instruction.js'

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
  hotel: {
    type: String,
    optional: true
  }
})

svSchema.extend(eventSchema)
svSchema.extend(peqSchema)
svSchema.extend(instructionSchema)

export { svSchema }