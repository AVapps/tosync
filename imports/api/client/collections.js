import { Meteor } from 'meteor/meteor'
import { CachedCollection } from './lib/CachedCollection.js'
import { batchEventsRemove, getEventsInterval } from '/imports/api/methods.js'
import moment from 'moment'
import _ from 'lodash'

const momentFields = ['created', 'updated', 'start', 'end', 'real.start', 'real.end']

class EventsCollection extends CachedCollection {
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

	batchRemove(ids, cb) {
		return batchEventsRemove.call({ ids }, cb)
	}

	getInterval(start, end, cb) {
		return cb ? getEventsInterval.call({ start, end }, cb) : getEventsInterval.callPromise({ start, end })
	}
}

Events = new EventsCollection('cloud_events')

function isAdmin() {
  const user = Meteor.user()
  return user && user.username && user.username === Meteor.settings.public.adminUser
}

HV100 = new Static.Collection('HV100%')
HV100.allowStaticImport(() => isAdmin())
HV100AF = new Static.Collection('HV100AF')
HV100AF.allowStaticImport(() => isAdmin())
PN = new Static.Collection('pn')
PN.allowStaticImport(() => isAdmin())
Airports = new Static.Collection('airports')
Airports.allowStaticImport(() => isAdmin())

Tracker.autorun(c => {
	if (Meteor.userId()) {
		// console.log('Logged in : checking static data version...')
		HV100.checkVersion()
    HV100AF.checkVersion()
		PN.checkVersion()
		Airports.checkVersion()
	}
})
