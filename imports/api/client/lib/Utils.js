import _ from 'lodash'
import { DateTime } from 'luxon';

/**
* Helper functions
**/
export default {
	tags: [
		'rotation',
		'vol',
		'mep',
		'absence',
		'conges',
		'sanssolde',
		'blanc',
		'jisap',
		'repos',
		'maladie',
		'greve',
		'stage',
		'sol',
		'instructionSol',
		'simu',
		'instructionSimu',
		'reserve',
		'delegation',
		'npl',
		'autre'
	],

	alldayTags: [
		'absence',
		'conges',
		'sanssolde',
		'blanc',
		'jisap',
		'repos',
		'maladie',
		'greve',
		'npl'
	],

	categories: {
		FLT: 'vol',

		'36H': 'repos',
		'36HD': 'repos',
		'48H': 'repos',
		'48HD': 'repos',
		'60H': 'repos',
		'60HD': 'repos',
		ABSJ: 'autre',
		ABSJNP: 'absence',
		ABSMS: 'autre',
		ABSNJ: 'absence',
		ABST: 'absence',
		APRS: 'sol',
		AT: 'maladie',
		ATQP_AV: 'sol',
		ATQP_PNC: 'sol',
		ATQP_SS: 'sol',
		BEPC: 'stage',
		BEPN: 'stage',
		BEPT: 'stage',
		BLANCVOL: 'blanc',
		BLC_REG: 'blanc',
		BURC: 'sol',
		BURC_INS: 'sol',
		BURT: 'sol',
		BURV: 'sol',
		BUR_MIN: 'sol',
		BUR_TT: 'sol',
		C1: 'simu',
		C1_R: 'simu',
		C2: 'simu',
		C2_R: 'simu',
		CA: 'conges',
		CAHC: 'conges',
		CAHS: 'maladie',
		CAP: 'conges',
		CAPA: 'sanssolde',
		CAR: 'autre',
		CAT3: 'simu',
		CCE: 'sanssolde',
		CEX: 'conges',
		CHL: 'simu',
		CHL_NTO: 'simu',
		CIF: 'sanssolde',
		CNIC: 'sol',
		CNIP: 'sol',
		CPA: 'conges',
		CPBLANC: 'conges',
		CPBLCVOL: 'conges',
		CPE: 'sanssolde',
		CPI: 'conges',
		CPP: 'sanssolde',
		CRM: 'sol',
		CRMC: 'sol',
		CRMT: 'sol',
		CSFOR_CC: 'sol',
		CSFOR_INS: 'sol',
		CSFOR_INS1: 'sol',
		CSFOR_INS2: 'sol',
		CSFOR_INS3: 'sol',
		CSFOR_INS4: 'sol',
		CSFOR_INS5: 'sol',
		CSFOR_INS6: 'sol',
		CSFOR_INS7: 'sol',
		CSIC: 'sol',
		CSIP: 'sol',
		CSS: 'sanssolde',
		CSST: 'sol',
		CSS_10_COM: 'stage',
		CSS_C0: 'stage',
		CSS_C1_737: 'stage',
		CSS_C1_GEN: 'stage',
		CSS_C2_737: 'stage',
		CSS_C2_GEN: 'stage',
		CSS_C3_737: 'stage',
		CSS_C3_GEN: 'stage',
		CSS_C4_737: 'stage',
		CSS_C5_737: 'stage',
		CSS_C5_GEN: 'stage',
		CSS_C6: 'stage',
		CSS_C7_COM: 'stage',
		CSS_C8_COM: 'stage',
		CSS_C9_COM: 'stage',
		CSS_CQP: 'stage',
		CSS_T1: 'stage',
		CSS_T2: 'stage',
		CSS_T3: 'stage',
		CSS_T4: 'stage',
		CSS_T5: 'stage',
		CSS_T6: 'stage',
		CSS_T7: 'stage',
		CS_ATPL: 'sol',
		CS_ATQ_PNC: 'sol',
		CS_CPT_J1: 'sol',
		CS_CPT_J2: 'sol',
		CS_CPT_J3: 'sol',
		CS_CPT_J4: 'sol',
		CS_CPT_J5: 'sol',
		CS_CRM_C: 'sol',
		CS_CRM_M: 'sol',
		CS_CRM_S: 'sol',
		CS_CSR_J1: 'sol',
		CS_CSR_J2: 'sol',
		CS_CSR_J3: 'sol',
		CS_CSR_J4: 'sol',
		CS_CSR_J5: 'sol',
		CS_CSS_J0: 'sol',
		CS_CSS_J1: 'sol',
		CS_CSS_J10: 'sol',
		CS_CSS_J2: 'sol',
		CS_CSS_J3: 'sol',
		CS_CSS_J4: 'sol',
		CS_CSS_J5: 'sol',
		CS_CSS_J6: 'sol',
		CS_CSS_J7: 'sol',
		CS_CSS_J8: 'sol',
		CS_CSS_J9: 'sol',
		CS_FOR_CC1: 'sol',
		CS_FOR_CC2: 'sol',
		CS_FOR_CC3: 'sol',
		CS_FOR_CC4: 'sol',
		CS_FOR_CC5: 'sol',
		CS_FOR_CC6: 'sol',
		CS_FOR_PNC: 'sol',
		CS_MDC_COM: 'sol',
		CS_MDC_J1: 'sol',
		CS_MDC_J2: 'sol',
		CS_MDC_J3: 'sol',
		CS_MD_M: 'sol',
		CS_MD_S: 'sol',
		CS_OCC_J1: 'sol',
		CS_OCC_J10: 'sol',
		CS_OCC_J13: 'sol',
		CS_OCC_J14: 'sol',
		CS_OCC_J15: 'sol',
		CS_OCC_J16: 'sol',
		CS_OCC_J17: 'sol',
		CS_OCC_J2: 'sol',
		CS_OCC_J3: 'sol',
		CS_OCC_J4: 'sol',
		CS_OCC_PNT: 'stage',
		CS_PMR_S: 'sol',
		CS_PNT_MDC: 'sol',
		CS_PNT_S: 'sol',
		CS_PRE_CPT: 'sol',
		CS_QT_PNT: 'stage',
		CS_RGE: 'stage',
		CS_SEL_CPT: 'sol',
		CS_SGS_PNC: 'sol',
		DET: 'sanssolde',
		DGAC: 'sol',
		DHD: 'mep',
		DIF: 'autre',
		DIFE: 'autre',
		DIFNPE: 'sanssolde',
		E1: 'simu',
		E1_R: 'simu',
		E2: 'simu',
		E2_R: 'simu',
		ECP: 'sol',
		ECPC: 'sol',
		ECPT: 'sol',
		EFB: 'sol',
		EIA: 'sol',
		EIP: 'sol',
		ELEARNMD1: 'sol',
		ELEARNMD2: 'sol',
		ELEARNSE: 'sol',
		ELEARNSGS: 'sol',
		ELEARNSSA: 'sol',
		ELEARNSURT: 'sol',
		ELEARN_GEN: 'sol',
		EMAL: 'autre',
		ENGST: 'mep',
		ENT: 'simu',
		ENT1: 'simu',
		ENT2: 'simu',
		ENTM: 'sol',
		ENTP: 'sol',
		ENT_CPT: 'sol',
		ENT_SFI: 'sol',
		ENT_TRI: 'sol',
		EVAL: 'simu',
		E_APRS: 'sol',
		E_ETECHLOG: 'sol',
		E_LEARN: 'sol',
		E_LEARN_RH: 'sol',
		E_MNPS: 'sol',
		FCL: 'sol',
		FOR_CC: 'sol',
		FOR_CC_J1: 'sol',
		FOR_CC_J2: 'sol',
		FOR_CC_J3: 'sol',
		FOR_CC_J4: 'sol',
		FOR_CC_J5: 'sol',
		FOR_INS: 'sol',
		FT1: 'simu',
		FT2: 'simu',
		GREVE: 'greve',
		HDP: 'sol',
		HS: 'maladie',
		HS_P: 'maladie',
		HTL: 'reserve',
		INAPT: 'blanc',
		JDCC: 'delegation',
		JDD: 'delegation',
		JDDAF: 'delegation',
		JDDC: 'delegation',
		JDDO: 'delegation',
		JDDP: 'delegation',
		JISAP: 'jisap',
		JKR: 'blanc',
		LOE: 'simu',
		LOE1: 'simu',
		LOE2: 'simu',
		LOFT: 'simu',
		LVO: 'simu',
		MAINTIEN: 'blanc',
		MAP: 'absence',
		MAT: 'blanc',
		MD: 'sol',
		MDC_737_1: 'sol',
		MDC_737_2: 'sol',
		MDC_COM: 'sol',
		MDC_GEN_1: 'sol',
		MDC_GEN_2: 'sol',
		MDC_J1_PNC: 'sol',
		MDC_T1: 'sol',
		MDC_T2: 'sol',
		MDC_T3: 'sol',
		MD_C: 'sol',
		MD_E_LEARN: 'sol',
		MD_T: 'sol',
		MEET: 'sol',
		MEP: 'mep',
		MEPI: 'mep',
		MINS: 'sol',
		MINT: 'sol',
		MISN: 'sol',
		MITHE: 'sanssolde',
		MTE: 'sol',
		NAVT: 'mep',
		NEGO: 'delegation',
		NPL: 'npl',
		OCC_CBT: 'stage',
		OCC_PNT: 'stage',
		OCC_REP1: 'stage',
		OCC_REP2: 'stage',
		OFF: 'repos',
		OFFAT: 'maladie',
		OFFC: 'repos',
		OFFD: 'repos',
		OFFE: 'repos',
		OFFG: 'repos',
		OFFHS: 'maladie',
		OFFR: 'repos',
		PHC: 'sanssolde',
		PMR: 'sol',
		PPV: 'sol',
		PRAT_SS: 'sol',
		PREQT: 'stage',
		QT: 'stage',
		RAF: 'sol',
		RAFC: 'sol',
		RCSE: 'delegation',
		REFCC: 'sol',
		REIT: 'sol',
		REMA: 'sol',
		RES: 'reserve',
		RETRAIT: 'sanssolde',
		REVSYST: 'stage',
		REVSYST_IN: 'sol',
		RFQ: 'stage',
		RPC: 'repos',
		RSCC: 'delegation',
		RSOL: 'sol',
		RSYC: 'delegation',
		RSYO: 'delegation',
		RSYP: 'delegation',
		RTC_J1: 'sol',
		RTC_J2: 'sol',
		RTC_J3: 'sol',
		SADE_CDD: 'stage',
		SECO: 'sol',
		SGS_C: 'sol',
		SIMI: 'simu',
		SIMU: 'simu',
		SIMU_ATPL: 'simu',
		SIMU_CPT1: 'simu',
		SIMU_CPT2: 'simu',
		SIMU_CPT3: 'simu',
		SIMU_CPT4: 'simu',
		SIMU_CPT5: 'simu',
		SIMU_CPT6: 'simu',
		SIMU_CPT7: 'simu',
		SIMU_CPT8: 'simu',
		SIMU_FNC: 'simu',
		SIMU_NTO: 'simu',
		SIMU_PD: 'simu',
		SIMU_PQT: 'simu',
		SIMU_QT: 'simu',
		SIMU_QT_EX: 'simu',
		SS: 'sol',
		SS1_T: 'sol',
		SS3: 'sol',
		SS3_T: 'sol',
		STAG: 'sol',
		STAGE_CPT1: 'stage',
		STAGE_CPT2: 'stage',
		STAGE_CPT3: 'stage',
		STAGE_CPT4: 'stage',
		STAGE_CPT5: 'stage',
		STAGE_L3: 'stage',
		STBY: 'reserve',
		ST_INS_PNC: 'sol',
		SUP: 'simu',
		SUR: 'sol',
		SURC: 'sol',
		SUR_ELEARN: 'sol',
		SUR_T: 'sol',
		SUSCONTRAT: 'sanssolde',
		S_PRE_CPT: 'simu',
		S_SEL_CPT: 'simu',
		TAD: 'sanssolde',
		TAF: 'sanssolde',
		TAL: 'sanssolde',
		UNFIT: 'blanc',
		UNIF: 'sol',
		UPRT: 'simu',
		VHL: 'sol',
		VIS: 'sol',
		VM: 'sol',
		VMC: 'sol',
		VMM4: 'sol',
		VMP4: 'sol',
		VMPC: 'sol',
		VMT: 'sol',
		WORK: 'sol',
		WORK_PNC: 'sol'
	},

	codesInstruction: {
		// Cours sol dispensés par un instructeur
		'CS_MDC_J': { type: 'sol', tags: [ 'instructeur', 'mdc' ], title: "Cours au sol dispensé par un INS PN dans le cadre d’un MDC" },
		'CS_CSS_J': { type: 'sol', tags: [ 'instructeur', 'stage', 'sade' ], title: "Cours au sol dispensé par un INS PN dans le cadre d’un SADE" },
		'CS_CPT_J': { type: 'sol', tags: [ 'instructeur', 'stage', 'cdb' ], title: "Cours au sol dispensé par un INS PNT dans le cadre d’un stage CPT" },

		// Cours sol SADE, MDC, reprise
		'CRM_T': { type: 'sol', tags: [], title: "Cours CRM PNT" }, // SADE ou MDC
		'CSS_T': { type: 'sol', tags: [ 'stage', 'sade' ], title: "Cours au sol SADE PNT" },
		'MDC_T': { type: 'sol', tags: [], title: "Cours au sol MDC PNT" },
		'MD_T': { type: 'sol', tags: [], title: "Cours marchandises dangereuses pour PNT" },
		'SS1_T': { type: 'sol', tags: [], title: "Cours sécurité sauvetage PNT" }, // SADE ou MDC ou reprise
		'SS2_T': { type: 'sol', tags: [], title: "Cours sécurité sauvetage PNT" }, // SADE ou MDC ou reprise
		'SS3_T': { type: 'sol', tags: [], title: "Cours sécurité sauvetage PNT" }, // SADE ou MDC ou reprise
		'SUR_T': { type: 'sol', tags: [], title: "Cours sureté PNT" }, // SADE ou MDC

		'CRM_C': { type: 'sol', tags: [], title: "Cours CRM PNC" }, // SADE ou MDC
		'CSS_C': { type: 'sol', tags: [ 'stage', 'sade' ], title: "Cours au sol SADE PNC" },
		'MDC_C': { type: 'sol', tags: [], title: "Cours au sol MDC PNC" },
		'MD_C': { type: 'sol', tags: [], title: "Cours marchandises dangereuses pour PNC" },
		'SS1_C': { type: 'sol', tags: [], title: "Cours sécurité sauvetage PNC" }, // SADE ou MDC ou reprise
		'SS2_C': { type: 'sol', tags: [], title: "Cours sécurité sauvetage PNC" }, // SADE ou MDC ou reprise
		'SS3_C': { type: 'sol', tags: [], title: "Cours sécurité sauvetage PNC" }, // SADE ou MDC ou reprise
		'SUR_C': { type: 'sol', tags: [], title: "Cours sureté PNC" }, // SADE ou MDC

		'CS_ATPL': { type: 'sol', tags: [ 'atpl' ], title: "Cours au sol pour formation ATPL" },

		'QT': { type: 'sol', tags: [ 'stage' ], title: "Qualification de type" },

		// Activités sol pre-CPT et stage CPT
		'CS_PRE_CPT': { type: 'sol', tags: [ 'cdb' ], title: "Cours au sol pour formation Pré CPT" },
		'CS_SEL_CPT': { type: 'sol', tags: [ 'cdb' ], title: "Cours au sol pour sélection CPT" },
		'ENT_CPT': { type: 'sol', tags: [ 'cdb' ], title: "Entretien individuel pour sélection CPT" },
		'STAGE_CPT': { type: 'sol', tags: [ 'stage', 'cdb' ], title: "Cours au sol stage CPT" },

		// simus
		'C1': { type: 'simu', tags: [ 'controle' ], title: "C1" },
		'C1_R': { type: 'simu', tags: [ 'controle' ], title: "C1 de reprise" },
		'C1_R': { type: 'simu', tags: [ 'controle' ], title: "C1 de reprise" },
		'C2': { type: 'simu', tags: [ 'controle' ], title: "C2" },
		'C2_R': { type: 'simu', tags: [ 'controle' ], title: "C2 de reprise" },
		'LOE': { type: 'simu', tags: [ 'controle' ], title: "LOE" },
		'E1': { type: 'simu', tags: [], title: "Entrainement E1 de l'année en cours" },
		'E1_R': { type: 'simu', tags: [], title: "E1 de reprise" },
		'E2': { type: 'simu', tags: [], title: "E2" },
		'E2_R': { type: 'simu', tags: [], title: "E2 de reprise" },
		'SIMU_ATPL': { type: 'simu', tags: [ 'controle', 'atpl' ], title: "Epreuve pratique ATPL" },
		'SIMU_CPT': { type: 'simu', tags: [ 'stage', 'cdb' ], title: "Simu stage CPT" },
		'SIMU_QT': { type: 'simu', tags: [ 'stage', 'qt' ], title: "Simu QT" },
		'SIMU_R1': { type: 'simu', tags: [ 'reprise' ], title: "Module de reprise" },
		'SIMU_R2': { type: 'simu', tags: [ 'reprise' ], title: "Deuxième simu de reprise avant l'entrainement" },
		'S_PRE_CPT': { type: 'simu', tags: [ 'cdb' ], title: "Simu pour formation Pré CPT" },
		'S_SEL_CPT': { type: 'simu', tags: [ 'cdb' ], title: "Simu pour Sélection CPT" },

		// Vols
		'CEL': { type: 'vol', tags: [ 'controle' ], title: "Contrôle en ligne" },
		'PICUS': { type: 'vol', tags: [], title: "Vols PICUS pour l'OPL" },
		'VFZFTT_T': { type: 'vol', tags: [ 'vf', 'cdb', 'stage' ], title: "Vol de familiarisation ZFTT" },
		'VF_T': { type: 'vol', tags: [ 'vf', 'cdb', 'stage' ], title: "Vol de familiarisation" },
		'VSSZ_QCDB': { type: 'vol', tags: [ 'vss', 'stage', 'qt' ], title: "Vol sous supervision ZFTT dans le cadre de la QT d'un CDB" },
		'VSSZ_QCPT': { type: 'vol', tags: [ 'vss', 'stage', 'qt' ], title: "Vol sous supervision ZFTT dans le cadre de la QT CPT" },
		'VSSZ_QOPL': { type: 'vol', tags: [ 'vss', 'stage', 'qt' ], title: "Vol sous supervision ZFTT dans le cadre de la QT d'un OPL" },
		'VSS_ATPL': { type: 'vol', tags: [ 'vss', 'atpl' ], title: "Vols sous supervision ATPL" },
		'VSS_CDB': { type: 'vol', tags: [ 'vss', 'stage', 'qt' ], title: "Vol sous supervision CDB" },
		'VSS_CPT': { type: 'vol', tags: [ 'vss', 'stage', 'cdb' ], title: "Vol sous supervision CPT" },
		'VSS_OPL': { type: 'vol', tags: [ 'vss', 'stage', 'qt' ], title: "Vol sous supervision OPL" },
		'VSS_PRE_CPT': { type: 'vol', tags: [ 'vss', 'cdb' ], title: "Vol sous supervision pour Pré CPT" },
		'VSS_PRECPT': { type: 'vol', tags: [ 'vss', 'cdb' ], title: "Vol sous supervision pour Pré CPT" },
		'VSS_R_CDB': { type: 'vol', tags: [ 'vss', 'reprise' ], title: "Vol sous supervision CDB" },
		'VSS_R_OPL': { type: 'vol', tags: [ 'vss', 'reprise' ], title: "Vol sous supervision OPL" },

		// pnc
		'VOL_AC': { type: 'vol', tags: [], title: undefined }, // A confirmer
	},


	titre(evt) {
		return this.tagLabel(evt.tag)
	},

	tagLabel(tag) {
		switch (tag) {
			case 'rotation':
				return 'Rotation';
			case 'vol':
				return 'Vol';
			case 'mep':
				return 'MEP';
			case 'conges':
				return 'Congés';
			case 'sanssolde':
				return 'Sans solde';
			case 'repos':
				return 'Repos';
			case 'jisap':
				return 'JISAP';
			case 'maladie':
				return 'Maladie';
			case 'greve':
				return 'Grève';
			case 'stage':
				return 'Stage';
			case 'instruction':
				return 'Instruction';
			case 'instructionSol':
				return 'Instruction Sol';
			case 'simu':
				return 'Simu';
			case 'instructionSimu':
				return 'Instruction Simu';
			case 'reserve':
				return 'Réserve';
			case 'delegation':
				return 'Syndicat';
			case 'sol':
				return 'Activité sol';
			case 'npl':
				return 'NPL';
			case 'autre':
				return 'Autre';
			default:
				return ucfirst(tag);
		}
	},

	eventLabelClass(evt) {
		return this.tagLabelClass(evt.tag);
	},

	tagLabelClass(tag) {
		switch (tag) {
			case 'conges':
				return 'badge-conges';
			case 'repos':
				return 'badge-success';
			case 'rotation':
			case 'vol':
			case 'mep':
				return 'badge-primary';
			case 'stage':
				return 'badge-info';
			case 'greve':
			case 'maladie':
			case 'absence':
			case 'sanssolde':
			case 'jisap':
			case 'npl':
				return 'badge-warning';
			case 'reserve':
			case 'sol':
			case 'instructionSimu':
			case 'instructionSol':
			case 'simu':
			case 'delegation':
				return 'badge-danger';
			case 'autre':
				return 'badge-secondary';
			case 'blanc':
				return 'badge-light';
			default:
				return 'badge-dark';
		}
	},

	slug(event, username, index) {
		const prefix = (username || Meteor.user().username) + DateTime.fromMillis(event.start).toISODate({ format: 'basic' })
		const suffix = event.tag + (index || "")

		if (_.has(event, 'events') && !_.isEmpty(event.events)) {
			// Duty sol ou vol
			switch (event.tag) {
				case 'sv':
					return [ prefix, _.first(event.events).num, event.from, event.to, suffix ].join('-')
				case 'mep':
					return [ prefix, _.first(event.events).title.replace(/\W+/g, '_'), event.from, event.to, suffix ].join('-')
				default:
					return [ prefix, _.first(event.events).summary.replace(/\W+/g, '_'), DateTime.fromMillis(event.start).toFormat('HHmm'), suffix ].join('-')
			}
		} else {
			switch (event.tag) {
				case 'rotation':
				case 'repos':
				case 'conges':
				case 'maladie':
				case 'greve':
				case 'sanssolde':
				case 'blanc':
				case 'jisap':
				case 'npl':
				case 'absence':
					return [ prefix, suffix ].join('-')
				case 'vol':
					return [ prefix, event.num, event.from, event.to, suffix ].join('-')
				case 'mep':
					const title = event.title || event.num
					return [ prefix, title.replace(/\W+/g, '_'), event.from, event.to, suffix ].join('-')
				default:
					return [ prefix, event.summary.replace(/\W+/g, '_'), DateTime.fromMillis(event.start).toFormat('HHmm'), suffix ].join('-')
			}
		}
	},

	diffH(d, f) {
		var min = f.diff(d, 'minutes') % 60;
		return f.diff(d, 'hours') + 'h' + (min < 10 ? '0' + min : min);
	},

	ucfirst(str) {
		return ucfirst(str);
	},

	findTag(code) {
		return findInObject(this.categories, code) || 'autre'
	},

	findCodeInstruction(code) {
		return findInObject(this.codesInstruction, code)
	}
}

function findInObject(object, code) {
	if (_.has(object, code)) {
		return _.get(object, code)
	}

	if (code.length > 2 && /\d$/.test(code) && _.has(object, code.substring(0, code.length - 1))) {
		console.log(`---  Tag attribué (méthode numéroté) : ${code} ---`)
		return _.get(object, code.substring(0, code.length - 1))
	}

	// find code matching first 4 chars
	if (code.length === 4) {
		const _found = _.find(object, (tag, _code) => {
			return _code.startsWith(code)
		})
		if (_found) {
			console.log(`---  Tag attribué (code court à 4 lettres) : ${_found} ---`)
			return _found
		}
	}

	const found = _.find(object, (tag, _code) => {
		return _code.includes(code) || code.includes(_code)
	})

	if (found) {
		console.log(`---  Tag attribué (méthode recherche) : ${found} ---`)
		return found
	}
	console.log('!!! IMPOSSIBLE DE DETERMINER TAG !!!', code)
}


function ucfirst(str) {
	return str.charAt(0).toUpperCase() + str.slice(1)
}
