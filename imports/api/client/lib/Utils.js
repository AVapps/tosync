import _ from 'lodash'
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
		'greve'
  ],

  categories: {
    'ABSJ': 'autre', // Absence excusée payée
		'NPL': 'autre', // Non planifiable

    'ABSNJ': 'absence', // Absence PN non excusée non payée

    'BLANC': 'blanc',
    'BLANCVOL': 'blanc', // Blanc suite à un swap vol contre blanc

		'OFF': 'repos',
    'OFFC': 'repos', // Jour OFF couple
  	'OFFD': 'repos', // JOUR OFF DESIDERATA
		'OFFE': 'repos',
    'OFFH': 'repos', // OFF HS maladie
		'OFFR': 'repos',
    'RPC': 'repos',

    'JISA': 'jisap',
    'JISAP': 'jisap',

		'CP': 'conges',
    'CEX': 'conges', // Congés exceptionnels familiaux
		'CA': 'conges',
		'CAP': 'conges',
		'CAHC': 'conges',
		'CPI': 'conges',
		'CPD': 'conges',
    'CPBLANC': 'conges', // CP sur jour blanc
    'CPBL': 'conges', // CP sur jour blanc

		'CAPA': 'sanssolde',
		'CPE': 'sanssolde', // Congé parental d'éducation
    'FATIG': 'sanssolde', // Clause fatigue PN

    'BURC': 'sol', // Bureau  PNC
    'BURT': 'sol', // Bureau  PNT
		'ENTP': 'sol',
    'MEET': 'sol', // Réunion compagnie
    'MINT': 'sol', // Réunion Inst
		'MTE': 'sol', // Montée terrain
    'WORK': 'sol', // Réunion
    'VMT': 'sol',
		'VM': 'sol',

		'E_LE': 'sol',  // 'E_LE' e-learning
    'ELEAR': 'sol',  // e-learning
    'E_LEARN': 'sol', // e-learning
    'ELEARMD': 'sol',  // e-learning MD
    'MD_E': 'sol', // Cours marchandises dangereuses E-learning MD_E_LEARN
    'MD_E_LEARN': 'sol', // Cours marchandises dangereuses E-learning MD_E_LEARN
    'ELEARNSURT': 'sol',  // e-learning Sûreté
    'SUR_ELEARN': 'sol', // e-learning Sûreté
    'ELEARSE': 'sol',  // e-learning Secourisme

    'MD': 'sol', // Cours marchandises dangereuses [ MD_C, MD_T ]
		'MDC': 'sol', // Cours MDC [ MDC_C, MDC_T ]
		'SGS': 'sol', // Cours SGS [ SGS_C, SGS_T ]
		'SUR': 'sol', // Cours sûreté [ SUR_C, SUR_T ]
		'CRM': 'sol', // Cours CRM [ CRM_C, CRM_T ]
		'SS1': 'sol', // Cours sécurité sauvetage [ SS1_C, SS1_T ]
		'SS2': 'sol', // Cours sécurité sauvetage [ SS2_C, SS2_T ]
		'SS3': 'sol', // Cours sécurité sauvetage [ SS3_C, SS3_T ]
		'MD_C': 'sol', // Cours marchandises dangereuses pour PNC
		'MD_T': 'sol', // Cours marchandises dangereuses pour PNT
		'EFB': 'sol',
    'CS': 'sol', // Ajout pour détection CS (cours au sol)
    'CS_ATPL': 'sol', // Cours au sol pour formation ATPL
    'PRAT_SS': 'sol', // Pratique porte et toboggan - secourisme - équipements
    'ATQP': 'sol', // ATQP
    'ATQP_AV': 'sol', // ATQP Avion
    'ATQP_SS': 'sol', // Sécurité sauvetage
    'MDC_COM': 'sol', // MDC PNC module commercial

		'SIMU': 'simu',
		'SIM': 'simu',
		'LVO': 'simu',
		'ENT': 'simu',
		'E1': 'simu',
		'E1_R': 'simu',
		'E2': 'simu',
		'E2_R': 'simu',
		'C1': 'simu',
		'C1_R': 'simu',
		'C2': 'simu',
		'C2_R': 'simu',
		'LOE': 'simu',
    'UPRT': 'simu', // Simu UPRT
    'SIMU_ATPL': 'simu', // simu épreuve pratique ATPL
    'SIMU_CPT': 'simu', // simu stage CPT
    'SIMU_R1': 'simu', // simu reprise
    'SIMU_R2': 'simu', // simu reprise
    'S_PRE_CPT': 'simu', // simu Pre CPT
    'S_SEL_CPT': 'simu', // simu sélection CPT

    'CSS': 'stage', // Cours sol SADE
    'QT': 'stage',
    'SIMU_QT': 'stage', // Simu de QT
		'STAG': 'stage',
    'STAGE_CPT': 'stage', // Cours sol stage CPT

		'JDD': 'delegation',
		'JDDC': 'delegation',
		'JDDO': 'delegation',
		'JDCC': 'delegation',
		'JDDA': 'delegation', // Jour de délégation AF
		'JDDAF': 'delegation', // Jour de délégation AF
		'RSYC': 'delegation',
		'NEGO': 'delegation',
		'RCSE': 'delegation',

		'FLT': 'vol',

		'DHD': 'mep',
		'ENGS': 'mep',
    'ENGST': 'mep',

		'HS': 'maladie',
    'OFFHS': 'maladie', // Arrêt maladie sur OFF

		'GREV': 'greve',

    // codes instruction
		'INST': 'instructionSol',
		'CS_M': 'instructionSol', // MDC
    'CS_MDC_J': 'instructionSol', // MDC
    'CS_CSS_J': 'instructionSol', // SADE
    'CS_CPT_J': 'instructionSol', // Cours au sol dispensé par un INS PNT dans le cadre d’un stage CPT
    'CS_C': 'instructionSol', // SADE ou CPT pour recherche

	},

  codesInstruction: {
    // Cours sol dispensés par un instructeur
    'CS_MDC_J': { type: 'sol', tags: ['instructeur', 'mdc'], title: "Cours au sol dispensé par un INS PN dans le cadre d’un MDC" },
    'CS_CSS_J': { type: 'sol', tags: ['instructeur', 'stage', 'sade'], title: "Cours au sol dispensé par un INS PN dans le cadre d’un SADE" },
    'CS_CPT_J': { type: 'sol', tags: ['instructeur', 'stage', 'cdb'], title: "Cours au sol dispensé par un INS PNT dans le cadre d’un stage CPT" },

    // Cours sol SADE, MDC, reprise
    'CRM_T': { type: 'sol', tags: [], title: "Cours CRM PNT" }, // SADE ou MDC
    'CSS_T': { type: 'sol', tags: ['stage', 'sade'], title: "Cours au sol SADE PNT" },
    'MDC_T':	{ type: 'sol', tags: [], title: "Cours au sol MDC PNT" },
    'MD_T':	{ type: 'sol', tags: [], title: "Cours marchandises dangereuses pour PNT" },
    'SS1_T': { type: 'sol', tags: [], title: "Cours sécurité sauvetage PNT" }, // SADE ou MDC ou reprise
    'SS2_T': { type: 'sol', tags: [], title: "Cours sécurité sauvetage PNT" }, // SADE ou MDC ou reprise
    'SS3_T': { type: 'sol', tags: [], title: "Cours sécurité sauvetage PNT" }, // SADE ou MDC ou reprise
    'SUR_T': { type: 'sol', tags: [], title: "Cours sureté PNT" }, // SADE ou MDC

    'CRM_C': { type: 'sol', tags: [], title: "Cours CRM PNC" }, // SADE ou MDC
    'CSS_C': { type: 'sol', tags: ['stage', 'sade'], title: "Cours au sol SADE PNC" },
    'MDC_C':	{ type: 'sol', tags: [], title: "Cours au sol MDC PNC" },
    'MD_C':	{ type: 'sol', tags: [], title: "Cours marchandises dangereuses pour PNC" },
    'SS1_C': { type: 'sol', tags: [], title: "Cours sécurité sauvetage PNC" }, // SADE ou MDC ou reprise
    'SS2_C': { type: 'sol', tags: [], title: "Cours sécurité sauvetage PNC" }, // SADE ou MDC ou reprise
    'SS3_C': { type: 'sol', tags: [], title: "Cours sécurité sauvetage PNC" }, // SADE ou MDC ou reprise
    'SUR_C': { type: 'sol', tags: [], title: "Cours sureté PNC" }, // SADE ou MDC

    'CS_ATPL': { type: 'sol', tags: ['atpl'], title: "Cours au sol pour formation ATPL" },

    'QT':	{ type: 'sol', tags: ['stage'], title: "Qualification de type" },

    // Activités sol pre-CPT et stage CPT
    'CS_PRE_CPT':	{ type: 'sol', tags: ['cdb'], title: "Cours au sol pour formation Pré CPT" },
    'CS_SEL_CPT':	{ type: 'sol', tags: ['cdb'], title: "Cours au sol pour sélection CPT" },
    'ENT_CPT': { type: 'sol', tags: ['cdb'], title: "Entretien individuel pour sélection CPT" },
    'STAGE_CPT': { type: 'sol', tags: ['stage', 'cdb'], title: "Cours au sol stage CPT" },

    // simus
    'C1': { type: 'simu', tags: ['controle'], title: "C1" },
    'C1_R': { type: 'simu', tags: ['controle'], title: "C1 de reprise" },
    'C1_R': { type: 'simu', tags: ['controle'], title: "C1 de reprise" },
    'C2': { type: 'simu', tags: ['controle'], title: "C2" },
    'C2_R': { type: 'simu', tags: ['controle'], title: "C2 de reprise" },
    'LOE': { type: 'simu', tags: ['controle'], title: "LOE" },
    'E1': { type: 'simu', tags: [], title: "Entrainement E1 de l'année en cours" },
    'E1_R': { type: 'simu', tags: [], title: "E1 de reprise" },
    'E2': { type: 'simu', tags: [], title: "E2" },
    'E2_R': { type: 'simu', tags: [], title: "E2 de reprise" },
    'SIMU_ATPL': { type: 'simu', tags: ['controle', 'atpl'], title: "Epreuve pratique ATPL" },
    'SIMU_CPT': { type: 'simu', tags: ['stage', 'cdb'], title: "Simu stage CPT" },
    'SIMU_QT': { type: 'simu', tags: ['stage', 'qt'], title: "Simu QT" },
    'SIMU_R1': { type: 'simu', tags: ['reprise'], title: "Module de reprise" },
    'SIMU_R2': { type: 'simu', tags: ['reprise'], title: "Deuxième simu de reprise avant l'entrainement" },
    'S_PRE_CPT': { type: 'simu', tags: ['cdb'], title: "Simu pour formation Pré CPT" },
    'S_SEL_CPT': { type: 'simu', tags: ['cdb'], title: "Simu pour Sélection CPT" },

    // Vols
    'CEL': { type: 'vol', tags: ['controle'], title: "Contrôle en ligne" },
    'PICUS': { type: 'vol', tags: [], title: "Vols PICUS pour l'OPL" },
    'VFZFTT_T': { type: 'vol', tags: ['vf', 'cdb', 'stage'], title: "Vol de familiarisation ZFTT" },
    'VF_T': { type: 'vol', tags: ['vf', 'cdb', 'stage'], title: "Vol de familiarisation" },
    'VSSZ_QCDB': { type: 'vol', tags: ['vss', 'stage', 'qt'], title: "Vol sous supervision ZFTT dans le cadre de la QT d'un CDB" },
    'VSSZ_QCPT': { type: 'vol', tags: ['vss', 'stage', 'qt'], title: "Vol sous supervision ZFTT dans le cadre de la QT CPT" },
    'VSSZ_QOPL': { type: 'vol', tags: ['vss', 'stage', 'qt'], title: "Vol sous supervision ZFTT dans le cadre de la QT d'un OPL" },
    'VSS_ATPL': { type: 'vol', tags: ['vss', 'atpl'], title: "Vols sous supervision ATPL" },
    'VSS_CDB': { type: 'vol', tags: ['vss', 'stage', 'qt'], title: "Vol sous supervision CDB" },
    'VSS_CPT': { type: 'vol', tags: ['vss', 'stage', 'cdb'], title: "Vol sous supervision CPT" },
    'VSS_OPL': { type: 'vol', tags: ['vss', 'stage', 'qt'], title: "Vol sous supervision OPL" },
		'VSS_PRE_CPT': { type: 'vol', tags: ['vss', 'cdb'], title: "Vol sous supervision pour Pré CPT" },
		'VSS_PRECPT': { type: 'vol', tags: ['vss', 'cdb'], title: "Vol sous supervision pour Pré CPT" },
    'VSS_R_CDB': { type: 'vol', tags: ['vss', 'reprise'], title: "Vol sous supervision CDB" },
    'VSS_R_OPL': { type: 'vol', tags: ['vss', 'reprise'], title: "Vol sous supervision OPL" },

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
		const prefix = (username || Meteor.user().username) + moment(event.start).format('YYYYMMDD')
		const suffix = event.tag + (index || "")

		if (_.has(event, 'events') && !_.isEmpty(event.events)) {
			// Duty sol ou vol
			switch (event.tag) {
				case 'sv':
					return [prefix, _.first(event.events).num, event.from, event.to, suffix].join('-')
				case 'mep':
					return [prefix, _.first(event.events).title.replace(/\W+/g, '_'), event.from, event.to, suffix].join('-')
				default:
					return [prefix, _.first(event.events).summary.replace(/\W+/g, '_'), moment(event.start).format('HHmm'), suffix].join('-')
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
				case 'absence':
					return [prefix, suffix].join('-')
				case 'vol':
					return [prefix, event.num, event.from, event.to, suffix].join('-')
				case 'mep':
					return [prefix, event.title.replace(/\W+/g, '_'), event.from, event.to, suffix].join('-')
				default:
					return [prefix, event.summary.replace(/\W+/g, '_'), moment(event.start).format('HHmm'), suffix].join('-')
			}
		}
	},

	diffH(d, f) {
		var min = f.diff(d, 'minutes') % 60;
		return f.diff(d, 'hours') + 'h' + (min < 10 ? '0'+min : min);
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

  if (code.length > 2 && /\d$/.test(code) && _.has(object, code.substring(0, code.length-1))) {
    return _.get(object, code.substring(0, code.length-1))
  }

  const shortCode = code.includes('_') ? code.replace(/_/g,"") : undefined
  if (shortCode) {
    if (_.has(object, shortCode)) {
      return _.get(object, shortCode)
    }

    const subCode = code.split('_')[0]
    if (_.has(object, subCode)) {
      const tag =_ .get(object, subCode)
      console.log(`---  Tag attribué (méthode sub) : ${tag} ---`)
      return tag
    }
  }

  const found = _.find(object, (tag, _code) => {
    return _code.includes(code) || code.includes(_code) || (shortCode && (_code.includes(code.split('_')[0]) || _code.replace(/_/g,"").includes(shortCode)))
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
