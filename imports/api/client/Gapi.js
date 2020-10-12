import { Meteor } from 'meteor/meteor'
import { ReactiveVar } from 'meteor/reactive-var'
import _ from 'lodash'

import Modals from './Modals.js'
import Export from './lib/Export.js'
import GapiBatch from './lib/GapiBatch.js'

const CLIENT_ID = Meteor.settings.public.gapi.clientId
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events'
]
const DISCOVERY_DOCS = [ 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest' ]

function wait(ms) {
  return new Promise((resolve, reject) => {
    Meteor.setTimeout(resolve, ms)
  })
}

class Gapi {
  constructor() {
    if (!Gapi.instance) {
      // console.log('GAPI.init')
    	this._ready = new ReactiveVar(false)
      this._isSignedIn = new ReactiveVar(false)
    	this._calendarList = new ReactiveVar([])
      this._colors = new ReactiveVar([])
      this._backoffDelay = 1000
      this.auth = false
      this.currentUser = false
      Gapi.instance = this
    }
    return Gapi.instance
  }

  loadClient() {
    if (!gapi) return
    return gapi.load('client:auth2', async () => {
      try {
        await this.initClient()

        this.auth = gapi.auth2.getAuthInstance()
        this.currentUser = this.auth.currentUser.get()

        this.auth.currentUser.listen((currentUser) => {
          this.currentUser = currentUser
        })

        // Listen for sign-in state changes.
        this.auth.isSignedIn.listen((isSignedIn) => {
          this.handleSignInStatus(isSignedIn)
        })

        // Handle the initial sign-in state.
        this.handleSignInStatus(this.auth.isSignedIn.get())

        this._ready.set(true)
      } catch (error) {
        console.log(error)
      }
    })
  }

  async initClient() {
    console.log('GAPI.initClient')
    return gapi.client.init({
      client_id: CLIENT_ID,
      scope: SCOPES.join(' '),
      discoveryDocs: DISCOVERY_DOCS
    })
  }

  handleSignInStatus(isSignedIn){
    // console.log('Gapi.handleSignInStatus(isSignedIn)', isSignedIn)
    this._isSignedIn.set(isSignedIn)
    if (isSignedIn) {
      this.loadCalendarList()
      wait(100).then(() => this.loadColors())
    }
  }

  async signIn(options) {
    return this.auth ? this.auth.signIn(options) : undefined
  }

  async signOut() {
    return this.auth ? this.auth.signOut() : undefined
  }

  async revoke() {
    return this.auth ? this.auth.disconnect() : undefined
  }

  isSignedIn() {
    return this._isSignedIn.get()
  }

	ready() {
		return this._ready.get()
	}

	async _getCalendarList() {
		// Charge la liste des agendas
    try {
      const resp = await gapi.client.calendar.calendarList.list({
				minAccessRole: 'owner',
				fields: 'items(accessRole,backgroundColor,foregroundColor,id,primary,summary,timeZone)'
  		})
      if (_.has(resp, 'result.items') && resp.result.items.length) {
        return _.sortBy(resp.result.items, item => {
          if (item.primary) return '0'
          return item.summaryOverride || item.summary
        })
      } else {
        Notify.error('Aucun calendrier trouvé !')
      }
    } catch (error) {
      console.log(error)
    }
	}

	getCalendarList() {
		return this._calendarList.get()
	}

  getColors() {
		return this._colors.get()
	}

	async loadCalendarList() {
    const calendarList = await this._getCalendarList()
    if (_.isArray(calendarList)) {
      this._calendarList.set(calendarList)
    }
    return calendarList
	}

  async loadColors() {
    try {
      const resp = await gapi.client.calendar.colors.get({ fields : 'event' })
      if (_.has(resp, 'result.event')) {
        const colors = []
        _.forEach(resp.result.event, (color, id) => {
          colors.push(_.extend({ id }, color))
        })
        this._colors.set(colors)
        return colors
      }
    } catch (error) {
      console.log(error)
    }
	}

  addTagToCalendarId(calendarId, tag) {
    return Config.addTagToCalendarId(calendarId, tag)
  }

  removeTagFromCalendarId(calendarId, tag) {
    return Config.removeTagFromCalendarId(calendarId, tag)
  }

	async syncEvents(events, progress = _.noop) {
    this._backoffDelay = 1000
		progress(0)
		const startOfMonth = moment().startOf('month')

		if (!events.length) return []

		const config = Config.getCalendarTags()
		const authorizedCalendars = _.map(this.getCalendarList(), 'id')

		if (!_.some(authorizedCalendars, calId => {
      return !_.isEmpty(config[calId])
    })) {
      throw new Meteor.Error('sync-warning', "Sélectionnez au moins un type d'évènement à exporter dans un calendrier !")
    }

		const syncList = _.chain(authorizedCalendars)
      .map(calId => {
        if (_.has(config, calId)) {
          const tags = _.get(config, calId)
          return {
    				calendarId: calId,
    				events: Export.filterEventsByTags(events, tags)
    			}
        } else {
          return undefined
        }
  		})
      .filter(doc => doc && doc.events && !_.isEmpty(doc.events))
      .value()

		const suffix = ('-' + Meteor.user().username) || 'METEORCREW'

		if (suffix.length < 4) {
      throw new Meteor.Error('sync-error', "Chaîne d'identification des évènements introuvable !")
    }

		const total = 2 * _.reduce(syncList, (count, sync) => {
      return count + sync.events.length
    }, 0)

		const start = _.first(events).start
		const end = _.last(events).end
		let count = 0

		function incrProgress(incr=1) {
			count += incr
			progress(Math.round(count*100/total))
		}

    // console.log(events, syncList, suffix)

    const results = []
    for (const sync of syncList) {
      results.push(await this._processSyncTask(sync, start, end, suffix, incrProgress))
      await wait(500)
    }
    return Promise.all(results)
	}

	async _processSyncTask(sync, start, end, suffix, incrProgress) {
    const respClear = await this._clearEventsGapiClientBatch(sync.calendarId, start, end, suffix)
    console.log(respClear)
    if (respClear) {
      incrProgress(sync.events.length)
      await wait(500)
      const respInsert = await this._insertEventsGapiClientBatch(sync.calendarId, sync.events)

      incrProgress(sync.events.length)

      console.log('gapiClient : batchInsert on : ' + sync.calendarId, respInsert)

      if (_.has(respInsert, 'result') && _.isObject(respInsert.result)) {
        const success = _.every(respInsert.result, (result, id) => result && _.has(result, 'result.id'))
        if (success) {
          return respInsert
        } else {
          throw new Meteor.Error("Erreur d'insertion", "Des évènements n'ont pu être ajoutés à l'agenda: synchronisation incomplète !")
        }
      } else {
        throw new Meteor.Error("Erreur d'insertion", "Erreur lors de la synchronisation des nouveaux évènements !")
      }
    }
	}

  async _clearEvents(calendarId, start, end, suffix) {
    const respFind = await gapi.client.request({
			'path': '/calendar/v3/calendars/'+calendarId+'/events',
			'params': {
				timeMin: start.format(),
				timeMax: end.format(),
				maxResults: 999,
        singleEvents: true,
				fields: 'items(iCalUID,id)'
			}
		})

    const deleteRequests = []
    if (_.has(respFind, 'result.items') && respFind.result.items.length) {
      _.forEach(respFind.result.items, (item, index) => {
        if (item.iCalUID.substr(-7) === 'CHOPETO' || item.iCalUID.substr(-10) === 'METEORCREW' || item.iCalUID.substr(-4) === suffix || item.id.substr(-4) === suffix) {
          deleteRequests.push({
            'method': 'DELETE',
            'path': '/calendar/v3/calendars/'+calendarId+'/events/'+item.id,
            'params': { sendUpdates: 'none' },
            'id': item.iCalUID
          })
        }
      })
    }

    if (deleteRequests.length) {
      console.log('gapiClient : ' + deleteRequests.length + ' events to delete found in "' + calendarId + '"')
      const auth = this.currentUser.getAuthResponse()
      const respDelete = await GapiBatch.batchRequestWithBackoffRetry(deleteRequests, '/batch/calendar/v3', auth, this._backoffDelay)

      if (_.has(respDelete, 'delay')) {
        this._backoffDelay = respDelete.delay
      }

      if (_.has(respDelete, 'result') && _.isObject(respDelete.result)) {
        let clearCount = _.reduce(respDelete.result, (t, result, id) => {
          return result && _.isEmpty(result.result) && result.status == 204 ? t+1 : t
        }, 0)

        const diff = deleteRequests.length - clearCount

        if (diff === 0) {
          return respDelete
        } else if (diff < 5) {
          App.error(`${diff} évènements n'ont pas été supprimés de l'agenda !`)
          return respDelete
        } else {
          throw new Meteor.Error("Echec", "Trop d'évènements n'ont pu être supprimés de l'agenda : " + calendarId + ": Synchronisation annulée !")
        }
      } else {
        throw new Meteor.Error("Echec", "Des évènements n'ont pu être supprimés de l'agenda : " + calendarId + "\n\n Synchronisation annulée !")
      }
    } else {
      return true
    }
  }

  async _insertEvents(calendarId, events) {
		const baseId = '' + Date.now() + ''
    const auth = this.currentUser.getAuthResponse()
    const useCREWMobileFormat = Config.get('useCREWMobileFormat')
    const colors = Config.get('eventsColors')
    const exportOptions = Config.get('exportOptions')

    const requests = _.map(events, (evt, index) => {
      const colorId = _.get(colors, Export.getSyncCategorie(evt.tag))
      const data = this._transform(evt, baseId, index, useCREWMobileFormat, colorId, exportOptions)
			return {
        'method': 'POST',
				'path': '/calendar/v3/calendars/' + calendarId + '/events',
				'data': data,
        'id': data.iCalUID
      }
    })
    const resp = GapiBatch.batchRequestWithBackoffRetry(requests, '/batch/calendar/v3', auth, this._backoffDelay)
    if (_.has(resp, 'delay')) {
      this._backoffDelay = resp.delay
    }
    return resp
	}

  async _insertEventsGapiClientBatch(calendarId, events) {
		const baseId = '' + Date.now() + ''
    const auth = this.currentUser.getAuthResponse()
    const useCREWMobileFormat = Config.get('useCREWMobileFormat')
    const colors = Config.get('eventsColors')
    const exportOptions = Config.get('exportOptions')

    const insertBatch = gapi.client.newBatch()
    _.forEach(events, (evt, index) => {
      const colorId = _.get(colors, Export.getSyncCategorie(evt.tag))
      const data = this._transform(evt, baseId, index, useCREWMobileFormat, colorId, exportOptions)
      insertBatch.add(gapi.client.calendar.events.insert({ calendarId, resource: data }), { id: data.iCalUID })
    })

    return insertBatch
	}

	async _clearEventsGapiClientBatch(calendarId, start, end, suffix) {
    const respFind = await gapi.client.calendar.events.list({
      calendarId,
			timeMin: start.format(),
			timeMax: end.format(),
			maxResults: 999,
      singleEvents: true,
			fields: 'items(iCalUID,id)'
    })

		const deleteBatch = gapi.client.newBatch()
		let count = 0

    if (_.has(respFind, 'result.items') && respFind.result.items.length) {
      _.forEach(respFind.result.items, item => {
        if (item.iCalUID.substr(-7) === 'CHOPETO' || item.iCalUID.substr(-10) === 'METEORCREW' || item.iCalUID.substr(-4) === suffix || item.id.substr(-4) === suffix) {
          deleteBatch.add(gapi.client.calendar.events.delete({
            calendarId,
            eventId: item.id,
            sendUpdates: 'none',
          }), { id: item.iCalUID })
          count++
        }
      })
    }

    if (count) {
      console.log('gapiClient : ' + count + ' events to delete found in "' + calendarId + '"')
      await wait(500)
      const respDelete = await deleteBatch

      if (_.has(respDelete, 'result') && _.isObject(respDelete.result)) {
        let clearCount = _.reduce(respDelete.result, (t, result, id) => {
          return result && _.isEmpty(result.result) && result.status == 204 ? t+1 : t
        }, 0)

        const diff = count - clearCount

        if (diff === 0) {
          return respDelete
        } else if (diff < 5) {
          App.error(`${diff} évènements n'ont pas été supprimés de l'agenda !`)
          return respDelete
        } else {
          throw new Meteor.Error("Echec", "Trop d'évènements n'ont pu être supprimés de l'agenda : " + calendarId + ": Synchronisation annulée !")
        }
      } else {
        throw new Meteor.Error("Echec", "Des évènements n'ont pu être supprimés de l'agenda : " + calendarId + "\n\n Synchronisation annulée !")
      }
    } else {
      return true
    }
	}

	_transform(event, baseId, index, useCREWMobileFormat, colorId, exportOptions) {
		let body = {
			iCalUID: baseId + index + '-METEORCREW',
			start: {
				dateTime: event.start.format()
			},
			end: {
				dateTime: event.end.format()
			},
			reminders: {
				useDefault: false
			}
		}

    if (colorId) body.colorId = colorId

		switch (event.tag) {
			case 'absence':
  		case 'conges':
  		case 'sanssolde':
      case 'blanc':
  		case 'repos':
  		case 'maladie':
  		case 'greve':
				return _.extend(body, {
					start: {
						date: event.start.format('YYYY-MM-DD')
					},
					end: {
						date: event.start.clone().add(1, 'd').format('YYYY-MM-DD')
					},
					summary: Export.titre(event, useCREWMobileFormat),
					description: Export.description(event, exportOptions)
				})
      case 'rotation':
				return _.extend(body, {
					start: {
						date: event.start.format('YYYY-MM-DD')
					},
					end: {
						date: event.end.clone().add(1, 'd').format('YYYY-MM-DD')
					},
					summary: Export.titre(event, useCREWMobileFormat),
					description: Export.description(event, exportOptions)
				})
			case 'vol':
				return _.extend(body, {
					summary: Export.titre(_.defaults(event, {from: '', to: '', type: '', num: ''}), useCREWMobileFormat),
					description: Export.description(event, exportOptions),
				})
			case 'mep':
				return _.extend(body, {
					summary: Export.titre(event, useCREWMobileFormat),
					description: Export.description(event, exportOptions),
				})
			default:
				return _.extend(body, {
          summary: event.summary,
          description: Export.description(event, exportOptions)
        })
		}
	}
}

const instance = new Gapi()

export default instance
