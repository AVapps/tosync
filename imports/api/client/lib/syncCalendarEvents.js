import { Meteor } from 'meteor/meteor';
import PlanningParser from './PlanningParser.js';
import Utils from './Utils.js';
import _ from 'lodash';
import moment from 'moment';

export default {
    syncCalendarEvents(events, options = {}) {
        _.defaults(options, {
            restrictToLastEventEnd: true
        })

        if (!Meteor.userId() || !events.length) return false;

        events = _.filter(events, evt => {
            if (evt.end && moment.isMoment(evt.end)) {
                return true;
            } else {
                console.log('end is not a Moment !', evt);
                return false;
            }
        });

        const planning = new PlanningParser(events)

        const first = planning.firstEvent(),
            last = planning.lastEvent(),
            hasSols = !!planning.sols.length;

        console.log('syncCalendarEvents', events, planning, first, last, hasSols)

        Meteor.call('getEvents', first.start.valueOf(), options.restrictToLastEventEnd ? last.end.valueOf() : false, (error, savedEvents) => {
            if (error) {
                Notify.error(error);
            } else if (savedEvents && savedEvents.length) {
                console.log(savedEvents)
                console.time('syncEvents');
                const now = moment();
                const savedEventsByTag = _.groupBy(savedEvents, 'tag');
                const updateLog = {
                    insert: [],
                    insertRotations: [],
                    update: [],
                    addToRotation: [],
                    remove: []
                };
                const foundIds = [];

                _.forEach(planning.rotations, rot => {
                    const oldRot = findEvent(rot, savedEventsByTag);
                    if (oldRot) {
                        foundIds.push(oldRot._id);
                        // console.log('! FOUND Rotation !', rot.tag, rot.start.format(), rot.end.format(), rot, oldRot);
                        _.forEach(rot.vols, vol => {
                            const oldVol = findEvent(vol, savedEventsByTag);
                            if (oldVol) {
                                // console.log('! FOUND Vol !', vol, oldVol);
                                foundIds.push(oldVol._id);

                                if (vol.tag === 'vol' && (vol.end.isBefore(now) || vol.end.isSame(now, 'minute'))) {
                                    if (_.has(oldVol, 'real.start') && _.has(oldVol, 'real.end')) {
                                        vol = _.extend(_.omit(vol, 'start', 'end'), { real: _.pick(vol, 'start', 'end') });
                                        if (!_.isMatchWith(oldVol, _.extend(_.omit(vol, 'uid'), { rotationId: oldRot._id }), matchMoment)) {
                                            // console.log('DOES NOT MATCH: update');
                                            vol.rotationId = oldRot._id;
                                            // Si le vol est réalisé : mise à jour des heures réalisées
                                            updateLog.update.push({
                                                _id: oldVol._id,
                                                modifier: {
                                                    $set: _.omit(_normalizeEvent(vol), 'svIndex')
                                                }
                                            });
                                        }
                                    } else if (!_.isMatchWith(oldVol, _.extend(_.omit(vol, 'uid'), { rotationId: oldRot._id }), matchMoment)) {
                                        vol = _.extend(_.omit(vol, 'start', 'end'), { real: _.pick(vol, 'start', 'end') });
                                        // console.log('DOES NOT MATCH: update');
                                        vol.rotationId = oldRot._id;
                                        // Si le vol est réalisé : mise à jour des heures réalisées
                                        updateLog.update.push({
                                            _id: oldVol._id,
                                            modifier: {
                                                $set: _.omit(_normalizeEvent(vol), 'svIndex')
                                            }
                                        });
                                    }
                                } else if (!_.isMatchWith(oldVol, _.extend(_.omit(vol, 'uid'), { rotationId: oldRot._id }), matchMoment)) {
                                    // console.log('DOES NOT MATCH: update');
                                    vol.rotationId = oldRot._id;
                                    // Mise à jour des heures programmées
                                    updateLog.update.push({
                                        _id: oldVol._id,
                                        modifier: {
                                            $set: _.omit(_normalizeEvent(vol), 'svIndex')
                                        }
                                    });
                                }
                            } else {
                                // console.log('NOT FOUND Vol', vol);
                                vol.rotationId = oldRot._id;
                                updateLog.addToRotation.push(_setVolDefaults(vol));
                            }
                        });

                        // Rotation programmée
                        if (oldRot.start.isAfter(now)) {
                            // Si la rotation est incluse dans le planning: mise à jour de l'heure de début et de fin.
                            if (oldRot.start >= first.start && (!options.restrictToLastEventEnd || oldRot.end <= last.end)) {
                                if (!_.isMatchWith(oldRot, _.pick(rot, 'start', 'end', 'base'), matchMoment)) {
                                    updateLog.update.push({
                                        _id: oldRot._id,
                                        modifier: {
                                            $set: _normalizeEvent(_.pick(rot, 'start', 'end', 'base'))
                                        }
                                    });
                                }
                            // Si l'heure de début de la rotation est antérieure au planning courant : mise à jour de l'heure de fin uniquement
                            } else if (oldRot.start < first.start && !oldRot.end.isSame(rot.end)) {
                                updateLog.update.push({
                                    _id: oldRot._id,
                                    modifier: {
                                        $set: { end: rot.end.valueOf() }
                                    }
                                });
                            // Si l'heure de fin de la rotation est postérieure au planning : mise à jour de l'heure de début uniquement en fonction du mode
                            } else if (oldRot.end > last.end && !oldRot.start.isSame(rot.start)) {
                                updateLog.update.push({
                                    _id: oldRot._id,
                                    modifier: {
                                        $set: { start: rot.start.valueOf() }
                                    }
                                });
                            }
                        }
                    } else {
                        // Inserer la rotation et les vols
                        // console.log('* Not FOUND Rotation *', rot.tag, rot.start.format(), rot.end.format(), rot);
                        updateLog.insertRotations.push(rot);
                    }
                });

                if (hasSols) {
                    _.forEach(planning.sols, evt => {
                        const found = findEvent(evt, savedEventsByTag);
                        if (found) {
                            foundIds.push(found._id);
                            console.log('FOUND Event', evt.tag, evt.category, evt.summary, evt.start.format(), evt.end.format(), evt, found);
                            if (_.isMatchWith(found, _.pick(evt, 'category', 'summary', 'description', 'start', 'end'), matchMoment)) {
                                console.log('MATCHES: nothing to update');
                            } else {
                                console.log('DOES NOT MATCH: update');
                                updateLog.update.push({ _id: found._id, modifier: { $set: _normalizeEvent(evt) }});
                            }
                        } else {
                            console.log('Not FOUND Event', evt.tag, evt.category, evt.summary, evt.start.format(), evt.end.format(), evt);
                            updateLog.insert.push(evt);
                        }
                    });
                }

                // Suppression des évènements non trouvés
                updateLog.remove = _.chain(savedEvents)
                    .map('_id')
                    .difference(foundIds)
                    .value();

                console.timeEnd('syncEvents');

                console.log(updateLog);

                // 1. Remove unfounds
                if (updateLog.remove && updateLog.remove.length) {
                    Meteor.call('batchEventsRemove', updateLog.remove, function (error, result) {
                        if (error) {
                            Notify.error(error);
                        } else {
                            if (result !== updateLog.remove.length) {
                                Notify.warn("Attention", "Des évènements n'ont pas été supprimés ! (Sync::importEvents)");
                            }
                            if (updateLog.addToRotation.length) {
                                _recomputeRotations(updateLog.addToRotation);
                            }
                        }
                    });
                } else if (updateLog.addToRotation.length) {
                    _recomputeRotations(updateLog.addToRotation);
                }

                // 2. Insert new events
                _saveRotations(updateLog.insertRotations);
                _insertEvents(updateLog.insert);

                // 3. Update existing events if needed
                _.forEach(updateLog.update, update => Events.update(update._id, _setUpdateTime(update.modifier, now.valueOf())));

            } else {
              console.log('No saved events : inserting !', planning)
                _saveParsedPlanning(planning);
            }
        });
    },

    syncPastEvents(events) {
        if (!Meteor.userId() || !events.length) return false;

        events = _.filter(events, evt => {
            if (evt.end && moment.isMoment(evt.end)) {
                return true;
            } else {
                console.log('end is not a Moment !', evt);
                return false;
            }
        });

        events = _.sortBy(events, 'start');

        const first = _.first(events),
            last = _.last(events);

        Meteor.call('getEvents', first.start.valueOf(), last.end.valueOf(), (error, savedEvents) => {
            if (error) {
                Notify.error(error);
            } else if (savedEvents && savedEvents.length) {
                console.time('syncEvents');
                const now = moment();
                const savedEventsByTag = _.groupBy(savedEvents, 'tag');
                const updateLog = {
                    insert: [],
                    insertRotations: [],
                    update: [],
                    addToRotation: [],
                    remove: []
                };
                const foundIds = [], notFounds = [], eventsToParse = [];

                _.forEach(events, evt => {
                    const vol = findEvent(evt, savedEventsByTag);
                    if (vol) {
                        // console.log('! FOUND Vol !', vol, oldVol);
                        foundIds.push(vol._id);
                        foundIds.push(vol.rotationId);
                        evt = { real: _.pick(evt, 'start', 'end') };

                        if (!_.isMatchWith(vol, evt, matchMoment)) {
                            // mise à jour des heures réalisées
                            updateLog.update.push({
                                _id: vol._id,
                                modifier: {
                                    $set: _.pick(_normalizeEvent(evt), 'real')
                                }
                            });
                        }
                    } else if (_.has(savedEventsByTag, 'rotation')) {
                        // Find corresponding rotation
                        const rotation = _.find(savedEventsByTag['rotation'], rot => {
                            return evt.start.isSame(rot.start)
                                || (evt.start.isBefore(rot.end) && evt.end.isAfter(rot.start))
                                || evt.end.isSame(rot.end);
                        });
                        if (rotation) {
                            evt.rotationId = rotation._id;
                            foundIds.push(rotation._id);
                            updateLog.addToRotation.push(_setVolDefaults(evt));
                        } else {
                            eventsToParse.push(_setVolDefaults(evt))
                        }
                    } else {
                        eventsToParse.push(_setVolDefaults(evt))
                    }
                });

                if (eventsToParse.length) {
                    const planning = new PlanningParser(eventsToParse);
                    updateLog.insertRotations = planning.rotations;
                }

                // Les données activitePN ne comportent que les vols : suppression des vols non trouvés et des activités remplacées par des vols uniquement.
                updateLog.remove = _.chain(savedEvents)
                    .filter(evt => _.includes(['rotation', 'vol'], evt.tag))
                    .map('_id')
                    .difference(foundIds)
                    .value();

                const activiteSolsToRemove = [];
                const savedActiviteSols = _.filter(savedEvents, evt => !_.includes(['rotation', 'vol', 'mep'], evt.tag));
                _.forEach(updateLog.insertRotations, rotation => {
                    _.forEach(savedActiviteSols, evt => {
                        if (evt.start.isSame(rotation.start, 'day')
                        || evt.start.isSame(rotation.end, 'day')
                        || ( evt.start.isBefore(rotation.end, 'day') && evt.start.isAfter(rotation.start, 'day'))) {
                            activiteSolsToRemove.push(evt._id);
                        }
                    });
                });

                updateLog.remove = _.concat(updateLog.remove, _.uniq(activiteSolsToRemove));

                console.timeEnd('syncEvents');

                console.log(updateLog);

                // 1. Remove unfounds
                if (updateLog.remove && updateLog.remove.length) {
                    Meteor.call('batchEventsRemove', updateLog.remove, (error, result) => {
                        if (error) {
                            Notify.error(error);
                        } else {
                            if (result !== updateLog.remove.length) {
                                Notify.warn("Attention", "Des évènements n'ont pas été supprimés ! (Sync::importEvents)");
                            }
                            if (updateLog.addToRotation.length) {
                                _recomputeRotations(updateLog.addToRotation);
                            }
                        }
                    });
                } else if (updateLog.addToRotation.length) {
                    _recomputeRotations(updateLog.addToRotation);
                }

                // 2. Insert new events
                _saveRotations(updateLog.insertRotations);
                _insertEvents(updateLog.insert);

                // 3. Update existing events if needed
                _.forEach(updateLog.update, update => Events.update(update._id, _setUpdateTime(update.modifier, now.valueOf())));

            } else {
                const planning = new PlanningParser(events);
                _saveParsedPlanning(planning);
            }
        });
    },

    reparseEvents(events) {
        events.forEach((evt, index) => console.log(index, evt.slug))

        // Update tag of events
        const slugs = []
        _.forEach(events, evt => {
            if (evt.category) {
                const tag = Utils.findTag(evt.category)
                if (tag !== evt.tag) {
                    evt.tag = tag
                    evt.slug = Utils.slug(evt)
                    if (!_.includes(slugs, evt.slug)) {
                        console.log("UPDATING event tag", evt.slug, tag)
                        slugs.push(evt.slug)
                        Events.update(evt._id, {
                            $set: {
                                tag: evt.tag,
                                slug: evt.slug
                            }
                        })
                    }
                }
            }
        })

        const eventsWithoutRotations = _.reject(events, { tag: 'rotation' })
        const duplicatesFree = _.uniqBy(eventsWithoutRotations, 'slug')
        const toRemove = _.difference(_.map(events, '_id'), _.map(duplicatesFree, '_id'))

        console.log(duplicatesFree, toRemove)

        console.log("---- EVENTS without DUPLICATES -----")
        duplicatesFree.forEach((evt, index) => console.log(index, evt.slug))

        console.log("---- EVENTS TO REMOVE -----")
        toRemove.forEach((evt, index) => console.log(index, evt))

        // Removes duplicates and rotations
        if (toRemove && toRemove.length) {
            Meteor.call('batchEventsRemove', toRemove, (error, result) => {
                if (error) {
                    Notify.error(error)
                } else {
                    if (result !== toRemove.length) {
                        Notify.warn("Attention", "Des évènements n'ont pas été supprimés ! (Sync::importEvents)")
                    }
                    update()
                }
            });
        } else {
            update()
        }

        function update() {
            const planning = new PlanningParser(duplicatesFree)
            const now = +moment()

            console.log(planning)

            _.forEach(planning.rotations, rot => {
                rot.created = now;
                const rotationId = Events.insert(_completeEvent(_.omit(rot, 'vols', 'services')))
                if (rotationId) {
                    const results = _.map(rot.vols, vol => {
                        return Events.update(vol._id, {
                            $set: {
                                updated: now,
                                rotationId,
                                svIndex: vol.svIndex
                            }
                        })
                    })
                    console.log('Rotation ids updated for :', rot.vols, results)
                } else {
                    Notify.error('Impossible de sauvegarder la rotation du ' + moment(rotation.start).format('LL'));
                    return
                }
            })
        }
    },

    recomputeExistingRotation(rotationId) {
        return _recomputeExistingRotation(rotationId)
    },

    recomputeRotations(events, created = +moment()) {
        return _recomputeRotations(events, created)
    }
};

