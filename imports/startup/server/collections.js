import moment from 'moment'
import _ from 'lodash'
import '/imports/lib/moment-ejson.js'
import { Mongo } from 'meteor/mongo'

const momentFields = ['created', 'start', 'end', 'real.start', 'real.end']

class EventsCollection extends Mongo.Collection {
	insert(evt, callback) {
		_.forEach(momentFields, path => {
			if (_.has(evt, path)) {
				const date = _.get(evt, path)
				if (moment.isMoment(date)) {
					_.set(evt, path, date.valueOf())
				}
			}
		})
		return super.insert(evt, callback)
	}
}

Events = new EventsCollection('cloud_events')

HV100 = new Static.Collection('HV100%')
HV100AF = new Static.Collection('HV100AF')
PN = new Static.Collection('pn')
Airports = new Static.Collection('airports')
