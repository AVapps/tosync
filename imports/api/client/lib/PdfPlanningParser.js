import { DateTime, Duration, Settings } from 'luxon'
import _ from 'lodash'
import Utils from './Utils.js'

window.Utils = Utils

Settings.defaultLocale = 'fr'
Settings.defaultZoneName = 'Europe/Paris'

const BASES = [ 'ORY', 'CDG', 'LYS', 'MPL', 'NTE' ]
const FLIGHT_REG = /^([A-Z]{3})\-([A-Z]{3})\s\(([A-Z]+)\)/
const MEP_REG = /^([A-Z]{3})\-([A-Z]{3})/
const DATE_REG = /^[a-z]{3}\.\s(\d\d)\/(\d\d)\/(\d\d\d\d)/
const TIME_REG = /^\d\d:\d\d$/

export default class PdfPlanningParser {
  constructor(pdf) {
    this.events = []
    this.rotations = []
    this.sols = []
    this.meta = pdf.meta

    this.parse(pdf.table)
  }

  parse(lines) {
    this._rotation = null
    this._precDuty = null
    this._duty = null
    this._hotel = null
    this._date = null
    this._ground = null

    let i = 0
    while (i < lines.length) {
      const line = lines[i]

      if (line.length === 1 && DATE_REG.test(line[0])) {
        const m = line[0].match(DATE_REG)
        this._date = DateTime.utc(parseInt(m[3]), parseInt(m[2]), parseInt(m[1]))
        if (/BLANC$/.test(line[0])) {
          this.addBlanc()
        }
        i++
        continue
      }

      const type = line[0]
      if (type.length) {
        const event = {
          type,
          start: line[1],
          end: line[2],
          category: line[3].replace(/\s/g, ''),
          fonction: line[4],
          summary: line[5],
          typeAvion: line[6],
          tv: line[7],
          instruction: line[8],
          peq: line[9],
          remark: line[10]
        }

        if (event.peq && event.peq.length) {
          event.peq = this._parsePeq(event.peq)
        }

        if (event.instruction) {
          event.instruction = this._parseInstruction(event.instruction)
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

        switch (type) {
          case 'Begin Duty': // B
            this.beginDuty(event)
            break
          case 'Duty Flight': // F
            this.addFlight(event)
            break
          case 'DHD Flight': // O | P
          case 'Train': // T
          case 'Transfert': // S
            this.addMEP(event)
            break
          case 'End Duty': // D
            this.endDuty(event)
            break
          case 'End Rest': // E
            this.endRest(event)
            break
          case 'Ground Act.': // G
            if (!['ENGS', 'ENGST'].includes(event.category)) this.addGround(event)
            break
          case 'HOTAC': // H
            this.addHotel(event)
            break
          default:
            console.log(`Type Inconnu : ${type}`)
        }
      }

      i++
    }

    if (this._rotation) this.endRotation()
  }

  beginRotation(start, base, events = []) {
    console.log('[beginRotation]', start.toLocaleString())
    this._rotation = {
      type: 'rotation',
      tag: 'rotation',
      debut: start,
      sv: [],
      etapes: events,
      base
    }
  }

  endRotation() {
    console.log('[endRotation]', _.map(this._rotation.etapes, 'num'))

    this._rotation.debut = _.first(this._rotation.sv).debut
    this._rotation.fin = _.last(this._rotation.sv).fin

    this._rotation.nbjours = this._rotation.fin.startOf('day').diff(this._rotation.debut.startOf('day')).as('days') + 1

    this._rotation.tv = _.sumBy(this._rotation.sv, 'tv')
    this._rotation.countVol = _.sumBy(this._rotation.sv, 'countVol')
    this._rotation.mep = _.sumBy(this._rotation.sv, 'mep')
    this._rotation.countMEP = _.sumBy(this._rotation.sv, 'countMEP')

    if (this._rotation.sv.length > 1) {
      this._rotation.decouchers = _.reduce(this._rotation.sv, (list, sv, index, svs) => {
        if (sv.hotel) {
          if (index === 0 || (svs[index-1].hotel && svs[index-1].hotel.location != sv.hotel.location)) {
            list.push(sv.hotel.location)
          }
        }
        return list
      }, [])
    }

    this.rotations.push(this._rotation)
    this.events.push(this._rotation)
    this._rotation = null
  }

  beginDuty(event) {
    if (this._hotel) {
      this._hotel = null
    } else if (this._rotation && _.includes(BASES, _.last(this._rotation.etapes).to)) {
      this.endRotation()
    }

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
  }

  addFlight(event) {
    const m = event.summary.match(FLIGHT_REG)
    if (!m || m.length !== 4) throw new Meteor.Error('flight-error', 'Format de titre de vol inconnu !')

    const vol = {
      tag: 'vol',
      fonction: event.fonction,
      num: event.category,
      from: m[1],
      to: m[2],
      immat: m[3],
      debut: this._date.set(this._parseTime(event.start)).setZone('Europe/Paris'),
      fin: this._date.set(this._parseTime(event.end)).setZone('Europe/Paris'),
      tv: this._parseDuration(event.tv)
    }

    if (event.peq) vol.peq = event.peq
    if (event.instruction) vol.instruction = event.instruction

    if (!this._duty.from) {
      this._duty.from = vol.from
    }

    if (!this._duty.type || this._duty.type === 'mep') {
      this._duty.type = 'sv'
      if (!this._rotation) this.beginRotation(this._duty.debut, vol.from, _.clone(this._duty.events))
    }

    console.log('[addFlight]', event.summary, this._date.toLocaleString())

    if (vol.fin < vol.debut) {
      console.log("!!! Heure de fin du vol inférieure à heure de début de vol : ", vol.debut.toString(), vol.fin.toString())
      vol.fin = vol.debut.plus({ hours: vol.tv })
      console.log(vol.fin.toString())
    }

    this._rotation.etapes.push(vol)
    this._duty.events.push(vol)
  }

  addMEP(event) {
    console.log('[addMEP]', event.summary, this._date.toLocaleString())
    const m = event.summary.match(MEP_REG)
    if (!m || m.length !== 3) throw new Meteor.Error('mep-error', 'Format de titre de MEP inconnu !')

    const mep = {
      tag: 'mep',
      fonction: event.fonction,
      num: event.category,
      from: m[1],
      to: m[2],
      debut: this._date.set(this._parseTime(event.start)).setZone('Europe/Paris'),
      fin: this._date.set(this._parseTime(event.end)).setZone('Europe/Paris')
    }

    if (event.peq) mep.peq = event.peq
    if (event.instruction) mep.instruction = event.instruction

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

    if (this._rotation) this._rotation.etapes.push(mep)

    this._duty.events.push(mep)
  }

  endDuty(event) {
    console.log('[endDuty]', event.summary, this._date.toLocaleString())
    this._duty.fin = this._date.set(this._parseTime(event.end)).setZone('Europe/Paris')

    if (this._duty.fin < this._duty.debut) {
      console.log("Heure de fin du vol inférieure à heure de début de vol : ", this._duty.debut.toString(), this._duty.fin.toString())
      throw new Error("Heure de fin du vol inférieure à heure de début de vol")
    }

    if (_.isEmpty(this._duty.events)) {
      this._duty = null
      return
    }

    if (!_.has(this._duty, 'type')) {
      console.log(this._date.toLocaleString(), event.summary)
      throw new Error("Type de duty non défini !")
    }

    if (this._duty.type === 'sv' || this._duty.type === 'mep') {
      this._duty.ts = this._duty.fin.diff(this._duty.debut).as('hours')

      if (this._duty.ts > 16.5 || this._duty.ts < 0) {
        console.log("TS incohérent : ", this._duty)
        throw new Error("TS incohérent")
      }

      const counts = _.countBy(this._duty.events, 'tag')
      const groups = _.groupBy(this._duty.events, 'tag')
      const etapes = _.filter(this._duty.events, evt => evt.tag === 'vol' || evt.tag === 'mep')
      this._duty.countVol = counts.vol || 0
      this._duty.tv = counts.vol ? _.sumBy(groups.vol, 'tv') : 0
      this._duty.tme = counts.vol ? this._duty.tv / this._duty.countVol : 0
      this._duty.cmt = counts.vol ? Math.max(70 / ( 21 * Math.max(this._duty.tme, 1) + 30), 1) : 0
      this._duty.countMEP = counts.mep || 0
      this._duty.mep = counts.mep ? _.sumBy(groups.mep, 'mep') : 0
      this._duty.to = _.last(etapes).to

      if (!this._rotation) this.beginRotation(this._duty.debut, this._duty.to, _.clone(this._duty.events)) // Cas d'un premier SV de MEP isolée ! et si SV de MEP isolée pour activités sol ?

      this._rotation.sv.push(this._duty)
    }

    if (this._duty.type === 'sol') {
      const firstSol = _.find(this._duty.events, { type: 'sol'})
      const sol = {
        type: 'sol',
        category: firstSol.category,
        tag: firstSol.tag,
        summary: firstSol.summary,
        debut: this._duty.debut,
        fin: this._duty.fin,
        fonction: firstSol.fonction,
        events: this._duty.events
      }

      sol.duree = sol.fin.diff(sol.debut).as('hours')

      this.events.push(sol)
      this.sols.push(sol)
    }

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
      start: this._date.setZone('Europe/Paris').startOf('day'),
      end: this._date.setZone('Europe/Paris').endOf('day')
    }
    this.events.push(evt)
    this.sols.push(evt)
  }

