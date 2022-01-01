import { DateTime, Duration, Interval, Settings } from 'luxon'
import _ from 'lodash'
const CONFIG_AF = require('./configAF')
const CONFIG_TO = require('./configTO')
const CONFIG_RU = require('./configRU')
import Utils from './Utils'

const TIMEZONE = 'Europe/Paris'
Settings.defaultLocale = 'fr'
Settings.defaultZoneName = TIMEZONE

const PROFIL_DEFAULTS = {
  anciennete: 0,
  echelon: 1,
  fonction: 'OPL',
  categorie: 'A',
  grille: 'OPLA',
  atpl: false,
  classe: 5
}

function toDateTime(millis) {
  return DateTime.fromMillis(millis, { zone: TIMEZONE })
}

function sumBy(collection, key) {
  return _.reduce(collection, (sum, object) => {
    if (_.has(object, key)) {
      return sum + (_.get(object, key) || 0)
    } else {
      return sum
    }
  }, 0)
}

function sumByMonth(collection, key, month, startKey = 'debut') {
  return _.reduce(collection, (sum, object) => {
    // L'objet a un objet split
    if (_.has(object, ['split', month, key].join('.'))) {
      // if (isNaN(_.get(object, ['split', month, key].join('.')))) {
      //   console.log(object, ['split', month, key].join('.'))
        // throw new Error("NaN")
      // }
      return sum + (_.get(object, ['split', month, key].join('.')) || 0)

    // L'objet a un DateTime Luxon de début
    } else if (_.has(object, key) && _.has(object, startKey) && _.get(object, startKey).month === month) {
      // if (isNaN(_.get(object, key))) {
      //   console.log(object, key)
        // throw new Error("NaN")
      // }
      return sum + (_.get(object, key) || 0)

    // L'objet a un Moment de début
    } else if (_.has(object, key) && _.has(object, 'start')
      && _.get(object, 'start')._isAMomentObject
      &&_.get(object, 'start').month() + 1 === month) {
      // if (isNaN(_.get(object, key))) {
      //   console.log(object, key)
        // throw new Error("NaN")
      // }
      return sum + (_.get(object, key) || 0)
    } else {
      return sum
    }
  }, 0)
}

const findHV100TO = _.memoize(function (vol) {
	const mois = toDateTime(vol.start).toFormat('yyyy-MM');
	const hv = HV100.findOne({src: vol.from, dest: vol.to, mois: { $lte : mois }}, { sort: [["mois", "desc"]]});
	return hv ? hv.tr : undefined;
}, function (vol) {
	return [ vol.from, vol.to, toDateTime(vol.start).toFormat('yyyy-MM') ].join('-');
})

const findHV100AF = _.memoize(function (vol) {
	const mois = toDateTime(vol.start).toFormat('yyyy-MM');
	const hv = HV100AF.findOne({src: vol.from, dest: vol.to, mois: { $lte : mois }}, { sort: [["mois", "desc"]]});
	return hv ? hv.tr : undefined;
}, function (vol) {
	return [ vol.from, vol.to, toDateTime(vol.start).toFormat('yyyy-MM') ].join('-');
})

export default class RemuPNT {
  constructor(eventsByTag, month) {
    this.eventsByTag = eventsByTag
    this.month = _.clone(month)

    if (_.has(this.eventsByTag, 'rotation')) {
      this.completeRotations()
    }

    this.groupJoursSol()
    this.calculMois()
  }

  findJourSol(date) {
    return _.get(this.joursSol, date)
  }

  findEvent(evt) {
    if (_.has(this.eventsByTag, evt.tag)) {
      return _.find(this.eventsByTag[evt.tag], { _id: evt._id })
    }
    return null
  }

  filterEventsByMonth(events) {
    const monthObject = _.extend({ zone: TIMEZONE }, this.month)
    const debut = DateTime.fromObject(monthObject).startOf('month')
    const fin = DateTime.fromObject(monthObject).endOf('month')
    return _.filter(events, evt => (evt.end >= debut && evt.debut <= fin))
  }

  filterDaysByMonth(days) {
    const monthObject = _.extend({ zone: TIMEZONE }, this.month)
    const dateDebut = DateTime.fromObject(monthObject).startOf('month').toISODate()
    const dateFin = DateTime.fromObject(monthObject).endOf('month').toISODate()
    return _.filter(days, day => (day.date >= dateDebut && day.date <= dateFin))
  }

