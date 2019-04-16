import { Template } from 'meteor/templating';
import './mois.html';

Template.monthModalContent.helpers({
	sumHcs() {
		return this.Hcs + this.Hcsr + this.Hcsi;
	},

	sumJoursSol() {
		return this.nbJoursSol + this.nbJoursDelegation + this.nbJoursInstruction;
	},

	configHcsr() {
		return Config.get('Hcsr');
	}
});

Template.monthModalContent.events({
	'change input[name=hcsr]': function (e,t) {
		Config.set('Hcsr', e.currentTarget.value);
	}
})