function findEvent(evt, eventsByTag) {
    if (!_.has(eventsByTag, evt.tag)) return

    const found = _.find(eventsByTag[evt.tag], { slug: Utils.slug(evt) })

    if (found) {
        // console.log('> FOUND BY SLUG <');
        return found
    }

    switch (evt.tag) {
        case 'vol':
            return _.find(eventsByTag[evt.tag], sevt => {
                return sevt.num == evt.num
                    && sevt.from == evt.from
                    // && sevt.to == evt.to
                    && ( sevt.start.isSame(evt.start, 'day') || Math.abs(sevt.start.diff(evt.start, 'hours', true)) <= 10 );
            });
        case 'mep':
            return _.find(eventsByTag[evt.tag], sevt => {
                return sevt.from == evt.from
                    && sevt.to == evt.to
                    && ( sevt.start.isSame(evt.start, 'day') || Math.abs(sevt.start.diff(evt.start, 'hours', true)) <= 10 );
            });
        case 'rotation':
            return _.find(eventsByTag[evt.tag], sevt => {
                return sevt.start.isSame(evt.start, 'day')
                    || sevt.end.isSame(evt.end, 'day')
                    || Math.abs(sevt.start.diff(evt.start, 'hours', true)) <= 10
                    || Math.abs(sevt.end.diff(evt.end, 'hours', true)) <= 10;
            });
        case 'repos':
        case 'conges':
        case 'maladie':
        case 'greve':
            return _.find(eventsByTag[evt.tag], sevt => {
                return sevt.start.isSame(evt.start, 'day');
            });
        default:
            return _.find(eventsByTag[evt.tag], sevt => {
                return sevt.summary == evt.summary && sevt.start.isSame(evt.start, 'day');
            });
    }
}

