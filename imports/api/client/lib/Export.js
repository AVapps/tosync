import _ from 'lodash'
import Utils from './Utils.js'
import TemplatesIndex from './TemplatesIndex.js'

const SYNC_CATEGORIES = {
  'vol': ['vol', 'mep'],
  'rotation': ['rotation'],
  'repos': ['repos'],
  'conges': ['conges'],
  'sol': ['sol', 'stage', 'simu', 'reserve', 'delegation', 'autre'],
  'instruction': ['instructionSol', 'instructionSimu'],
  'sanssolde': ['absence', 'sanssolde', 'greve'],
  'maladie': ['maladie'],
  'blanc': ['blanc', 'jisap', 'npl']
}

const SYNC_CATEGORIES_LABEL = {
  'vol': 'Vols',
  'rotation': 'Rotations',
  'repos': 'Repos',
  'conges': 'Congés',
  'sol': 'Activités sol',
  'instruction': 'Instruction',
  'sanssolde': 'Sans solde',
  'maladie': 'Maladie',
  'blanc': 'Blancs'
}

const SYNC_TAG_CATEGORIES = {
  'rotation': 'rotation',
  'vol': 'vol',
  'mep': 'vol',
  'absence': 'sanssolde',
  'conges': 'conges',
  'sanssolde': 'sanssolde',
  'blanc': 'blanc',
  'jisap': 'blanc',
  'npl': 'blanc',
  'repos': 'repos',
  'maladie': 'maladie',
  'greve': 'sanssolde',
  'stage': 'sol',
  'sol': 'sol',
  'instructionSol': 'instruction',
  'simu': 'sol',
  'instructionSimu': 'instruction',
  'reserve': 'sol',
  'delegation': 'sol',
  'autre': 'sol'
}

export default {
  getSyncCategorie(tag) {
    return _.get(SYNC_TAG_CATEGORIES, tag)
  },

  getSyncCategories() {
    return _.keys(SYNC_CATEGORIES)
  },

  getSyncCategoryLabel(tag) {
    return _.get(SYNC_CATEGORIES_LABEL, tag)
  },

  filterEventsByTags(events, tags) {
    return _.isEmpty(tags) ? [] : _.filter(events, (evt) => {
      const syncCategorie = _.get(SYNC_TAG_CATEGORIES, evt.tag)
      return _.includes(tags, syncCategorie)
    })
  },

  description(event, options) {
    event.description = event.description ? event.description.replace(/\\n/g, "\n") : ""
    const data = { event, options }
		switch (event.tag) {
			case 'conges':
				return TemplatesIndex.events.conge ? Blaze.toHTMLWithData(Template[TemplatesIndex.events.conge], data) : event.description
			case 'repos':
				return TemplatesIndex.events.repos ? Blaze.toHTMLWithData(Template[TemplatesIndex.events.repos], data) : event.description
			case 'rotation':
				return TemplatesIndex.events.rotation ? Blaze.toHTMLWithData(Template[TemplatesIndex.events.rotation], data) : event.description
			case 'vol':
			case 'mep':
				return TemplatesIndex.events.vol ? Blaze.toHTMLWithData(Template[TemplatesIndex.events.vol], data) : event.description
      case 'sol':
      case 'stage':
      case 'simu':
      case 'reserve':
      case 'delegation':
      case 'instructionSol':
      case 'instructionSimu':
        return TemplatesIndex.events.sol ? Blaze.toHTMLWithData(Template[TemplatesIndex.events.sol], data) : event.description
			default:
				return event.description
		}
	},

	titre(event, useCREWMobileFormat) {
    if (useCREWMobileFormat) {
      switch (event.tag) {
  			case 'rotation':
  				return TemplatesIndex.titreCM.rotation(event)
  			case 'vol':
  				return TemplatesIndex.titreCM.vol(event)
  			case 'mep':
  				return TemplatesIndex.titreCM.mep(event)
  			default:
  				return Utils.titre(event)
  		}
    } else {
      switch (event.tag) {
  			case 'rotation':
  				return TemplatesIndex.titre.rotation(event)
  			case 'vol':
  				return TemplatesIndex.titre.vol(event)
  			case 'mep':
  				return TemplatesIndex.titre.mep(event)
  			default:
  				return Utils.titre(event)
  		}
    }
	}
}
