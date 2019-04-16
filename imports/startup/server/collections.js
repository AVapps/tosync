import moment from 'moment';
import _ from 'lodash';
import '../../lib/moment-ejson.js';

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
		if (doc.real) {
			doc.real.start = moment(doc.real.start);
			doc.real.end = moment(doc.real.end);
		}
		return _.extend(doc, {
			start: moment(doc.start),
			end: moment(doc.end)
		});
	}
});

HV100 = new Static.Collection('HV100%');
PN = new Static.Collection('pn');
Airports = new Static.Collection('airports');

// console.log('CLEARING DB: ', Events.remove({}));