  calculMois() {
    const stats = {
      NJ: 0,
      TO: {
        HCm: 0,
        HCgm: 0,
        HCrm: 0,
        Hcs: 0,
        Hcsi: 0,
        HcSimuInst: 0,
        Hcsr: 0,
        NJstage: 0
      },
      AF: {
        HCm: 0,
        HCgm: 0,
        HC: 0,
        HCr: 0,
        PVrm: 0,
        PV: 0,
        Hcs: 0,
        HcsStage: 0
      },
      count: {},
      nbjours: {}
    }

    const data = this.eventsByTag
    const month = this.month.month

    _.forEach(_.omit(Utils.tags, 'stage', 'sol', 'simu', 'instructionSol', 'instructionSimu', 'reserve', 'delegation', 'vol', 'mep'), tag => {
      stats.count[tag] = _.has(data, tag) ? _.sumBy(data[tag], evt => (toDateTime(evt.start).month === month) ? 1 : 0) : 0
    })

    if (_.has(this.eventsByTag, 'stage') && _.get(this.eventsByTag, 'stage').length) {
      const stages = this.filterEventsByMonth(_.get(this.eventsByTag, 'stage'))
      const stageInterval = Interval.fromDateTimes(_.first(stages).debut.startOf('day'), _.last(stages).fin.endOf('day'))

      _.forEach(this.joursSol, (day, date) => {
        if (stageInterval.contains(day.debut) && day.tag !== 'stage') {
          day.tag = 'stage'
          day.HcsAF = this._isDemiJournée(day, 13) ? CONFIG_AF.demiHcs : CONFIG_AF.Hcs
          day.HcsTO = 65/30
        }
      })

      stats.TO.NJstage = stageInterval.count('days')
    }

    const joursSolThisMonth = this.filterDaysByMonth(this.joursSol)
    const joursSolByTag = _.groupBy(joursSolThisMonth, 'tag')

    if (_.has(joursSolByTag, 'stage')) {
      stats.nbjours.stage = _.size(joursSolByTag.stage)
      stats.AF.HcsStage = _.sumBy(joursSolByTag.stage, 'HcsAF')
    }

    if (_.has(joursSolByTag, 'sol')) {
      stats.nbjours.sol = _.size(joursSolByTag.sol)
      const HcsAF = _.sumBy(joursSolByTag.sol, 'HcsAF')
      stats.AF.Hcs += HcsAF
      stats.AF.PVrm += HcsAF * CONFIG_AF.coefPVHC
      stats.TO.Hcs += _.sumBy(joursSolByTag.sol, 'HcsTO')
    }

    if (_.has(joursSolByTag, 'reserve')) {
      stats.nbjours.reserve = _.size(joursSolByTag.reserve)
      const HcsAF = _.sumBy(joursSolByTag.reserve, 'HcsAF')
      stats.AF.Hcs += HcsAF
      stats.AF.PVrm += HcsAF * CONFIG_AF.coefPVHC
      stats.TO.Hcs += _.sumBy(joursSolByTag.reserve, 'HcsTO')
    }

    if (_.has(joursSolByTag, 'delegation')) {
      stats.nbjours.delegation = _.size(joursSolByTag.delegation)
      stats.AF.Hcs += _.sumBy(joursSolByTag.delegation, 'HcsAF')
      stats.AF.PVrm += _.sumBy(joursSolByTag.delegation, 'PVAF')
      stats.TO.Hcsr += _.sumBy(joursSolByTag.delegation, 'HcsrTO')
    }

    if (_.has(joursSolByTag, 'simu')) {
      stats.nbjours.simu = _.size(joursSolByTag.simu)
      const HcsAF = _.sumBy(joursSolByTag.simu, 'HcsAF')
      stats.AF.Hcs += HcsAF
      stats.AF.PVrm += HcsAF * CONFIG_AF.coefPVHC
      stats.TO.Hcs += _.sumBy(joursSolByTag.simu, 'HcsTO')
    }

    if (_.has(joursSolByTag, 'instructionSol')) {
      stats.nbjours.instructionSol = _.size(joursSolByTag.instructionSol)
      stats.AF.Hcs += _.sumBy(joursSolByTag.instructionSol, 'HcsAF')
      stats.AF.PVrm += _.sumBy(joursSolByTag.instructionSol, 'PVAF')
      stats.TO.Hcsi += _.sumBy(joursSolByTag.instructionSol, 'HcsiTO')
    }

    if (_.has(joursSolByTag, 'instructionSimu')) {
      stats.nbjours.instructionSimu = _.size(joursSolByTag.instructionSimu)
      stats.AF.Hcs += _.sumBy(joursSolByTag.instructionSimu, 'HcsAF')
      stats.AF.PVrm += _.sumBy(joursSolByTag.instructionSimu, 'PVAF') + _.sumBy(joursSolByTag.instructionSol, 'majoNuitPVAF')
      stats.TO.HcSimuInst += _.sumBy(joursSolByTag.instructionSimu, 'HcSimuInstTO')
    }

    stats.TO.NJabs = stats.count.conges + stats.count.sanssolde + stats.count.maladie + stats.count.absence + stats.count.greve + stats.TO.NJstage
    stats.TO.trentiemes = 30 - stats.TO.NJabs
    stats.TO.seuilHS = Math.max(75 * stats.TO.trentiemes / 30, 16)

    stats.AF.NJabs = stats.count.conges + stats.count.sanssolde + stats.count.maladie + stats.count.absence + stats.count.greve
    stats.AF.trentiemes = 30 - stats.AF.NJabs
    stats.AF.seuilHS = Math.max(75 * stats.AF.trentiemes / 30, 16)

    _.forEach(['tv', 'tvp', 'mep', 'countVol'], key => {
      stats[key] = sumByMonth(data.rotation, key, month)
    })

    _.forEach(['HVnuit', 'H2TO'], key => {
      stats.TO[key.replace('TO', '')] = sumByMonth(data.rotation, key, month)
    })

    _.forEach(['TSVnuit', 'H2AF', 'H2rAF'], key => {
      stats.AF[key.replace('AF', '')] = sumByMonth(data.rotation, key, month)
    })

    stats.AF.PVrm += stats.AF.H2r * CONFIG_AF.coefPVHC

    const joursVol = this._jours(data.rotation, month)
    const joursSol = _.map(_.reject(joursSolThisMonth, { tag: 'stage' }), 'date')
    stats.NJVol = joursVol.length
    stats.NJSol = joursSol.length
    stats.NJ = _.union(joursVol, joursSol).length

    stats.TO.Hcnuit = stats.TO.HVnuit * CONFIG_TO.coefNuit
    stats.TO.HCm = stats.TO.H2 + stats.TO.Hcs + stats.TO.Hcnuit + stats.TO.Hcsi + stats.TO.Hcsr + stats.TO.HcSimuInst
    stats.TO.HCgm = stats.TO.NJstage ? 0 : stats.NJ * CONFIG_TO.hcgmParNJ
    stats.TO.HCrm = Math.max(stats.TO.HCm, stats.TO.HCgm)

    stats.AF.HCd = stats.AF.H2 + stats.AF.Hcs
    stats.AF.HCgm = stats.NJ * CONFIG_AF.hcParNJ
    stats.AF.HC = Math.max(stats.AF.HCd, stats.AF.HCgm) + stats.AF.HcsStage

    stats.AF.PVgm = stats.AF.HCgm * CONFIG_AF.coefPVHC
    stats.AF.PVstage = stats.AF.HcsStage * CONFIG_AF.coefPVHC
    stats.AF.PV = Math.max(stats.AF.PVrm, stats.AF.PVgm) + stats.AF.PVstage
    // stats.AF.sHCr = stats.AF.PV / CONFIG_AF.coefPVHC
    // stats.AF.HCr = Math.max(stats.AF.sHCr, stats.AF.HCgm) + stats.AF.HcsStage

    stats.AF.PVNuit = stats.AF.TSVnuit * CONFIG_AF.coefMajoNuit // en PVEI (xKSP pour LC PEQ2)
    stats.AF.PVCDB = stats.countVol * CONFIG_AF.coefPVCDB

    stats.TO.eHS = stats.TO.HCrm - stats.TO.seuilHS
    stats.AF.eHS = stats.AF.HC - stats.AF.seuilHS

    stats.TO.HS = Math.max(0, stats.TO.eHS)
    stats.AF.HS = Math.max(0, stats.AF.eHS)

    if (this.month.year < 2020) {
      stats.eHS = stats.TO.eHS
      stats.HC = stats.TO.HCrm
    } else {
      stats.eHS = stats.AF.eHS
      stats.HC = stats.AF.HC
    }

    this.stats = stats

    console.log('RemuPNT.calculMois', stats)

    return stats
  }

