import SimpleSchema from 'simpl-schema'
import { eventSchema } from './event.js'

const rotationSchema = new SimpleSchema({
  tag: {
    type: String,
    allowedValues: ['rotation']
  },
  base: {
    type: String,
    regEx: /^[A-Z]{3}$/,
    optional: true
  },
})

rotationSchema.extend(eventSchema)

export { rotationSchema }