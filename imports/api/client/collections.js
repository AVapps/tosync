import moment from 'moment';
import _ from 'lodash';

const momentFields = ['created', 'start', 'end', 'real.start', 'real.end'];
class EventsCollection extends Mongo.Collection {
	insert(evt, callback) {
		_.forEach(momentFields, path => {
			if (_.has(evt, path)) {
				const date = _.get(evt, path);
				if (moment.isMoment(evt)) {
					_.set(evt, path, date.valueOf());
				}
			}
		});
		return super.insert(evt, callback);
	}
}

Events = new EventsCollection('cloud_events', {
	transform: function (doc) {
		_.extend(doc, {
			start: moment(doc.start),
			end: moment(doc.end)
		});
		if (doc.real) {
			if (doc.real.start) doc.real.start = moment(doc.real.start);
			if (doc.real.end) doc.real.end = moment(doc.real.end);
		}
		return doc;
	}
});

HV100 = new Static.Collection('HV100%');
HV100.allowStaticImport(function () { return false });
PN = new Static.Collection('pn');
PN.allowStaticImport(function () { return false });
Airports = new Static.Collection('airports');
Airports.allowStaticImport(function () { return false });

Tracker.autorun(c => {
	if (Meteor.userId()) {
		console.log('Logged in : updating static data...');
		HV100.checkVersion();
		PN.checkVersion();
		Airports.checkVersion();
	}
});