  calculSalaireTO(bareme, profil) {
    _.defaults(profil, PROFIL_DEFAULTS)
    const stats = this.stats

    const salaire = {
      fixe: _.get(bareme, ['TO', profil.grille, profil.anciennete, 0].join('.')),
      PV: _.get(bareme, ['TO', profil.grille, profil.anciennete, 1].join('.')),
      PV75HC: _.get(bareme, ['TO', profil.grille, profil.anciennete, 2].join('.')),
      SMMG: _.get(bareme, ['TO', profil.grille, profil.anciennete, 3].join('.'))
    }

    const pvSMMGTO = stats.TO.trentiemes * CONFIG_TO.PVSMMG / 30
    const nbPVCompTO = stats.TO.HCrm > pvSMMGTO ? Math.min(stats.TO.HCrm - pvSMMGTO, stats.TO.seuilHS - pvSMMGTO): 0
    const tauxHSTO = (1.25 * salaire.PV75HC) + (1.25 * salaire.fixe) / 75
    const taux30eSMMGTO = salaire.SMMG / 30

    _.extend(salaire, {
      PVSMMG: pvSMMGTO,
      tauxSMMG: taux30eSMMGTO,
      retraitTrentiemes: (-stats.TO.NJabs) * taux30eSMMGTO,
      maladie: stats.count.maladie *taux30eSMMGTO,
      stage: stats.TO.NJstage * taux30eSMMGTO,
      nbPVcomp: nbPVCompTO,
      PVcomp: nbPVCompTO * salaire.PV,
      tauxHS: tauxHSTO,
      HS: stats.TO.HS * tauxHSTO
    })

    const brutHorsCongesTO = salaire.SMMG + salaire.retraitTrentiemes + salaire.maladie + salaire.stage + salaire.PVcomp + salaire.HS
    const tauxCongesTO = brutHorsCongesTO / (30 - stats.count.conges)

    _.extend(salaire, {
      tauxConges: tauxCongesTO,
      conges: stats.count.conges * tauxCongesTO,
      brut: brutHorsCongesTO + stats.count.conges * tauxCongesTO
    })

    console.log('RemuPNT.salaireTO', salaire)

    return salaire
  }

