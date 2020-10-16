import { DateTime, Duration, Settings } from 'luxon'
import _ from 'lodash'
import Utils from './Utils.js'

Settings.defaultLocale = 'fr'
Settings.defaultZoneName = 'Europe/Paris'

const BASES = [ 'ORY', 'CDG', 'LYS', 'MPL', 'NTE' ]
const FLIGHT_REG = /([A-Z]{3})\-([A-Z]{3})\s\(([A-Z]+)\)/
const MEP_REG = /([A-Z]{3})\-([A-Z]{3})/
const DATE_REG = /^\s[a-z]{3}\.\s(\d\d)\/(\d\d)\/(\d\d\d\d)/
const TIME_REG = /^\d\d:\d\d$/

export default class PdfPlanningParser {
  constructor(pdf, options) {
    this.options = _.defaults(options, {
      bases: BASES
    })
    this.events = []
    this.rotations = []
    this.sols = []
    this.planning = []
    this.meta = pdf.meta

    this.parse(pdf.table)
  }

  /***
   * (1) Parser les activités / repos / services
   * (2) Grouper les services de vol en rotation en déterminant la base d'arrivée au premier repos
   */
  parse(lines) {
    this.parseDuties(lines)
    this.groupRotations()
    this.factorSolDays()
    this.buildPlanning()
    this.printPlanning()
  }
  
  parseDuties(lines) {
    this._precDuty = null
    this._duty = null
    this._hotel = null
    this._date = null
    this._ground = null

    const rows = this.mapAndCorrectRows(lines)

    let i = 0
    while (i < rows.length) {
      const evt = rows[i]

      if (evt.type === 'date') {
        const m = evt.content.match(DATE_REG)
        this._date = DateTime.utc(parseInt(m[3]), parseInt(m[2]), parseInt(m[1]))
        if (/BLANC$/.test(evt.content)) {
          this.addBlanc()
        }
        i++
        continue
      }

      if (evt.header) {
        evt.activity = evt.activity.replace(/\s/g, '')
        evt.summary = evt.summary.replace(/\s+/g, ' ')

        if (evt.peq && evt.peq.length) {
          evt.peq = this._parsePeq(evt.peq)
        }

        if (evt.instruction) {
          const tasks = this._parseInstruction(evt.instruction)
          if (tasks && tasks.length) {
            const userTasks = _.remove(tasks, task => !_.isEmpty(task.fonction))
            evt.instruction = {}
            if (userTasks.length) evt.instruction.own = userTasks
            if (tasks && tasks.length) evt.instruction.other = tasks
          } else {
            console.log('! Impossible de parser le champ instruction:', evt.instruction)
          }
        }

        /*
          F = vol
          B = début SV
          D = fin SV
          G = sol
          E = end rest
          O,P = MEP
          T = train
          S = navette / taxi
          H = découcher
        */

        switch (evt.header) {
          case 'Begin Duty': // B
            this.beginDuty(evt)
            break
          case 'Duty Flight': // F
            this.addFlight(evt)
            break
          case 'DHD Flight': // O | P
          case 'Train': // T
          case 'Transfert': // S
            this.addMEP(evt)
            break
          case 'End Duty': // D
            this.endDuty(evt)
            break
          case 'End Rest': // E
            this.endRest(evt)
            break
          case 'Ground Act.': // G
            // if (!['ENGS', 'ENGST'].includes(event.activity))
            this.addGround(evt)
            break
          case 'HOTAC': // H
            this.addHotel(evt)
            break
          default:
            console.log(`Type Inconnu : ${header}`)
        }
      }
      i++
    }

    if (this._duty) {
      this.endDuty()
    }
  }