function matchMoment(objValue, srcValue, key, object, source) {
    if (moment.isMoment(objValue) && moment.isMoment(srcValue)) return objValue.isSame(srcValue);
}

function _completeEvent(evt, created = +moment(), userId = Meteor.userId()) {
    if (!evt.created) evt.created = created;
    if (!evt.userId) evt.userId = userId;
    evt.slug = Utils.slug(evt);
    return _normalizeEvent(evt);
}

function _setVolDefaults(vol) {
    return _.defaults(vol, {
        // category: 'FLT',
        // tag: 'vol',
        description: "",
        summary: "",
        remark: "",
        // pnt: [],
        // pnc: [],
        fonction: vol.fonction || _.get(Meteor.user(), 'profile.fonction') || "",
        type: "73H",
        tz: ""
    });
}

function _normalizeEvent(evt) {
    _.forEach(['start', 'end', 'real.start', 'real.end'], path => {
        const value = _.get(evt, path);
        if (value && moment.isMoment(value)) _.set(evt, path, value.valueOf());
    });
    return evt;
}

function _setUpdateTime(mod, updated = +moment()) {
    _.set(mod, '$set.updated', updated);
    return mod;
}

function _saveRotation(rotation, created = +moment()) {
    rotation.created = created;
    const rotationId = Events.insert(_completeEvent(rotation));
    if (rotationId) {
        const vols = _.map(rotation.vols, v => _.extend(v, { rotationId }));
        return [rotationId].concat(_insertEvents(vols, created));
    } else {
        Notify.error('Impossible de sauvegarder la rotation du ' + moment(rotation.start).format('LL'));
        return;
    }
}