  calculSalaireAF(bareme, profil) {
    _.defaults(profil, PROFIL_DEFAULTS)
    const stats = this.stats

    const coefClasse = (_.get(CONFIG_AF.classes, [profil.fonction, profil.classe].join('.')) + ((profil.fonction != 'CDB' && profil.atpl) ? CONFIG_AF.bonificationATPL : 0)) * _.get(CONFIG_AF.coefCategorie, profil.categorie)

    const remu = {
      fixe: bareme.AF.fixeCDBA1 * _.get(CONFIG_AF.coefEchelon, profil.echelon) * (profil.fonction != 'CDB' ? CONFIG_AF.coefFixeOPL : 1),
      PVEI: bareme.AF.THB * coefClasse,
      coefClasse
    }

    const PVMGA100 = CONFIG_AF.PVMGA * remu.PVEI
    const MGA100 = remu.fixe + PVMGA100
    const taux30eMGA = MGA100 / 30
    const PVMGA = stats.AF.trentiemes * CONFIG_AF.PVMGA / 30
    const PVCDB = (profil.fonction == 'CDB') ? stats.AF.PVCDB : 0
    const totalPV = stats.AF.PV + stats.AF.PVNuit + PVCDB
    const nbPVcomp = Math.max(totalPV - PVMGA, 0)

    const tauxHSTF = 1.25 * remu.fixe / 75
    const tauxHSPV = remu.PVEI * 0.25 * totalPV / stats.AF.HC

    _.extend(remu, {
      PVMGA100,
      PVMGA,
      tauxMGA: taux30eMGA,
      deductionAbsence: (-stats.AF.NJabs) * taux30eMGA,
      maladie: stats.count.maladie * taux30eMGA,
      PVCDB,
      totalPV,
      nbPVcomp,
      montantPVcomp: nbPVcomp * remu.PVEI,
      tauxHSTF,
      montantHSTF: tauxHSTF * stats.AF.HS,
      tauxHSPV,
      montantHSPV: tauxHSPV * stats.AF.HS
    })

    const totalBrutHorsConges = MGA100 + remu.deductionAbsence + remu.maladie + remu.montantPVcomp + remu.montantHSTF + remu.montantHSPV

    const tauxConges = (totalBrutHorsConges / (30 - stats.count.conges)) * 30/28
    const montantConges = stats.count.conges * tauxConges

    _.extend(remu, {
      tauxConges,
      montantConges,
      totalBrut: totalBrutHorsConges + montantConges
    })

    console.log('RemuPNT.salaireAF', remu)

    return remu
  }

