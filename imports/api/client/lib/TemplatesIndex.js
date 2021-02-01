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
		allday: 'alldayModalContent',
		mois: 'monthModalContent'
	},

	titre: {
		rotation(rot) {
			return `Rotation ${ rot.nbjoursTO }ON du ${ moment(rot.start).format('D MMMM')}`
		},
		vol(vol) {
			return `${ vol.num } | ${vol.from} - ${vol.to} | ${vol.type}`
		},
		mep(mep) {
			return `${ mep.num || mep.title } | ${mep.from} - ${mep.to} | MEP`
		}
	},

  titreCM: {
    rotation(rot) {
      let str = `Rotation - ${ rot.nbjoursTO }ON`
      if (rot.decouchers.length) {
        str += ' - ' + _.chain(rot.decouchers).map('to').uniq().value().join(' - ')
      }
      return str
		},
		vol(vol) {
			return `${ vol.num } (${vol.from}-${vol.to}) ${vol.type}`
		},
		vol: _.template("<%= num %> (<%= from %>-<%= to %>) <%= type %>"),
		mep(mep) {
			return `MEP : ${ mep.num || mep.title } (${mep.from}-${mep.to})`
		}
  }
}