function _saveRotations(rotations, created = +moment()) {
    const ids = _insertEvents(_.map(rotations, r => _.omit(r, 'vols', 'services')), created);
    const vols = _.reduce(rotations, function (list, rotation, index) {
        const rotationId = ids[index];
        if (rotationId) {
            _.forEach(rotation.vols, v => v.rotationId = rotationId);
            return list.concat(rotation.vols);
        } else {
            Notify.error('Impossible de sauvegarder la rotation du ' + rotation.start.format('LL'));
            return list;
        }
    }, []);
    return _insertEvents(vols, created);
}

function _recomputeExistingRotation(rotationId) {
    Meteor.call('getRotation', rotationId, (error, rotation) => {
        if (error) {
            Notify.error(error);
        } else if (rotation && _.isArray(rotation.vols)) {
            const planning = new PlanningParser(rotation.vols);
            if (planning.rotations && planning.rotations.length === 1) {
                const recompRotation = planning.rotations[0];
                // Update rotation
                Events.update(rotationId, {
                    $set: {
                        slug: Utils.slug(recompRotation),
                        start: recompRotation.start.valueOf(),
                        end: recompRotation.end.valueOf(),
                        base: recompRotation.base
                    }
                });

                // Update du svIndex des vols existants
                _.forEach(recompRotation.vols, vol => {
                    if (vol._id) Events.update(vol._id, { $set: _.pick(vol, 'svIndex')});
                });
            } else {
                console.log("Impossible de recalculer la rotation avec les nouveaux vols !");
            }
        }
    });
}

