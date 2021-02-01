import SimpleSchema from 'simpl-schema'
import { solSchema } from './sol.js'
import { dutySubEventSchema } from './dutySubEvent.js'
import { mepSchema } from './mep.js'
import { groundCrewSchema } from './peq.js'
import { instructionSchema } from './instruction.js'

const dutySchema = new SimpleSchema({
  events: {
    type: Array
  },
  'events.$': {
    type: SimpleSchema.oneOf(mepSchema, dutySubEventSchema)
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
dutySchema.extend(groundCrewSchema)
dutySchema.extend(instructionSchema)

export { dutySchema }