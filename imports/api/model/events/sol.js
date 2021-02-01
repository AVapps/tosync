import SimpleSchema from 'simpl-schema'
import { eventSchema } from './event.js'
import { groundCrewSchema } from './peq.js'
import { instructionSchema } from './instruction.js'

const solSchema = new SimpleSchema({
  remarks: {
    type: String,
    optional: true
  },
})

solSchema.extend(eventSchema)
solSchema.extend(groundCrewSchema)
solSchema.extend(instructionSchema)

export { solSchema }