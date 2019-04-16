import { Template } from 'meteor/templating';
import './vol.html';

Template.volDescriptionText.helpers({
	airports() {
		return _.chain([this.from, this.to])
			.without('ORY', 'CDG')
			.map(code => Airports.findOne({ iata: code }) || _.findWhere(App.gares, { code }))
			.filter(_.identity)
			.value();
	},

	isMEP() {
		return this.tag === 'mep';
	}
})

Template.listeEquipageVol.helpers({
	equipage() {
		const peq = { pnt: [], pnc: [] };
		if (this && this.pnt && this.pnt.length) {
			_.forEach(this.pnt, (trigramme, index) => {
				const pn = PN.findOne({ trigramme });
				if (pn) {
					peq.pnt.push(pn);
				} else {
					peq.pnt.push({ trigramme, nom: '', prenom: '', fonction : index ? 'OPL' : 'CDB' });
				}
			});
		}
		if (this && this.pnc && this.pnc.length) {
			_.forEach(this.pnc, (trigramme, index) => {
				const pn = PN.findOne({ trigramme });
				if (pn) {
					peq.pnc.push(pn);
				} else {
					peq.pnc.push({ trigramme, nom: '', prenom: '', fonction : index ? 'CA' : 'CC ' });
				}
			});
		}
		return peq;
	}
});