  mapAndCorrectRows(lines) {
    const rows = _.map(lines, (line, index) => {
      if (line.length === 1 && DATE_REG.test(line[0])) { // Ligne de Date
        return {
          type: 'date',
          index,
          content: line[0]
        }
      } else {
        return {
          type: 'event',
          index,
          header: line[0],
          start: line[1],
          end: line[2],
          activity: line[3],
          fonction: line[4],
          summary: line[5],
          typeAvion: line[6],
          tv: line[7],
          instruction: line[8],
          peq: line[9],
          remark: line[10]
        }
      }
    })

    let activityOffset = false
    let summaryOffset = false
    let followsDate = false
    let i = 0
    while (i < rows.length) {
      let row = rows[i]

      if (row.type === 'date') {
        followsDate = true
        i++
        continue
      }

      if (followsDate) { // La première ligne suivant une ligne de date est bien alignée
        activityOffset = 0
        summaryOffset = false
        followsDate = false
        i++
        continue
      }

      if (row.header) { // Seules les lignes ayant un entête sont traitées
        if (!activityOffset) {
          activityOffset = this.hasActivityOffset(row, i, rows)
        }

        if (activityOffset) {
          // console.log('! DECALAGE de ligne de code/numéro', row, row.activity)
          let prevActivity
          if (row.activity.indexOf('\n') !== -1) {
            // console.log('ACTIVITY has newline', row.activity)
            const split = row.activity.split('\n')
            prevActivity = split.shift()
            row.activity = split.join('\n')
            // console.log('NEW activity', row.activity)
          } else {
            // console.log('PLAIN activity', row.activity)
            prevActivity = row.activity
            row.activity = ''
          }
          if (i > 0) { // recopier le code activité dans la ligne précédente
            rows[i - 1].activity += prevActivity
            // console.log('PREV activity', rows[i - 1].activity)
          }
        }

        if (!summaryOffset) {
          summaryOffset = this.hasSummaryOffset(row, i, rows)
        }

        if (summaryOffset) {
          // console.log('! DECALAGE de ligne de description', row, row.summary)
          let prevSummary
          if (row.summary.indexOf('\n') !== -1) {
            // console.log('ROW has newline', row.summary)
            const split = row.summary.split('\n')
            prevSummary = split.shift()
            row.summary = split.join('\n')
            // console.log('NEW summary', row.summary)
          } else {
            // console.log('PLAIN row', row.summary)
            prevSummary = row.summary
            row.summary = ''
          }
          if (i > 0) { // recopier le titre dans la ligne précédente
            const prev = rows[i - 1]
            if (prev.summary.length) {
              prev.summary += ' ' + prevSummary
            } else {
              prev.summary = prevSummary
            }
            // console.log('PREV SUMMARY', prev.summary)
          }
        }
      }
      i++
    }
    return rows
  }

  hasActivityOffset(row, i, rows) {
    if (i > 0) {
      const prev = rows[i - 1]
      if (prev.activity.indexOf('\n') !== -1) {
        // console.log('hasActivityOffset: saut de ligne sur ligne précédente', prev.activity, prev)
        return true
      }
    }

    switch (row.header) {
      case 'Duty Flight': // F
      case 'DHD Flight': // O | P
      case 'Train': // T
      case 'Transfert': // S
      case 'Ground Act.': // G
        if (_.isEmpty(row.activity)) {
          // console.log('hasActivityOffset: code requis mais absent', row.activity, row)
          return true
        }
        break
      case 'Begin Duty': // B
      case 'End Duty': // D
      case 'End Rest': // E
      case 'HOTAC': // H
        if (!_.isEmpty(row.activity)) {
          // console.log('hasActivityOffset: code devrait être vide', row.activity, row)
          return true
        }
        break
    }
    return false
  }

