import SimpleSchema from 'simpl-schema'
import { mepSchema } from './mep.js'

const volSchema = new SimpleSchema({
  tag: {
    type: String,
    allowedValues: ['vol']
  },
  immat: {
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

volSchema.extend(mepSchema)

export { volSchema }