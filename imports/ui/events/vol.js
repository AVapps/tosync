import { Template } from 'meteor/templating'
import './vol.html'

import AirportsData from '/imports/api/client/lib/AirportsData.js'

Template.volDescriptionText.helpers({
	airports() {
		return _.chain([this.event.from, this.event.to])
			.without('ORY', 'CDG')
			.map(code => AirportsData.find(code))
			.filter(_.identity)
			.value();
	},

	isMEP() {
		return this.event.tag === 'mep';
	},

  hasPEQ(vol) {
    return (vol.pnc && vol.pnc.length) || (vol.pnt && vol.pnt.length)
  },

  isPNT() {
    return Controller.isPNT()
  }
})

Template.listeEquipageVol.helpers({
	equipage() {
		const peq = { pnt: [], pnc: [] }
		if (this && this.pnt && this.pnt.length) {
			_.forEach(this.pnt, (trigramme, index) => {
				const pn = PN.findOne({ trigramme })
				if (pn) {
					peq.pnt.push(pn)
				} else {
					peq.pnt.push({ trigramme, nom: '', prenom: '', fonction : index ? 'OPL' : 'CDB' })
				}
			})
		}
		if (this && this.pnc && this.pnc.length) {
			_.forEach(this.pnc, (trigramme, index) => {
				const pn = PN.findOne({ trigramme })
				if (pn) {
					peq.pnc.push(pn)
				} else {
					peq.pnc.push({ trigramme, nom: '', prenom: '', fonction : index ? 'CA' : 'CC ' })
				}
			})
		}
		return peq
	}
})