  hasSummaryOffset(row, i, rows) {
    if (i > 0) {
      const prev = rows[i - 1]
      if (_.includes(['Ground Act.', 'HOTAC'], prev.header) && prev.summary.indexOf('\n') !== -1) {
        return true
      }
    }

    const hasNewline = row.summary.indexOf('\n') !== -1
    let summary, nextSummary
    if (hasNewline) {
      const split = row.summary.split('\n')
      summary = split.shift()
      nextSummary = split.join('\n')
    } else {
      summary = row.summary
      nextSummary = i < (rows.length - 1) ? rows[i + 1].summary : null
    }

    switch (row.header) {
      case 'Begin Duty': // B
        // Summary peut être "Standard Duty" ou "Extended Duty"
        if (!/duty$/i.test(summary) && /duty/i.test(nextSummary)) return true
        break
      case 'Duty Flight': // F
        if (!FLIGHT_REG.test(summary) && FLIGHT_REG.test(nextSummary)) return true
        break
      case 'DHD Flight': // O | P
      case 'Train': // T
      case 'Transfert': // S
        if (!MEP_REG.test(summary) && MEP_REG.test(nextSummary)) return true
        break
      case 'End Duty': // D
      case 'End Rest': // E
        if (summary.length && i > 0 && !nextSummary) return true
        break
      case 'Ground Act.': // G
      case 'HOTAC': // H
        break
    }
    return false
  }

  beginDuty(event) {
    console.log('[beginDuty]', event.summary, this._date.toLocaleString(), event.start.toString())

    if (this._duty) {
      // console.log(this._duty, event)
      throw new Error("Une duty existe déjà !")
    }

    this._duty = {
      summary: event.summary,
      debut: this._date.set(this._parseTime(event.start)).setZone('Europe/Paris'),
      events: []
    }

    if (this._hotel) { // un évènement HOTEL est en suspens (pas de OFF ou de SV avant la nouvelle duty)
      this._duty.fromHotel = this._hotel
      this._hotel = null
    }
  }

  addFlight(event) {
    const m = event.summary.match(FLIGHT_REG)
    if (!m || m.length !== 4) throw new Meteor.Error('flight-error', 'Format de titre de vol inconnu !')

    const vol = {
      tag: 'vol',
      fonction: event.fonction,
      summary: `${event.activity} (${m[1]}-${m[2]})`,
      num: event.activity,
      from: m[1],
      to: m[2],
      immat: m[3],
      debut: this._date.set(this._parseTime(event.start)).setZone('Europe/Paris'),
      fin: this._date.set(this._parseTime(event.end)).setZone('Europe/Paris'),
      tv: this._parseDuration(event.tv)
    }

    if (event.peq) vol.peq = event.peq
    if (event.instruction) vol.instruction = event.instruction

    if (!this._duty) {
      this.beginDuty(event)
    }

    // if (!this._duty.type || this._duty.type === 'mep') {
      this._duty.type = 'sv' // Les journées qui commencent par une activité sol sont considérées comme des SV
    // }

    if (!this._duty.from) {
      this._duty.from = vol.from
    }

    console.log('[addFlight]', event.summary, this._date.toLocaleString())

    if (vol.fin < vol.debut) {
      console.log("!!! Heure de fin du vol inférieure à heure de début de vol : ", vol.debut.toString(), vol.fin.toString())
      vol.fin = vol.debut.plus({ hours: vol.tv })
      console.log(vol.fin.toString())
    }

    this._duty.events.push(vol)
  }

  addMEP(event) {
    console.log('[addMEP]', event.summary, this._date.toLocaleString())
    const m = event.summary.match(MEP_REG)
    if (!m || m.length !== 3) throw new Meteor.Error('mep-error', 'Format de titre de MEP inconnu !')

    const mep = {
      tag: 'mep',
      fonction: event.fonction,
      summary: `MEP ${event.activity} (${m[1]}-${m[2]})`,
      num: event.activity,
      title: event.activity,
      from: m[1],
      to: m[2],
      debut: this._date.set(this._parseTime(event.start)).setZone('Europe/Paris'),
      fin: this._date.set(this._parseTime(event.end)).setZone('Europe/Paris')
    }

    if (event.peq) mep.peq = event.peq
    if (event.instruction) mep.instruction = event.instruction

    if (!this._duty) {
      this.beginDuty(event)
    }

    if (!this._duty.from) {
      this._duty.from = mep.from
    }

    if (!this._duty.type) {
      this._duty.type = 'mep'
    }

    if (mep.fin < mep.debut) {
      console.log("Heure de fin du vol inférieure à heure de début de vol : ", mep.debut.toString(), mep.fin.toString())
      mep.fin = this._date.plus({ days: 1 }).set(this._parseTime(event.end)).setZone('Europe/Paris')
      console.log(mep.fin.toLocaleString())
    }

    mep.mep = mep.fin.diff(mep.debut).as('hours')

    this._duty.events.push(mep)
  }

