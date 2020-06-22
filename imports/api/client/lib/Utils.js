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
    'ABSJ': 'blanc', // Absence excusée payée
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
		'INST': 'instructionSol',
		'CS_M': 'sol', // MDC
    'CS_C': 'instructionSol', // MDC INST
    'MINT': 'sol', // Réunion Inst
    'WORK': 'sol', // Réunion
		'SIMU': 'simu',
		'SIM': 'simu',
		'LVO': 'simu',
		'ENT': 'simu',
		'E1': 'simu',
		'E2': 'simu',
		'C1': 'simu',
		'C2': 'simu',
		'LOE': 'simu',
    'UPRT': 'simu', // Simu UPRT
		'STAG': 'stage',
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
    'BURT': 'sol', // Bureau  PNT
    'BURC': 'sol', // Bureau  PNC
		'MTE': 'sol',
    'CS': 'sol', // Ajout pour détection CS (cours au sol)
    'CSATPL': 'sol', // Cours au sol pour formation ATPL
		'CSS': 'sol', // Cours sol SADE
    'QT': 'stage',
    'SIMU_QT': 'stage', // Simu de QT
		'VMT': 'sol',
		'VM': 'sol',
		'MDC': 'sol',
		'SUR': 'sol',
		'CRMT': 'sol',
		'SS1': 'sol',
		'MD_T': 'sol',
    'MD_E': 'sol',
		'MEET': 'sol', // Réunion compagnie
		'EFB': 'sol',
		'ENTP': 'sol',
		'E_LE': 'sol',  // 'E_LE'
		'HS': 'maladie',
    'OFFHS': 'maladie', // Arrêt maladie sur OFF
    'FATIG': 'sanssolde', // Clause fatigue PN
		'GREV': 'greve',
		'NPL': 'blanc' // Non planifiable
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
			case 'jisap':
				return 'badge-light';
			default:
				return 'badge-dark';
		}
	},

	slug(event, username, index) {
		var prefix = (username || Meteor.user().username) + event.start.format('YYYYMMDD'),
			suffix = event.tag + (index || "");
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
				return [prefix, suffix].join('-');
			case 'vol':
				return [prefix, event.num, event.from, event.to, suffix].join('-');
			case 'mep':
				return [prefix, event.title.replace(/\W+/g, '_'), event.from, event.to, suffix].join('-');
			default:
				return [prefix, event.summary.replace(/\W+/g, '_'), event.start.format('HHmm'), suffix].join('-');
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
    if (_.has(this.categories, code)) {
      return _.get(this.categories, code)
    }

    if (code.includes('_')) {
      const shortCode = code.replace(/_/g,"")
      if (_.has(this.categories, shortCode)) {
        return _.get(this.categories, shortCode)
      }

      const subCode = code.split('_')[0]
      if (_.has(this.categories, subCode)) {
        const tag =_ .get(this.categories, subCode)
        console.log(`---  Tag attribué (méthode sub) : ${tag} ---`)
        return tag
      }
    }

    const found = _.find(this.categories, (tag, _code) => {
      return _code.includes(code) || code.includes(_code)
    })

    if (found) {
      console.log(`---  Tag attribué (méthode recherche) : ${found} ---`)
      return found
    }

    console.log('!!! IMPOSSIBLE DE DETERMINER TAG !!!', code)
    return 'autre'
  }
}


function ucfirst(str) {
	return str.charAt(0).toUpperCase() + str.slice(1)
}
