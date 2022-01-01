import { DateTime } from 'luxon'
import { Meteor } from 'meteor/meteor'
import { Match, check } from 'meteor/check'
import '/imports/lib/moment-ejson.js'
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
		const user = Meteor.user()
		if (_.has(user, 'isPNT.checkedAt')) {
			if (DateTime.local().diff(DateTime.fromMillis(_.get(user, 'isPNT.checkedAt'))).as('days') > 30) {
				const _isPNT = isPNT(this.userId)
				Meteor.users.update(this.userId, {
					$set: {
						isPNT: {
							checkedAt: +new Date(),
							value: _isPNT
						}
					}
				})
				return _isPNT
			} else {
				return _.get(user, 'isPNT.value')
			}
		} else {
			const _isPNT = isPNT(this.userId)
			Meteor.users.update(this.userId, {
				$set: {
					isPNT: {
						checkedAt: +new Date(),
						value: _isPNT
					}
				}
			})
			return _isPNT
		}
  },

	// start, end as timestamps
	getEvents(start, end) {
		check(this.userId, Match.OneOf(String, Object))
		check(start, Number)

		let query
		if (start < end) {
			query = {
				userId: this.userId,
				start: { $lte: end },
				end: { $gte: start }
			}
		} else if (start && !end) {
			query = {
				userId: this.userId,
				end: { $gte: start }
			}
		} else {
			throw new Meteor.Error('invalid-request', 'Requète invalide !')
		}

		if (query) {
			return Events.find(query, {
				sort: [['start', 'asc'], ['end', 'desc']]
			}).fetch()
		}
	},

	getRotation(rotationId) {
		check(this.userId, Match.OneOf(String, Object))
		const rotation = Events.findOne({
			_id: rotationId,
			userId: this.userId
		})

		if (rotation) {
			rotation.vols = Events.find({ rotationId }, { sort: [['start', 'asc']]}).fetch()
			return rotation
		} else {
			throw new Meteor.Error(403, 'Non autorisé !')
		}
	},

	getAllEventsOfMonth(month) {
		check(this.userId, Match.OneOf(String, Object));
		const monthStart = DateTime.fromObject(month).startOf('month').toMillis()
		const monthEnd = DateTime.fromObject(month).endOf('month').toMillis()

		const overlapStart = Events.findOne({
			userId: this.userId,
			start: { $lt: monthStart },
			end: { $gte: monthStart }
		}, { sort: [['start', 'asc']] })

		const overlapEnd = Events.findOne({
			userId: this.userId,
			start: { $lte: monthEnd },
			end: { $gt: monthEnd }
		}, { sort: [['end', 'desc']] })

		const queryStart = overlapStart ? overlapStart.start : monthStart
		const queryEnd = overlapEnd ? overlapEnd.end : monthEnd

		return Events.find({
			userId: this.userId,
			start: { $lte: queryEnd },
			end: { $gte: queryStart }
		}, {
			sort: [['start', 'asc'], ['end', 'desc']]
		}).fetch()
	}
})