  endDuty(event) {
    if (_.isEmpty(this._duty.events)) {
      this._duty = null
      return
    }

    if (_.isUndefined(event)) {
      event = _.last(this._duty.events)
    }

    console.log('[endDuty]', event.summary, this._date.toLocaleString())
    this._duty.fin = this._date.set(this._parseTime(event.end)).setZone('Europe/Paris')

    if (this._duty.fin < this._duty.debut) {
      console.log("Heure de fin du vol inférieure à heure de début de vol : ", this._duty.debut.toString(), this._duty.fin.toString())
      throw new Error("Heure de fin du vol inférieure à heure de début de vol")
    }

    if (!_.has(this._duty, 'type')) {
      console.log(this._date.toLocaleString(), event.summary)
      throw new Error("Type de duty non défini !")
    }

    if (this._duty.type === 'sv' || this._duty.type === 'mep') {
      this._duty.ts = this._duty.fin.diff(this._duty.debut).as('hours')

      if (this._duty.ts > 16.5 || this._duty.ts < 0) {
        console.log("TS incohérent : ", this._duty)
        throw new Error(`Temps de service incohérent : ${ this._duty.ts }`)
      }

      const groups = _.groupBy(this._duty.events, 'tag')
      const etapes = _.filter(this._duty.events, evt => evt.tag === 'vol' || evt.tag === 'mep')
      this._duty.countVol = groups.vol ? groups.vol.length : 0
      this._duty.countMEP = groups.mep ? groups.mep.length : 0
      this._duty.mep = groups.mep ? _.sumBy(groups.mep, 'mep') : 0
      this._duty.to = _.last(etapes).to

      this.events.push(this._duty)
    }

    if (this._duty.type === 'sol') {
      const firstSol = _.find(this._duty.events, { type: 'sol' })
      const specialCategoryEvent = _.find(this._duty.events, evt => {
        return _.includes(['simu', 'instructionSol', 'instructionSimu', 'stage', 'delegation', 'reserve'], evt.tag)
      })
      this._duty.tag = specialCategoryEvent ? specialCategoryEvent.tag : firstSol.tag
      this.events.push(this._duty)
      this.sols.push(this._duty)
    }

    let found
    if (found = _.find(this._duty.events, evt => _.isObject(evt.peq))) this._duty.peq = found.peq
    if (found = _.find(this._duty.events, evt => _.isObject(evt.instruction))) this._duty.instruction = found.instruction

    this._precDuty = this._duty
    this._duty = null
  }

  endRest(event) {
    // console.log('[addRest]', event.summary)
    // Réservé
  }

  addBlanc() {
    console.log('[addBlanc]', 'BLANC', this._date.toLocaleString())
    const evt = {
      type: 'sol',
      category: 'BLANC',
      tag: 'blanc',
      summary: 'Blanc',
      debut: this._date.setZone('Europe/Paris').startOf('day'),
      fin: this._date.setZone('Europe/Paris').endOf('day')
    }
    this.events.push(evt)
    this.sols.push(evt)
  }