function _recomputeRotations(events, created = +moment()) {
    const rotations = _.groupBy(events, 'rotationId')
    _.forEach(rotations, (vols, rotationId) => {
      Meteor.call('getRotation', rotationId, (error, rotation) => {
            if (error) {
                Notify.error(error)
            } else if (rotation && _.isArray(rotation.vols)) {
                const planning = new PlanningParser(_.concat(rotation.vols, vols))
                if (planning.rotations && planning.rotations.length === 1) {
                    const toInsert = [],
                        recompRotation = planning.rotations[0]
                    // Update rotation
                    Events.update(rotationId, {
                        $set: {
                            slug: Utils.slug(recompRotation),
                            start: recompRotation.start.valueOf(),
                            end: recompRotation.end.valueOf(),
                            base: recompRotation.base
                        }
                    })

                    // Insert les vols ou update du svIndex des vols existants
                    _.forEach(recompRotation.vols, vol => {
                        if (vol._id) {
                            Events.update(vol._id, { $set: _.pick(vol, 'svIndex')})
                        } else {
                            toInsert.push(vol)
                        }
                    });
                    _insertEvents(toInsert, created)
                } else {
                    console.log("Impossible de recalculer la rotation avec les nouveaux vols !", vols, rotation)
                }
            }
        });
    });
}