  groupJoursSol() {
    const solTags = ['sol', 'simu', 'instructionSol', 'instructionSimu', 'stage', 'delegation', 'reserve']

    const eventsByDay = {}
    _.forEach(solTags, tag => {
      if (_.has(this.eventsByTag, tag) && _.isArray(this.eventsByTag[tag])) {
        _.forEach(this.eventsByTag[tag], evt => {
          if (evt.tag === 'simu' || evt.tag === 'instructionSimu') {
            evt.debut = toDateTime(evt.start).minus({ hours: 1 })
            evt.fin = toDateTime(evt.end).plus({ hours: 0.5 })
          } else {
            evt.debut = toDateTime(evt.start)
            evt.fin = toDateTime(evt.end)
          }
          const day = evt.debut.toISODate()
          if (_.has(eventsByDay, day)) {
            eventsByDay[day].push(evt)
          } else {
            eventsByDay[day] = [evt]
          }
        })
      }
    })

    this.joursSol = _.mapValues(eventsByDay, (events, date) => {
      const day = {
        date,
        events: _.sortBy(events, 'start')
      }

      day.debut = _.first(day.events).debut
      day.fin = _.last(day.events).fin

      const specialCategoryEvent = _.find(day.events, evt => _.includes(['simu', 'instructionSol', 'instructionSimu', 'stage', 'delegation', 'reserve'], evt.tag))
      if (specialCategoryEvent) {
        day.tag = specialCategoryEvent.tag
      } else {
        day.tag = _.first(day.events).tag
      }

      if (day.tag === 'simu' || day.tag === 'instructionSimu') {
        const Hsimu = _.reduce(day.events, (h, s) => (s.tag === 'simu' || s.tag === 'instructionSimu') ? h+s.fin.diff(s.debut).as('hours') : h , 0)

        if (day.tag === 'instructionSimu') {
          day.HcsAF = Hsimu > 2 ? CONFIG_AF.HcSimuInstruction : CONFIG_AF.HcDemiSimuInstruction
          day.PVAF = Hsimu > 2 ? CONFIG_AF.PVSimuInstruction : CONFIG_AF.PVDemiSimuInstruction
          day.majoNuitPVAF = _.reduce(day.events, (h, s) => s.tag === 'instructionSimu' ? h+this._hdn(s.debut, s.fin, CONFIG_AF.hdnSimuInstruction) : h , 0) * CONFIG_AF.coefMajoNuit
          // TODO : majoration de 6,5% des séances intégration et lâcher CDB

          day.HcSimuInstTO = CONFIG_TO.HcSimuInst + _.reduce(day.events, (h, s) => s.tag === 'instructionSimu' ? h+this._hdn(s.debut, s.fin, CONFIG_TO.hdn) : h , 0) * CONFIG_TO.coefMajoNuit // TODO : nuit sur temps de simu briefings inclus ou non ?
        }

        if (day.tag === 'simu') {
          day.HcsAF = Hsimu > 2 ? CONFIG_AF.HcSimu : CONFIG_AF.HcDemiSimu
          day.HcsTO = this._isDemiJournée(day, 12) ? CONFIG_TO.demiHcs : CONFIG_TO.Hcs
        }
      }

      if (day.tag === 'sol' || day.tag === 'reserve') {
        day.HcsAF = this._isDemiJournée(day, 13) ? CONFIG_AF.demiHcs : CONFIG_AF.Hcs
        day.HcsTO = this._isDemiJournée(day, 12) ? CONFIG_TO.demiHcs : CONFIG_TO.Hcs
      }

      if (day.tag === 'stage') {
        day.HcsAF = this._isDemiJournée(day, 13) ? CONFIG_AF.demiHcs : CONFIG_AF.Hcs
      }

      if (day.tag === 'instructionSol') {
        const isDemiJournéeAF = this._isDemiJournée(day, 13)
        day.HcsAF = isDemiJournéeAF ? CONFIG_AF.HcDemiInsructionSol : CONFIG_AF.HcInsructionSol
        day.PVAF = isDemiJournéeAF ? CONFIG_AF.PVDemiInsructionSol : CONFIG_AF.PVInsructionSol
        day.HcsiTO = this._isDemiJournée(day, 12) ? CONFIG_TO.demiHcsi : CONFIG_TO.Hcsi
      }

      if (day.tag === 'delegation') {
        day.HcsAF = CONFIG_AF.HcDelegation
        day.PVAF = CONFIG_AF.PVDelegation
        day.HcsrTO = CONFIG_TO.Hcsr
      }

      return day
    })
  }

  _isDemiJournée(day, splitHour = 12) {
    if (_.some(day.events, evt => /CEMPN/i.test(evt.summary))) return false
    if (day.fin.diff(day.debut).as('hours') > 4 ) return false

    const mijournée = day.debut.set({ hour: splitHour, minute: 0 })
    if (day.debut >= mijournée || day.fin <= mijournée) return true

    return false
  }

