import { DateTime, Duration, Settings } from 'luxon'
import moment from 'moment'
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

    const updateLog = {
      insert: [],
      update: [],
      remove: []
    }
    const founds = []

    _.forEach(this.parser.planning, evt => {


    })
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