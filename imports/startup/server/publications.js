import moment from 'moment'
import '../../lib/moment-ejson.js'

Meteor.publish("cloud_events", function (start, end, userId) {
	return Events.find({
		userId: this.userId,
		end: {$gte: +start},
		start: {$lte: +end}
	})
})
