import moment from 'moment'
import { Meteor } from 'meteor/meteor'
import '/imports/lib/moment-ejson.js'
import { TOConnect as Connect } from '/imports/api/toconnect/server/TOConnect'
import _ from 'lodash'

function isPNT(userId) {
  const events = Events.find({
    userId,
    tag: 'vol'
  }, {
    limit: 30,
    sort: [['updated', 'desc']],
    fields: { userId: 1, updated: 1, pnt: 1 }
  }).fetch()

  const username = Meteor.user().username
  const score = _.reduce(events, (result, evt) => {
    if (!_.isEmpty(evt.pnt)) {
      if (_.includes(evt.pnt, username)) {
        result.isPNT += 1
      } else {
        result.isNotPNT += 1
      }
    }
    return result
  }, { isPNT: 0, isNotPNT: 0 })

  return score.isPNT > score.isNotPNT
}

Meteor.methods({
	// xlsx: function (pnt) {
	// 	this.unblock();
	// 	if (pnt) return Assets.getBinary('ep4.xlsx');
	// 	return Assets.getBinary('ep4pnc.xlsx');
	// },

  getPayscale() {
    check(this.userId, Match.OneOf(String, Object))
    this.unblock()

    if (isPNT(this.userId)) {
      return {
        AF: Meteor.settings.remuAF,
        TO: Meteor.settings.remuTO
      }
    } else {
      return null
    }
  },

  isPNT() {
    check(this.userId, Match.OneOf(String, Object))
    // return false
    // Meteor._sleepForMs(3000)
    return isPNT(this.userId)
  },

	async getPlanning(type) {
		check(this.userId, Match.OneOf(String, Object))
		this.unblock()
		return Connect.getPlanning(this.userId, type)
	},

  async validateChanges() {
		check(this.userId, Match.OneOf(String, Object))
		this.unblock()
		return Connect.validateChanges(this.userId)
	},

  async signPlanning() {
		check(this.userId, Match.OneOf(String, Object))
		this.unblock()
		return Connect.signPlanning(this.userId)
	},

	async getActivitePN() {
		check(this.userId, Match.OneOf(String, Object))
		this.unblock()
		return Connect.getActivitePN(this.userId)
	},

	async getSyncData() {
		check(this.userId, Match.OneOf(String, Object))
		this.unblock()
		return Connect.getSyncData(this.userId)
	},

	async checkSession() {
		if (!this.userId) return false
		this.unblock()
		return Connect.checkSession(this.userId)
	},

	findBlockHours(numVols) {
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

	clearInterval(start, to) {
		check(this.userId, Match.OneOf(String, Object));
		start.startOf('day');
		to.endOf('day');
		return Events.remove({
			userId: this.userId,
			start: { $lte : to.valueOf() },
			end: { $gte : start.valueOf() }
		});
	},

	getEventsRightBefore(date) {
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

	getEvents(start, end) {
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
			throw new Meteor.Error(500, 'Requète invalide !');
		}

		if (query) {
			return Events.find(query, {
				sort: [['start', 'asc'], ['end', 'desc']]
			}).fetch();
		}
	},

	getRotation(rotationId) {
		check(this.userId, Match.OneOf(String, Object));
		const rotation = Events.findOne({
			_id: rotationId,
			userId: this.userId
		});

		if (rotation) {
			rotation.vols = Events.find({ rotationId }, { sort: [['start', 'asc']]}).fetch();
			return rotation;
		} else {
			throw new Meteor.Error(403, 'Non autorisé !');
		}
	},

	getAllEventsOfMonth(month) {
		check(this.userId, Match.OneOf(String, Object));
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

		// console.log(overlapStart, overlapEnd, queryStart.format(), queryEnd.format());

		return Events.find({
			userId: this.userId,
			start: { $lte: queryEnd.valueOf() },
			end: { $gte: queryStart.valueOf() }
		}, {
			sort: [['start', 'asc'], ['end', 'desc']]
		}).fetch();
	},

	batchEventsRemove(ids) {
		check(this.userId, Match.OneOf(String, Object));
		return Events.remove({
			_id: {
				'$in': ids
			},
			userId: this.userId
		});
	},

	batchEventsInsert(events) {
		check(this.userId, Match.OneOf(String, Object))
		check(events, Array)

    return _.map(events, evt => {
      evt.userId = this.userId
      return Events.insert(_.pick(evt, ['start', 'end', 'summary', 'description', 'uid', 'category', 'tag', 'fonction', 'type', 'pnt', 'pnc', 'remark', 'num', 'from', 'to', 'tz', 'svIndex', 'rotationId', 'created', 'userId', 'slug', 'updated', 'real.start', 'real.end', 'base', ]))
    })
	}
});
