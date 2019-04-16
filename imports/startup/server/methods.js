import moment from 'moment';
import '../../lib/moment-ejson.js';
import { TOConnect as Connect } from '../../api/toconnect/server/TOConnect';

Meteor.methods({
	xlsx: function (pnt) {
		this.unblock();
		if (pnt) return Assets.getBinary('ep4.xlsx');
		return Assets.getBinary('ep4pnc.xlsx');
	},

	getPlanning: function () {
		check(this.userId, Match.OneOf(String, Object));
		this.unblock();
		return Connect.getPlanning(this.userId);
	},

	getActivitePN: function () {
		check(this.userId, Match.OneOf(String, Object));
		this.unblock();
		return Connect.getActivitePN(this.userId);
	},

	getSyncData: function () {
		check(this.userId, Match.OneOf(String, Object));
		this.unblock();
		return Connect.getSyncData(this.userId);
	},

	checkSession: function () {
		if (!this.userId) return false;
		this.unblock();
		return Connect.checkSession(this.userId);
	},

	findBlockHours: function (numVols) {
		check(numVols, Array);
		var map = {};

		this.unblock();

		_.forEach(numVols, function (num) {
			var found = Events.findOne({num: num}, {sort: [['start', 'desc']]});
			if (found) {
				map[num] = _.chain(found)
					.pick('block', 'tz', 'summary')
					.extend({
						'start': {hour: found.start.hour(), minute: found.start.minute()},
						'end': {hour: found.end.hour(), minute: found.end.minute()}
					})
					.value();
			}
		});

		return map;
	},

	updateEvents: function (updated) {
		check(this.userId, Match.OneOf(String, Object));
		var result = [];
		for (var i = 0; i < updated.length; i++) {
			// var obj = {}, item = updated[i];
			// obj[item._id] = Events
			// 	.update({
			// 		_id: item._id,
			// 		userId: this.userId
			// 	}, {
			// 		'$set': item.set
			// 	});
			// result.push(obj);

			// TODO : Cannot update with custom EJSON objects, need to wait for MongoDB 2.5.2 for a fix
			//        Until then remove then re-insert
			var item = updated[i];
			result.push({
				_id: item._id,
				deleted: Events.remove({_id: item._id, userId: this.userId}),
				inserted: Events.insert(_.extend(item.doc, {userId: this.userId}))
			});
		}
		return result;
	},

	clearInterval: function (start, to) {
		check(this.userId, Match.OneOf(String, Object));
		start.startOf('day');
		to.endOf('day');
		return Events.remove({
			userId: this.userId,
			start: { $lte : to.valueOf() },
			end: { $gte : start.valueOf() }
		});
	},

	getEventsRightBefore: function (date) {
		check(this.userId, Match.OneOf(String, Object));
		return Events.find({
			userId: this.userId,
			start: {
				$gte: date.clone().startOf('day').subtract(7, 'days').valueOf(),
				$lt: date.valueOf()
			}
		}, {
			sort: [['start', 'asc']]
		}).fetch();
	},

	getEvents: function (start, end) {
		check(this.userId, Match.OneOf(String, Object));
		let query;
		if (moment.isMoment(start) && moment.isMoment(end) && start.isBefore(end)) {
			query = {
				userId: this.userId,
				start: {
					$lte: end.valueOf()
				},
				end: {
					$gte: start.valueOf()
				}
			};
		} else if (moment.isMoment(start) && !end) {
			query = {
				userId: this.userId,
				end: {
					$gte: start.valueOf()
				}
			};
		} else {
			throw new Meteor.Error(500, "Requète invalide !");
		}

		if (query) {
			return Events.find(query, {
				sort: [['start', 'asc'], ['end', 'desc']]
			}).fetch();
		}
	},

	getRotation: function (rotationId) {
		check(this.userId, Match.OneOf(String, Object));
		const rotation = Events.findOne({
			_id: rotationId,
			userId: this.userId
		});

		if (rotation) {
			rotation.vols = Events.find({ rotationId }, { sort: [['start', 'asc']]}).fetch();
			return rotation;
		} else {
			throw new Meteor.Error(403, "Non autorisé !");
		}
	},

	getAllEventsOfMonth: function (month) {
		const m = moment(month);
		const monthStart = moment(month).startOf('month'), monthEnd = moment(month).endOf('month');

		const overlapStart = Events.findOne({
			userId: this.userId,
			start: { $lt: monthStart.valueOf() },
			end: { $gte: monthStart.valueOf() }
		}, { sort: [['start', 'asc']] });

		const overlapEnd = Events.findOne({
			userId: this.userId,
			start: { $lte: monthEnd.valueOf() },
			end: { $gt: monthEnd.valueOf() }
		}, { sort: [['end', 'desc']] });

		const queryStart = overlapStart ? overlapStart.start : monthStart;
		const queryEnd = overlapEnd ? overlapEnd.end : monthEnd;

		console.log(overlapStart, overlapEnd, queryStart.format(), queryEnd.format());

		return Events.find({
			userId: this.userId,
			start: { $lte: queryEnd.valueOf() },
			end: { $gte: queryStart.valueOf() }
		}, {
			sort: [['start', 'asc'], ['end', 'desc']]
		}).fetch();
	},

	batchEventsRemove: function (ids) {
		check(this.userId, Match.OneOf(String, Object));
		return Events.remove({
			_id: {
				'$in': ids
			},
			userId: this.userId
		});
	},

	batchEventsInsert: function (events) {
		check(this.userId, Match.OneOf(String, Object));
		check(events, Array);
		this.unblock();
		// var result = [];
		// for (var i = 0; i < events.length; i++) {
		// 	result.push( Events.insert(_.extend(events[i], {userId: this.userId})) );
		// }
		// return result;
		return Events.batchInsert(events.map(function(evt) { return _.extend(evt, {userId: this.userId}) }));
	}
});
