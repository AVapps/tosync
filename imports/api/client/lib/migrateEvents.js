import { Meteor } from 'meteor/meteor'
import _ from 'lodash'
import pify from 'pify'
import Utils from './Utils.js'
import { volSchema, mepSchema, solSchema } from '/imports/api/model/index.js'
import { getDutyStart, getDutyEnd } from '/imports/api/model/utils.js'
import { batchEventsRemove } from '/imports/api/methods.js'

export const migrateEvents =  async (currentEvents) => {
  const updateLog = { insert: [], remove: [], update: [] }
  factorEvents(currentEvents, updateLog)
  updateTags(currentEvents, updateLog)
  migrateRotations(currentEvents, updateLog)
  const result = await processUpdateLog(updateLog)
  return { updateLog, result }
}

export const migrateInterval = async (start, end) => {
  const currentEvents = await Events.getInterval(start, end)
  return migrateEvents(currentEvents)
}

export const needsMigration = (events) => {
  return !!_.find(events, evt => {
    return (evt.tag === 'vol')
      || (evt.tag === 'mep' && _.has(evt, 'svIndex'))
      || (evt.tag === 'autre' && evt.category === 'NPL')
  })
}

function migrateRotations(currentEvents, { insert, update, remove }) {
  const userId = Meteor.userId()
  const etapes = _.filter(currentEvents, evt => {
    return evt.tag === 'vol' || (evt.tag === 'mep' && _.has(evt, 'svIndex'))
  })
  if (etapes.length) {
    const svGroups = _.groupBy(etapes, 'rotationId')
    _.forEach(svGroups, (evts, rotationId) => {
      const svByIndex = _.groupBy(evts, 'svIndex')
      const svs = _.chain(svByIndex)
        .keys()
        .map(i => {
          const events = svByIndex[i]
          const sv = {
            tag: _.every(events, { tag: 'mep' }) ? 'mep' : 'sv',
            userId,
            rotationId,
            events: _.map(events, evt => {
              switch (evt.tag) {
                case 'vol':
                  return volSchema.clean(evt)
                case 'mep':
                  return mepSchema.clean(evt)
                default:
                  return solSchema.clean(evt)
              }
            }),
            start: getDutyStart(events),
            end: getDutyEnd(events)
          }

          const hasPNT = _.find(events, evt => evt.pnt && evt.pnt.length)
          if (hasPNT) {
            _.set(sv, 'peq.pnt', hasPNT.pnt)
          }
          const hasPNC = _.find(events, evt => evt.pnc && evt.pnc.length)
          if (hasPNC) {
            _.set(sv, 'peq.pnc', hasPNC.pnc)
          }

          sv.slug = Utils.slug(sv)
          remove.push(..._.map(events, '_id'))
          insert.push(sv)
          return sv
        })
        .sortBy('start')
        .value()
      
      const start = _.first(svs).start
      const end = _.last(svs).end
      update.push({
        _id: rotationId,
        modifier: {
          $set: {
            start,
            end,
            slug: Utils.slug({ tag: 'rotation', start, end })
          }
        }
      })
    })
  }
  return { insert, update, remove }
}

function factorEvents(currentEvents, { insert, update, remove }) {
  // Regroupe les évènements qui ont été divisés par APM
  let memo = {}
  _.forEach(currentEvents, (evt, index) => {
    if (index > 0 && memo && memo.prev) {
      if (evt.category === memo.prev.category
        && evt.summary === memo.prev.summary
        && evt.start - memo.prev.end <= 60000) {
        if (!memo.evt) {
          memo.evt = memo.prev
        }
        memo.end = evt.end
        remove.push(evt._id)
      } else if (memo.evt && memo.end) {
        memo.evt.end = memo.end
        update.push({
          _id: memo.evt._id,
          modifier: {
            $set: {
              end: memo.end,
              slug: Utils.slug(memo.evt)
            }
          }
        })
        memo.evt = null
        memo.end = null
      }
    }
    memo.prev = evt
  })

  if (memo.evt && memo.end) {
    memo.evt.end = memo.end
    update.push({
      _id: memo.evt._id,
      modifier: {
        $set: {
          end: memo.end,
          slug: Utils.slug(memo.evt)
        }
      }
    })
  }

  return { insert, update, remove }
}

function updateTags(currentEvents, { insert, update, remove }) {
  _.forEach(_.filter(currentEvents, { tag: 'autre' }), evt => {
    if (_.includes(remove, evt._id)) {
      return
    }
    if (evt.category) {
      const tag = Utils.findTag(evt.category)
      if (tag && tag !== 'autre') {
        const evtUpdate = _.find(update, { _id: evt._id })
        if (evtUpdate) {
          _.set(evtUpdate, 'modifier.$set.tag', tag)
          _.set(evtUpdate, 'modifier.$set.slug', Utils.slug(evt))
        } else {
          update.push({
            evt,
            _id: evt._id,
            modifier: { $set: { tag, slug: Utils.slug(evt) } }
          })
        }
      }
    }
  })
  return { insert, update, remove }
}

export const processUpdateLog = async (updateLog) => {
  const now = Date.now()
  const result = { startedAt: now }
  const pEvents = pify(Events, { include: ['insert', 'update'] })

  if (updateLog.insert && updateLog.insert.length) {
    const userId = Meteor.userId()
    result.inserted = await Promise.all(_.map(updateLog.insert, evt => {
      evt.userId = userId
      evt.created = now
      return pEvents.insert(evt)
    }))
  }

  if (updateLog.update && updateLog.update.length) {
    result.updated = await Promise.all(_.map(updateLog.update, upd => {
      _.set(upd.modifier, '$set.updated', now)
      return pEvents.update(upd._id, upd.modifier)
    }))
  }

  if (updateLog.remove && updateLog.remove.length) {
    result.removed = await batchEventsRemove.callPromise({ ids: updateLog.remove })
  }
  
  result.completedAt = Date.now()
  return result
}