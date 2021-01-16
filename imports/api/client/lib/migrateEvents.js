import _ from 'lodash'

export const migrateEvents =  async (start, end) => {
  const currentEvents = await Events.getInterval(start, end)
  const updateLog = { insert: [], remove: [], update: [] }

  // Regroupe les évènements qui ont été divisés par APM
  let memo = {}
  _.forEach(currentEvents, (evt, index) => {
    if (index > 0 && memo && memo.prev) {
      console.log(evt.category, evt.summary, memo.prev.category, memo.prev.summary)
      if (evt.category === memo.prev.category
        && evt.summary === memo.prev.summary
        && evt.start.valueOf() - memo.prev.end.valueOf() <= 60000) {
          if (!memo.updateId) {
            memo.updateId = memo.prev._id
          }
          memo.end = evt.end.valueOf()
          updateLog.remove.push(evt)
      } else if (memo.updateId && memo.end) {
        updateLog.update.push({ evt, selector: { _id: memo.updateId }, modifier: { $set: { end: memo.end }}})
        memo.updateId = null
        memo.end = null
      }
    }
    memo.prev = evt
  })
  if (memo.updateId && memo.end) {
    updateLog.update.push({ evt: memo.prev, selector: { _id: memo.updateId }, modifier: { $set: { end: memo.end } } })
  }

  // Met à jour les rotations vers le nouveau format
  const vols = _.filter(currentEvents, evt => ['vol', 'mep'].includes(evt.tag))
  if (vols.length) {
    const rotations = _.groupBy(vols, 'rotationId')
    console.log(rotations)
  }


  return updateLog
}

export const needsMigration = (events) => {
  return !!_.find(events, evt => {
    return (evt.tag === 'vol')
      || (evt.tag === 'mep' && !_.has(evt, 'events'))
      || (evt.tag === 'autre' && evt.category === 'NPL')
  })
}