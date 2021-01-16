import { DateTime, Duration, Settings } from 'luxon'
import _ from 'lodash'
import PifyMeteor from './PifyMeteor'
import Utils from './Utils.js'

Settings.defaultLocale = 'fr'
Settings.defaultZoneName = 'Europe/Paris'

export default class PdfPlanningImporter {
  constructor(pdfPlanning) {
    this.parser = pdfPlanning
    this.savedEvents = []
    this.savedEventsByTag = {}
    this.importPlanning()
  }

  async importPlanning() {
    const first = _.first(this.parser.planning)
    const last = _.last(this.parser.planning)
    
    try {
      this.savedEvents = await PifyMeteor.call('getEvents', first.debut.toMillis(), last.fin.toMillis())
    } catch(e) {
      Notify.error(error)
      return
    }
    
    this.savedEventsByTag = _.groupBy(this.savedEvents, 'tag')
    console.log('PdfPlanningImport.importPlanning savedEvents', this.savedEvents, this.savedEventsByTag)

    this.foundIds = new Set()
    this.updateLog = {
      insert: [],
      update: [],
      remove: []
    }
    
    _.forEach(this.parser.planning, evt => {
      if (evt.tag === 'rotation') {
        this.importRotation(evt)
      } else if (_.has(evt, 'events')) {
        this.importDutySol(evt)
      } else {
        this.importSol(evt)
      }
    })
  }

  /**
   * Importe tout évènement qui n'est ni un vol, ni une rotation, ni une journée sol (composée de plusieurs évènements)
   * - si l'évènement existe => mettre à  jour
   * - sinon l'ajouter
   * @param {*} evt 
   */
  importSol(evt) {
    const found = this.findSavedEvent(evt)
    if (found) {
      this.foundIds.add(found._id)
      console.log('FOUND Event', evt.tag, evt.category, evt.summary, evt.start, evt.end, evt, found)
      if (_.isMatchWith(found, _.pick(evt, 'category', 'summary', 'description', 'start', 'end'), matchMoment)) {
        console.log('MATCHES: nothing to update')
      } else {
        console.log('DOES NOT MATCH: update')
        updateLog.update.push({ _id: found._id, modifier: { $set: _normalizeEvent(evt) } })
      }
    } else {
      console.log('Not FOUND Event', evt.tag, evt.category, evt.summary, evt.start, evt.end, evt)
      updateLog.insert.push(evt)
    }
  }

  importDutySol(duty) {

  }

  importRotation(rotation) {

  }



  findSavedEvent(evt) {
    if (!_.has(this.savedEventsByTag, evt.tag)) return undefined

    const found = _.find(this.savedEventsByTag[evt.tag], { slug: Utils.slug(evt) })

    found ? console.log('> FOUND BY SLUG <', evt, found) : console.log('>! NOT FOUND !<', evt, found)

    return found

    // switch (evt.tag) {
    //   case 'vol':
    //     return _.find(eventsByTag[evt.tag], sevt => {
    //       return sevt.num == evt.num
    //         && sevt.from == evt.from
    //         // && sevt.to == evt.to
    //         && (sevt.start.isSame(evt.start, 'day') || Math.abs(sevt.start.diff(evt.start, 'hours', true)) <= 10);
    //     });
    //   case 'mep':
    //     return _.find(eventsByTag[evt.tag], sevt => {
    //       return sevt.from == evt.from
    //         && sevt.to == evt.to
    //         && (sevt.start.isSame(evt.start, 'day') || Math.abs(sevt.start.diff(evt.start, 'hours', true)) <= 10);
    //     });
    //   case 'rotation':
    //     return _.find(eventsByTag[evt.tag], sevt => {
    //       return sevt.start.isSame(evt.start, 'day')
    //         || sevt.end.isSame(evt.end, 'day')
    //         || Math.abs(sevt.start.diff(evt.start, 'hours', true)) <= 10
    //         || Math.abs(sevt.end.diff(evt.end, 'hours', true)) <= 10;
    //     });
    //   case 'repos':
    //   case 'conges':
    //   case 'maladie':
    //   case 'greve':
    //     return _.find(eventsByTag[evt.tag], sevt => {
    //       return sevt.start.isSame(evt.start, 'day');
    //     });
    //   default:
    //     return _.find(eventsByTag[evt.tag], sevt => {
    //       return sevt.summary == evt.summary && sevt.start.isSame(evt.start, 'day');
    //     });
    // }
  }
}