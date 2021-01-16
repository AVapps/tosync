import _ from 'lodash'
import moment from 'moment'


export default {
	events: {
		conge: 'congeDescriptionText',
		repos: 'reposDescriptionText',
		rotation: 'rotationDescriptionText',
		sol: 'solDescriptionText',
		vol: 'volDescriptionText'
	},

	modal: {
		rotation: 'rotationModalContent',
		// sv: 'svModalContent',
		sol: 'solModalContent',
		conge: 'defaultModalContent',
		repos: 'defaultModalContent',
		default: 'defaultModalContent',
		mois: 'monthModalContent'
	},

	titre: {
		rotation(rot) {
			return `Rotation ${ rot.nbjoursTO }ON du ${ moment(rot.start).format('D MMMM')}`
		},
		vol: _.template("<%= num %> | <%= from %> - <%= to %> | <%= type %>"),
		mep: _.template("<%= title %> | <%= from %> - <%= to %> | MEP")
	},

  titreCM: {
    rotation(rot) {
      let str = `Rotation - ${ rot.nbjoursTO }ON`
      if (rot.decouchers.length) {
        str += ' - ' + _.chain(rot.decouchers).map('to').uniq().value().join(' - ')
      }
      return str
    },
		vol: _.template("<%= num %> (<%= from %>-<%= to %>) <%= type %>"),
		mep: _.template("MEP : <%= title %> (<%= from %>-<%= to %>)")
  }
}