  addGround(event) {
    let sol = {
      type: 'sol',
      category: event.activity,
      tag: this._findTag(event.activity),
      summary: event.summary,
      debut: (event.start && TIME_REG.test(event.start)) ? this._date.set(this._parseTime(event.start)).setZone('Europe/Paris') : undefined,
      fin: (event.end && TIME_REG.test(event.end)) ? this._date.set(this._parseTime(event.end)).setZone('Europe/Paris') : undefined,
      fonction: event.fonction
    }

    if (event.peq) sol.peq = event.peq
    if (event.instruction) sol.instruction = event.instruction

    console.log('[addGround]', event.summary)

    if (_.isUndefined(sol.fin)) {
      // console.log('[beginGround]', event.summary, this._date.toLocaleString(), event.start)
      this._ground = sol
      return
    }

    if (_.isUndefined(sol.debut) && sol.fin && sol.fin.isValid) {
      // console.log('[endGround]', sol.fin.toLocaleString())
      if (!this._ground) {
        sol.debut = sol.fin.startOf('day')
      } else {
        this._ground.fin = sol.fin
        sol = this._ground
        this._ground = null
      }
    }

    if (this._duty) {
      if (!this._duty.type || this._duty.type === 'mep') {
        this._duty.type = 'sol'
      }
      this._duty.events.push(sol)
    } else {
      this._hotel = null
      this._precDuty = null
      // sol.duree = sol.fin.diff(sol.debut).as('hours')
      this.events.push(sol)
      this.sols.push(sol)
    }
  }

  addHotel(event) {
    if (event.start && TIME_REG.test(event.start)) {
      console.log('[beginHotel]', event.summary)
      this._hotel = {
        tag: 'hotel',
        summary: event.summary,
        debut: this._date.set(this._parseTime(event.start)).setZone('Europe/Paris')
      }
      if (this._precDuty) {
        this._hotel.location = this._precDuty.to
      }
    }

    if (this._hotel && event.end && TIME_REG.test(event.end)) {
      console.log('[endHotel]', event.summary)
      this._hotel.fin = this._date.set(this._parseTime(event.end)).setZone('Europe/Paris')
      // this._hotel.duree = this._hotel.fin.diff(this._hotel.debut).as('hours')
      if (this._precDuty) {
        this._precDuty.hotel = this._hotel
        this._hotel = null
      }
    }
  }

  groupRotations() {
    this.events = _.sortBy(this.events, ['debut', 'fin'])

    let startIndex = _.findIndex(this.events, evt => ['repos', 'conges'].includes(evt.tag))
    // console.log(this.events, startIndex)

    let rotations
    if (startIndex != -1) {
      rotations = [
        ...this._getRotationsFromRight(_.slice(this.events, 0, startIndex)),
        ...this._getRotationsFromLeft(_.slice(this.events, startIndex))
      ]
    } else {
      rotations = this._getRotationsFromRight(this.events)
    }

    this.rotations = rotations
  }

  _getRotationsFromLeft(events) {
    const rotations = []
    let rotation = null
    let prevDuty = null

    _.forEach(events, evt => {
      // console.log(evt, evt.type, evt.tag, _.map(evt.events, evt => [ evt.num, evt.from, evt.to, evt.debut.toLocaleString(DateTime.DATETIME_SHORT) ]))
      if (evt.type === 'sv' || evt.type === 'mep') {
        if (!rotation) { // Cas d'un premier SV de MEP isolée ! et si SV de MEP isolée pour activités sol ?
          rotation = this.beginRotation(evt.from)
        } else if (this._shouldCompleteRotation(rotation, prevDuty, evt)) {
          rotations.push(this.endRotation(rotation))
          rotation = this.beginRotation(evt.from)
        }
        rotation.sv.push(evt)
        prevDuty = evt
      } else if (rotation) {
        rotations.push(this.endRotation(rotation))
        rotation = null
        prevDuty = null
      }
    })

    if (rotation) {
      rotations.push(this.endRotation(rotation))
    }

    return rotations
  }