  completeRotations() {
    _.forEach(this.eventsByTag.rotation, rot => {
      rot.sv = _.map(rot.sv, sv => {
        sv.events = _.map(sv.events, s => {
          return this.completeVol(s)
        })
        return this.completeSV(sv)
      })

      rot.vols = _.filter(rot.events, { tag: 'vol' })

      rot.tv = sumBy(rot.events, 'tv')
      rot.tvp = sumBy(rot.events, 'tvp')
      rot.countVol = sumBy(rot.sv, 'countVol')
      rot.mep = sumBy(rot.sv, 'mep')
      rot.countMEP = sumBy(rot.sv, 'countMEP')
      rot.H1TO = sumBy(rot.sv, 'H1TO')
      rot.H1AF = sumBy(rot.sv, 'H1AF')
      rot.H1rAF = sumBy(rot.sv, 'H1rAF')
      rot.HVnuit = sumBy(rot.sv, 'HVnuit')
      rot.TSVnuit = sumBy(rot.sv, 'TSVnuit')

      const debutAbs = _.first(rot.sv).debutTR // (!) normalement le temps d'absence débute en fonction de l'heure programmée uniquement / debutTR est calculé en prenant en compte le bloc réalisé si antérieur
      const lastSV = _.last(rot.sv)
      const finAbsTOprog = lastSV.countVol ? lastSV.finTRprog : lastSV.finTR
      const finAbsAFprog = lastSV.countVol ? lastSV.finTSVrAFprog : lastSV.finTR

      rot.nbjoursTO = finAbsTOprog.startOf('day').diff(debutAbs.startOf('day'), 'days').as('days') + 1
      rot.nbjoursAF = finAbsAFprog.startOf('day').diff(debutAbs.startOf('day'), 'days').as('days') + 1

      if (lastSV.finTR.day === finAbsTOprog.day + 1 && lastSV.finTR.hour >= 1) rot.nbjoursTO++
      if (lastSV.finTSVrAF.day === finAbsAFprog.day + 1 && lastSV.finTSVrAF.hour >= 1) rot.nbjoursAF++

      rot.HcaTO = rot.nbjoursTO * CONFIG_TO.hcaParJour
      rot.HcaAF = rot.nbjoursAF * CONFIG_AF.hcaParJour

      rot.H2TO = Math.max(rot.HcaTO, rot.H1TO)
      rot.H2AF = Math.max(rot.HcaAF, rot.H1AF)
      rot.H2rAF = Math.max(rot.HcaAF, rot.H1rAF)

      const debut = rot.debut = debutAbs
      const fin = rot.fin = lastSV.finTSVrAF

      if (debut.month !== fin.month) {
        rot.split = {
          [debut.month]: {
            TSVnuit: sumByMonth(rot.sv, 'TSVnuit', debut.month, 'debutTR'),
            countVol: _.reduce(rot.vols, (count, s) => (s.debutR.month === debut.month) ? count+1 : count , 0),
            tv: sumByMonth(rot.vols, 'tv', debut.month),
            tvp: sumByMonth(rot.vols, 'tvp', debut.month),
            mep: sumByMonth(rot.events, 'mep', debut.month),
            HVnuit: sumByMonth(rot.vols, 'HVnuit', debut.month),
            nbjours: debut.endOf('month').diff(debut.endOf('day')).as('days') + 1
          },
          [fin.month]: {
            TSVnuit: sumByMonth(rot.sv, 'TSVnuit', fin.month),
            countVol: _.reduce(rot.vols, (count, s) => (s.debutR.month === fin.month) ? count+1 : count , 0),
            tv: sumByMonth(rot.vols, 'tv', fin.month),
            tvp: sumByMonth(rot.vols, 'tvp', fin.month),
            mep: sumByMonth(rot.events, 'mep', fin.month),
            HVnuit: sumByMonth(rot.vols, 'HVnuit', fin.month),
            nbjours: fin.startOf('day').diff(fin.startOf('month')).as('days') + 1
          }
        }

        const prorata = {
          [debut.month]: (rot.split[debut.month].tv + (rot.split[debut.month].mep / 2)) / (rot.tv + (rot.mep / 2)),
          [fin.month]: (rot.split[fin.month].tv + (rot.split[fin.month].mep / 2)) / (rot.tv + (rot.mep / 2))
        }

        _.assign(rot.split[debut.month], {
          H2TO: rot.H2TO * prorata[debut.month],
          H2AF: rot.H2AF * prorata[debut.month],
          H2rAF: rot.H2rAF * prorata[debut.month]
        })

        _.assign(rot.split[fin.month], {
          H2TO: rot.H2TO * prorata[fin.month],
          H2AF: rot.H2AF * prorata[fin.month],
          H2rAF: rot.H2rAF * prorata[fin.month]
        })
      }
    })
  }