  addGround(event) {
    let sol = {
      type: 'sol',
      category: event.category,
      tag: this._findTag(event.category),
      summary: event.summary,
      debut: (event.start && event.start !== '>>>') ? this._date.set(this._parseTime(event.start)).setZone('Europe/Paris') : undefined,
      fin: (event.end && event.end !== '>>>') ? this._date.set(this._parseTime(event.end)).setZone('Europe/Paris') : undefined,
      fonction: event.fonction
    }

    if (event.peq) sol.peq = event.peq
    if (event.instruction && event.instruction) {
      sol.instruction = _.find(event.instruction, group => _.some(group.peq, value => _.isArray(value) && _.includes(value, this.meta.trigramme)))

      if (sol.instruction) {
        const details = Utils.findCodeInstruction(event.category)
        if (details) {
          _.extend(sol.instruction, details)
        }
        sol.instruction.instructeur = sol.instruction.peq.Ins && _.includes(sol.instruction.peq.Ins , this.meta.trigramme)
        if (sol.instruction.instructeur) {
          if (sol.instruction.type === 'sol') sol.tag = 'instructionSol'
          if (sol.instruction.type === 'simu') sol.tag = 'instructionSimu'
        }
      }
    }

    if (this._rotation && !['simu', 'instructionSimu'].includes(sol.tag)) this.endRotation()

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
        this._duty.tag = sol.tag
      }
      this._duty.events.push(sol)
    } else {
      this._hotel = null
      this._precDuty = null
      sol.duree = sol.fin.diff(sol.debut).as('hours')
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
      this._hotel.duree = this._hotel.fin.diff(this._hotel.debut).as('hours')
      if (this._precDuty) {
        this._precDuty.hotel = this._hotel
      }
    }
  }

  _findTag(category) {
    return Utils.findTag(category)
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
    str = str.replace(/SIMU CPT/g, 'SIMU_CPT')
    const groups = [...str.matchAll(/\s?([A-z0-9_]{2,})\sIns.:\s([A-Z]{3})/g)]
    if (groups.length) {
      return _.chain(groups)
        .map((match, index) => {
          if (match && match.length === 3) {
            const result = {
              code: match[1],
              inst: match[2]
            }
            const endOfGroup = index === groups.length-1 ? str.length : groups[index+1].index
            const sub = str.substring(match.index + result.code.length, endOfGroup)
            result.peq = this._parsePeq(sub)
            return result
          }
        })
        .filter(r => !_.isEmpty(r))
        .value()
    }
    return undefined
  }
}