  _getRotationsFromRight(events) {
    const rotations = []
    let rotation = null
    let nextDuty = null

    _.forEachRight(events, evt => {
      if (evt.type === 'sv' || evt.type === 'mep') {
        if (!rotation) {
          rotation = this.beginRotation(evt.to)
        } else if (this._shouldCompleteRotationRight(rotation, evt, nextDuty)) {
          rotations.push(this.endRotation(rotation))
          rotation = this.beginRotation(evt.to)
        }
        rotation.sv.unshift(evt)
        nextDuty = evt
      } else if (rotation) {
        rotations.push(this.endRotation(rotation))
        rotation = null
        nextDuty = null
      }
    })

    if (rotation) {
      rotations.push(this.endRotation(rotation))
    }

    return rotations.reverse()
  }

  _shouldCompleteRotation(rotation, prevDuty, evt) {
    if (!prevDuty || prevDuty.hotel) return false
    
    if (rotation.base) {
      return prevDuty.to === rotation.base 
        || prevDuty.to === 'CDG' && rotation.base === 'ORY'
    } else {
      return _.includes(this.options.bases, evt.from)
    }
  }

  _shouldCompleteRotationRight(rotation, evt, nextDuty) {
    if (!nextDuty || evt.hotel) return false

    if (rotation.base) {
      return nextDuty.from === rotation.base
        || nextDuty.from === 'CDG' && rotation.base === 'ORY'
    } else {
      return _.includes(this.options.bases, nextDuty.from)
    }
  }

  beginRotation(base) {
    console.log('[beginRotation]')
    if (base === 'CDG') base = 'ORY'
    return {
      type: 'rotation',
      tag: 'rotation',
      sv: [],
      base: _.includes(this.options.bases, base) ? base : undefined
    }
  }

  endRotation(rotation) {
    console.log('[endRotation]', rotation)
    const firstSV = _.first(rotation.sv)
    const lastSV = _.last(rotation.sv)

    rotation.debut = firstSV.debut
    rotation.fin = lastSV.fin

    if (_.isUndefined(rotation.base)) {
      if (_.includes(this.options.bases, firstSV.from)) {
        rotation.base = firstSV.from
      } else if (_.includes(this.options.bases, lastSV.to)) {
        rotation.base = lastSV.to
      }
      if (rotation.base === 'CDG') {
        rotation.base = 'ORY'
      }
    }

    rotation.nbjours = rotation.fin.startOf('day').diff(rotation.debut.startOf('day')).as('days') + 1

    rotation.tv = _.sumBy(rotation.sv, 'tv')
    rotation.countVol = _.sumBy(rotation.sv, 'countVol')
    rotation.mep = _.sumBy(rotation.sv, 'mep')
    rotation.countMEP = _.sumBy(rotation.sv, 'countMEP')

    if (rotation.sv.length > 1) {
      rotation.decouchers = _.reduce(rotation.sv, (list, sv, index, svs) => {
        if (sv.hotel) {
          if (index === 0 || (svs[index-1].hotel && svs[index-1].hotel.location != sv.hotel.location)) {
            list.push(sv.hotel.location)
          }
        }
        return list
      }, [])
    }

    return rotation
  }

  factorSolDays() {
    const result = []
    let memo = null
    _.forEach(this.sols, sol => {
      if (_.includes(Utils.alldayTags, sol.tag)) {
        if (memo) {
          if (memo.activity === sol.activity
            && memo.summary === sol.summary
            && memo.fin.plus({ days: 1 }).hasSame(sol.debut, 'day')) {
            memo.fin = sol.fin
          } else {
            result.push(memo)
            memo = sol
          }
        } else {
          memo = sol
        }
      } else {
        if (memo) {
          result.push(memo)
          memo = null
        }
        result.push(sol)
      }
    })
    this.sols = result
  }

