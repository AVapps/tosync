/**
* Helper functions
**/
export default {
	titre(evt) {
		return this.tagLabel(evt.tag);
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
				return 'Congés sans solde';
			case 'repos':
				return 'Repos';
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
				return 'label-success';
			case 'repos':
				return 'label-repos';
			case 'rotation':
			case 'vol':
			case 'mep':
				return 'label-info';
			case 'stage':
				return 'label-primary';
			case 'greve':
			case 'maladie':
				return 'label-warning';
			case 'reserve':
			case 'sol':
			case 'instructionSimu':
			case 'instructionSol':
			case 'simu':
			case 'delegation':
				return 'label-danger';
			case 'autre':
			case 'sanssolde':
				return 'label-default';
			default:
				return 'label-default';
		}
	},

	tags: [
		'rotation',
		'vol',
		'mep',
		'conges',
		'sanssolde',
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

	categories: {
		'OFF': 'repos',
		'OFFD': 'repos',
		'OFFE': 'repos',
		'OFFR': 'repos',
		'CP': 'conges',
		'CA': 'conges',
		'CAHC': 'conges',
		'CPI': 'conges',
		'CPD': 'conges',
		'CAPA': 'sanssolde',
		'INST': 'instructionSol',
		'CSM': 'instructionSol', // 'CS_M'
		'SIMU': 'simu',
		'SIM': 'simu',
		'ENT': 'simu',
		'E1': 'simu',
		'E2': 'simu',
		'C1': 'simu',
		'C2': 'simu',
		'LOE': 'simu',
		'STAG': 'stage',
		'JDD': 'delegation',
		'JDDC': 'delegation',
		'JDDO': 'delegation',
		'JDCC': 'delegation',
		'RSYC': 'delegation',
		'NEGO': 'delegation',
		'RCSE': 'delegation',
		'FLT': 'vol',
		'DHD': 'mep',
		'ENGS': 'mep',
		'MTE': 'sol',
		'CSST': 'sol',
		'VMT': 'sol',
		'VM': 'sol',
		'MDC': 'sol',
		'SUR': 'sol',
		'CRMT': 'sol',
		'SS1': 'sol',
		'MDT': 'sol',
		'MEET': 'sol',
		'EFB': 'sol',
		'ENTP': 'sol',
		'ELE': 'sol',  // 'E_LE'
		'HS': 'maladie',
		'GREV': 'greve',
		'NPL': 'autre'
	}
};

function ucfirst(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
};
