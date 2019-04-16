import { Template } from 'meteor/templating';
import './rotation.html';

Template.listeEquipageRotation.helpers({
	equipage() {
		function mapCrew(list) {
			return _.map(list, trigramme => {
				const pn = PN.findOne({ trigramme });
				if (pn) {
					return pn;
				} else {
					return { trigramme, fonction: '', nom: '', prenom: '' };
				}
			})
		}

		const crew = { pnt: [], pnc: [] };
		if (this.sv && this.sv.length) {
			_.forEach(this.sv, sv => {
				if (sv.events && sv.events.length) {
					_.forEach(sv.events, evt => {
						if (evt.pnt && evt.pnt.length) {
							_.forEach(evt.pnt, tri => {
								if (!_.contains(crew.pnt, tri)) crew.pnt.push(tri);
							});
						}
						if (evt.pnc && evt.pnc.length) {
							_.forEach(evt.pnc, tri => {
								if (!_.contains(crew.pnc, tri)) crew.pnc.push(tri);
							});
						}
					})
				}
			});
		}

		return { pnt: mapCrew(crew.pnt), pnc: mapCrew(crew.pnc) };
	} 
});