  buildPlanning() {
    const acheminements = _.remove(this.rotations, rotation => rotation.countVol === 0 && rotation.countMEP > 0)
    _.forEach(acheminements, group => {
      _.forEach(group.sv, mep => mep.tag = 'mep')
      this.sols.push(...group.sv)
    })
    this.planning = _.sortBy(this.sols.concat(this.rotations), ['debut', 'fin'])
  }

  printPlanning() {
    console.log('--- PLANNING ---')
    _.forEach(this.planning, evt => {
      if (evt.tag === 'rotation') {
        console.log(`[ROTATION] ${evt.debut.toLocaleString(DateTime.DATETIME_FULL)}`)
        _.forEach(evt.sv, sv => {
          if (_.has(sv, 'fromHotel')) console.log(`{...HOTEL} ${ sv.fromHotel.summary }`)
          console.log(`[${sv.type}] ${sv.summary} - ${sv.debut.toLocaleString(DateTime.DATETIME_FULL)}`)
          _.forEach(sv.events, etape => console.log(`-> ${etape.summary} - ${etape.debut.toLocaleString(DateTime.DATETIME_FULL)}`))
          if (_.has(sv, 'hotel')) console.log(`{HOTEL} ${sv.hotel.summary}`)
        })
      } else {
        console.log(`[${evt.tag}] (${evt.summary}) ${evt.debut.toLocaleString(DateTime.DATETIME_FULL)}`)
        if (evt.events && evt.events.length) {
          _.forEach(evt.events, subEvt => console.log(`-> ${subEvt.tag} - ${subEvt.summary} - ${subEvt.debut.toLocaleString(DateTime.DATETIME_FULL)}`))
        }
      }
    })
    console.log('----------------')
  }

  _findTag(code) {
    return Utils.findTag(code)
  }

  _parseTime(timeStr) {
    if (TIME_REG.test(timeStr)) {
      const [ hour, minute ] = timeStr.split(':')
      return { hour, minute }
    } else {
      if (timeStr !== '>>>') console.error("Format d'heure incorrect : ", timeStr)
      return undefined
    }
  }

  _parseDuration(timeStr) {
    if (TIME_REG.test(timeStr)) {
      const [ hours, minutes ] = timeStr.split(':')
      return Duration.fromObject({ hours, minutes }).as('hours')
    } else {
      throw new Error("Format de durée incorrect.")
    }
  }

  _parsePeq(peq) {
    const list = peq.split(/\s*(\w+)\.?\s?:\s+/g)
    if (peq.length >= 3) {
      const result = {}
      for (let i = 1; i < list.length - 1; i += 2) {
        result[list[i]] = list[i+1].split(/\s+/g)
      }
      return result
    }
    return undefined
  }

  _parseInstruction(str) {
    const groups = [...str.matchAll(/\s?([A-z0-9_ ]{2,})\s+Ins\.:\s+([A-Z]{3})/g)]
    if (groups.length) {
      return _.chain(groups)
        .map((match, index) => {
          if (match && match.length === 3) {
            const result = {
              code: match[1].replace(/\s/g, '_'),
              inst: match[2]
            }
            const endOfGroup = index === groups.length-1 ? str.length : groups[index+1].index
            const sub = str.substring(match.index + result.code.length, endOfGroup)
            result.peq = this._parsePeq(sub)

            const details = Utils.findCodeInstruction(result.code)
            if (details) _.extend(result, details)

            const fonction = _.findKey(result.peq, peq => _.includes(peq, this.meta.trigramme))
            switch (fonction) {
              case 'Ins':
              case 'Inst':
                result.fonction = 'instructeur'
                break
              case 'Tr':
                result.fonction = 'stagiaire'
                break
              case 'StIn':
                result.fonction = 'support'
                break
              case undefined:
                break
              default:
                result.fonction = fonction
            }

            return result
          }
        })
        .filter(r => !_.isEmpty(r))
        .value()
    }
    return undefined
  }
}