function _saveParsedPlanning(planning, created = +moment()) {
    let toInsert = [];
    if (planning.rotations.length) {
        const ids = _insertEvents(_.map(planning.rotations, r => _.omit(r, 'vols', 'services')), created);
        toInsert = _.reduce(planning.rotations, function (list, rotation, index) {
            const rotationId = ids[index];
            if (rotationId) {
                _.forEach(rotation.vols, v => v.rotationId = rotationId);
                return list.concat(rotation.vols);
            } else {
                Notify.error('Impossible de sauvegarder la rotation du ' + rotation.start.format('LL'));
                return list;
            }
        }, []);
    }
    return _insertEvents(toInsert.concat(planning.sols), created);
}

function _insertEvents(events, created = +moment()) {
    if (!events.length) return true;
    const fulldays = [],
        toInsert = [];
    _.forEach(events, evt => {
        evt.created = created;
        if (evt.tag === 'conges' || evt.tag === 'repos' || evt.tag === 'maladie') {
            const day = evt.start.format('YYYY-MM-DD');
            if (_.includes(fulldays, day)) return;

            evt.start.startOf('day');
            evt.end.endOf('day');

            fulldays.push(day);
        }
        toInsert.push(_completeEvent(evt));
    });

    const inserted = Events.batchInsert(toInsert, function (error, result) {
      if (error) Notify.error(error)
    }) // Note: batchInsert method always returns empty result Array but client return is OK
    return inserted
}

function _deleteEvents(events) {
    if (!events.length) return true;
    const toDelete = events.map(function(evt) {return evt._id});
    Meteor.call('batchEventsRemove', toDelete, function (error, result) {
        if (error) {
            Notify.error(error);
        } else if (result !== events.length) {
            // Notify.warn("Attention", "Des évènements n'ont pas été supprimés ! (Sync::_deleteEvents)");
        }
    });
}