  completeSV(sv) {
    const counts = { vol: sv.countVol, mep: sv.countMEP }
    const groups = _.defaults(_.groupBy(sv.events, 'tag'), { vol: [], mep: [] })

    _.extend(sv, {
      tv: counts.vol ? _.sumBy(groups.vol, 'tv') : 0,
      tvp: counts.vol ? _.sumBy(groups.vol, 'tvp') : 0,
      mep: counts.mep ? _.sumBy(groups.mep, 'mep') : 0,
      HVnuit: counts.vol ? _.sumBy(groups.vol, 'HVnuit') : 0,
      vols: groups.vol
    })

    sv.tme = counts.vol ? sv.tv / sv.countVol : 0
    sv.cmt = counts.vol ? Math.max(70 / ( 21 * Math.max(sv.tme, 1) + 30), 1) : 0

    const first = _.first(sv.events),
			last = _.last(sv.events),
			lastVol = _.last(groups.vol);
		let preTs, preTsv, postTs, postTsv;

		//Calcul TR, TS et TSV
		if (first.tag === 'mep') {
			// Le service de vol commence par une MEP
			preTs = CONFIG_RU.preTsMep;
			preTsv = CONFIG_RU.preTsvMep;
		} else if (first.from === 'ORY') {
			// Le service de vol commence en base
			preTs = CONFIG_RU.preTsBase;
			preTsv = CONFIG_RU.preTsvBase;
		} else {
			// Le service de vol commence en escale
			preTs = CONFIG_RU.preTsEscale;
			preTsv = CONFIG_RU.preTsvEscale;
		}

		if (last.tag === 'mep') {
			// Le service de vol termine par une MEP
			postTs = CONFIG_RU.postTsMep;
			postTsv = CONFIG_RU.postTsvMep;
		} else {
			// Le service de vol termine par un vol
			postTs = CONFIG_RU.postTs;
			postTsv = CONFIG_RU.postTsv;
		}

    _.extend(sv, {
      tsStart: first.debut.minus({ hours: preTs }),
			tsvStart: first.debut.minus({ hours: preTsv }),
			tsEnd: last.tag === 'vol' ? last.finR.plus({ hours: postTs }) : last.fin.plus({ hours: postTs }),
      tsvEnd: sv.countVol ? lastVol.finR.plus({ hours: postTsv }) : first.debut.minus({ hours: preTsv })
		})

    if (sv.type === 'vol') {
      sv.debut = toDateTime((first.tag === 'vol' ? first.real : first).start)
      sv.debutTR = DateTime.fromMillis(first.tag === 'vol' ? Math.min(first.start, first.real.start) : first.start, { zone: TIMEZONE }).minus({ hours: CONFIG_TO.preTR })
      sv.finTRprog = toDateTime(lastVol.end).plus({ hours: CONFIG_TO.postTR })
      sv.finTSVrAFprog = toDateTime(last.end).plus({ hours: CONFIG_AF.postTSVr })
      sv.finTR = toDateTime(lastVol.real.end).plus({ hours: CONFIG_TO.postTR })
      sv.finTSVrAF = toDateTime((last.tag === 'vol' ? last.real : last).end).plus({ hours: CONFIG_AF.postTSVr })
      sv.HctTO = Math.max(sv.finTR.diff(sv.debutTR).as('hours'), CONFIG_TO.TRMini) * CONFIG_TO.coefTR

      const tsvrAF = sv.finTSVrAF.diff(sv.debutTR).as('hours')
      if (CONFIG_AF.coefTSV10 && tsvrAF > 10) {
        sv.HctAF = tsvrAF * CONFIG_AF.coefTSV10
      } else {
        sv.HctAF = Math.max(tsvrAF, CONFIG_AF.tsvMini) * CONFIG_AF.coefTSV
      }
    } else {
      sv.debut = toDateTime(first.start)
      sv.debutTR = toDateTime(first.start).minus({ hours: CONFIG_TO.preTR })
      sv.finTR = sv.debutTR
      sv.finTSVrAF = toDateTime(last.end).plus({ hours: CONFIG_AF.postTSVr })
      sv.HctTO = 0
      sv.HctAF = sv.finTSVrAF.diff(sv.debutTR).as('hours') * CONFIG_AF.coefTSV
    }

    sv.HcvTO = (sumBy(groups.vol, 'hv100TO') * sv.cmt) + (sumBy(groups.mep, 'mep') / 2)
    sv.H1TO = Math.max(sv.HctTO, sv.HcvTO)
    sv.HcvAF = (sumBy(groups.vol, 'hv100AF') * sv.cmt) + (sumBy(groups.mep, 'mep') / 2)
    sv.HcvrAF = (sumBy(groups.vol, 'hv100rAF') * sv.cmt) + (sumBy(groups.mep, 'mep') / 2)
    sv.H1AF = Math.max(sv.HctAF, sv.HcvAF)
    sv.H1rAF = Math.max(sv.HctAF, sv.HcvrAF)

    if (sv.type === 'mep') {
      sv.TSVnuit = 0
    } else {
      const MEPnuit = sv.countMEP ? _.reduce(groups.mep, (sum, evt) => {
        if (evt.tag === 'mep') {
          return sum + this._hdn(evt.debut, toDateTime(evt.end), CONFIG_AF.hdn)
        } else {
          return sum
        }
      }, 0) : 0
      sv.TSVnuit = this._hdn(sv.debutTR, sv.finTSVrAF, CONFIG_AF.hdn) - MEPnuit

      if (sv.debutTR.month !== sv.finTSVrAF.month) {
        const splitMEPnuit = sv.countMEP ? _.reduce(sv.events, (split, evt) => {
          if (evt.tag === 'mep') {
            const debut = toDateTime(evt.start),
                  fin = toDateTime(evt.end)
            if (debut.month !== fin.month) {
              split[debut.month] += this._hdn(debut, debut.endOf('month'), CONFIG_AF.hdn)
              split[fin.month] += this._hdn(fin.startOf('month'), fin, CONFIG_AF.hdn)
              return split
            } else {
              split[debut.month] += this._hdn(debut, fin, CONFIG_AF.hdn)
              return split
            }
          } else {
            return split
          }
        }, {[sv.debutTR.month]: 0, [sv.finTSVrAF.month]: 0}) : 0

        sv.split = {
          [sv.debutTR.month]: {
            TSVnuit: this._hdn(sv.debutTR, sv.debutTR.endOf('month'), CONFIG_AF.hdn) - splitMEPnuit[sv.debutTR.month]
          },
          [sv.finTSVrAF.month]: {
            TSVnuit: this._hdn(sv.finTSVrAF.startOf('month'), sv.finTSVrAF, CONFIG_AF.hdn) - splitMEPnuit[sv.finTSVrAF.month]
          }
        }
      }
    }
    return sv
  }

