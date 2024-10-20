import SimpleSchema from 'simpl-schema'
import Utils from '/Users/adrienv/Dev/tosync/tosync-meteor/imports/api/client/lib/Utils.js'

export const dutySubEventSchema = new SimpleSchema({
  tag: {
    type: String,
    allowedValues: Utils.tags
  },
  slug: {
    type: String,
  },
  start: {
    type: SimpleSchema.Integer, // Datetime timestamp
  },
  end: {
    type: SimpleSchema.Integer, // Datetime timestamp
  },

  // Optional fields
  category: {
    type: String,
    optional: true
  },
  summary: {
    type: String,
    optional: true
  },
  created: {
    type: SimpleSchema.Integer, // Datetime timestamp
    optional: true
  },
  updated: {
    type: SimpleSchema.Integer, // Datetime timestamp
    optional: true
  }
})