  completeVol(s) {
    if (s.tag === 'vol') {
      if (!_.has(s, 'real')) {
        s.real = {}
      }
      
      _.defaults(s.real, {
        start: s.start,
        end: s.end
      })

      const debut = toDateTime(s.start)
      const fin = toDateTime(s.end)
      const debutR = toDateTime(s.real.start)
      const finR = toDateTime(s.real.end)

      _.assign(s, { debut, fin, debutR, finR })

      s.tvp = s.fin.diff(s.debut).as('hours')
      s.tv = s.finR.diff(s.debutR).as('hours')

      const debutNuit = DateTime.fromMillis(Math.min(s.start, s.real.start), { zone: TIMEZONE })
      const finNuit = debutNuit.plus({ hours: s.tv })
      s.HVnuit = this._hdn(debutNuit, finNuit, CONFIG_TO.hdn)
      // console.log(s, debutNuit.toString(), finNuit.toString(), s.HVnuit)

      if ((s.from === 'CDG' && s.to === 'ORY') || (s.from === 'ORY' && s.to === 'CDG')) {
        s.pogo = true
        s.hv100TO = CONFIG_TO.hcPogo
        s.hv100AF = CONFIG_AF.hcPogo
        s.hv100rAF = CONFIG_AF.hcPogo
      } else {
        s.hv100TO = findHV100TO(s) || s.tvp
        s.tvrefAF = findHV100AF(s) || s.tvp
        s.hv100AF = Math.max(s.tvrefAF, s.tv)
        s.hv100rAF = s.tvrefAF + CONFIG_AF.bonusEtape // TODO: Bonus majoré des étapes de plus de 2100 (aucune à ce jour)
      }

      if (debutR.month !== finR.month) {
        s.split = {
          [debutR.month]: {
            HVnuit: this._hdn(debutNuit, debutR.endOf('month'), CONFIG_TO.hdn),
            tv: debutR.endOf('month').diff(debutR).as('hours'),
            tvp: debutR.endOf('month').diff(debut).as('hours')
          },
          [finR.month]: {
            HVnuit: this._hdn(finR.startOf('month'), finNuit, CONFIG_TO.hdn),
            tv: finR.diff(finR.startOf('month')).as('hours'),
            tvp: fin.diff(finR.startOf('month')).as('hours')
          }
        }
      }
    }

    if (s.tag === 'mep') {
      const debut = toDateTime(s.start)
      const fin = toDateTime(s.end)

      _.assign(s, { debut, fin })

      s.mep = s.category == "ENGS" ? 0 : fin.diff(debut).as('hours')
      s.tv = 0
      s.tvp = 0
      s.HVnuit= 0

      if (debut.month !== fin.month) {
        s.split = {
          [debut.month]: {
            mep: debut.endOf('month').diff(debut).as('hours')
          },
          [fin.month]: {
            mep: fin.diff(fin.startOf('month')).as('hours')
          }
        }
      }
    }
    return s
  }

  _jours(events, month) {
    const dates = []
    _.forEach(events, evt => {
      let date = evt.debut.startOf('day')

      if (evt.fin < evt.debut) throw new Error("fin avant debut")
      if (!evt.fin || !evt.fin.isValid) throw new Error("fin invalide")
      if (!evt.debut || !evt.debut.isValid) throw new Error("debut invalide")

      while (date <= evt.fin) {
        if (date.month === month) {
          dates.push(date.toISODate())
        }
        date = date.plus({ days: 1 })
      }
    })
    return _.uniq(dates)
  }

  _hdn(debut, fin, configHDN) {
  	debut = debut.setZone(TIMEZONE)
    fin = fin.setZone(TIMEZONE)
    const interval = Interval.fromDateTimes(debut, fin)
    const nightEnd = debut.set(configHDN.nightEnd), nightStart = debut.set(configHDN.nightStart)
    const prevNight = Interval.fromDateTimes(debut.startOf('day'), nightEnd)
    const nextNight = Interval.fromDateTimes(nightStart, nightStart.plus({ days: 1 }).set(configHDN.nightEnd))

    const prevInt = interval.intersection(prevNight)
    const nextInt = interval.intersection(nextNight)

  	return (prevInt ? prevInt.length('hours'): 0) + (nextInt ? nextInt.length('hours') : 0)
  }
}
