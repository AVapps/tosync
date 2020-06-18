import { Meteor } from 'meteor/meteor'
import { ReactiveVar } from 'meteor/reactive-var'
import _ from 'lodash'

import Export from './lib/Export.js'
import GapiBatch from './lib/GapiBatch.js'

const CLIENT_ID = Meteor.settings.public.gapi.clientId
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events'
]
const DISCOVERY_DOCS = [ 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest' ]

class Gapi {
  constructor() {
    if (!Gapi.instance) {
      // console.log('GAPI.init')
    	this._ready = new ReactiveVar(false)
      this._isSignedIn = new ReactiveVar(false)
    	this._calendarList = new ReactiveVar([])
      this._backoffDelay = 1000
      this.auth = false
      this.currentUser = false
      Gapi.instance = this
    }
   return Gapi.instance
  }

  loadClient() {
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
      const resp = await gapi.client.request({
  			'path': '/calendar/v3/users/me/calendarList',
  			'params': {
  				minAccessRole: 'owner',
  				fields: 'items(accessRole,backgroundColor,foregroundColor,id,primary,summary,timeZone)'
  			}
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

	async loadCalendarList() {
    const calendarList = await this._getCalendarList()
    if (_.isArray(calendarList)) {
      this._calendarList.set(calendarList)
    }
    return calendarList
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

		if (!events.length) return error("Rien à synchroniser !")

		const config = Config.getCalendarTags()
		const authorizedCalendars = _.map(this.getCalendarList(), 'id')

		if (!_.some(authorizedCalendars, calId => {
      return !_.isEmpty(config[calId])
    })) return App.error("Sélectionnez au moins un calendrier !")

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

		if (suffix.length < 4) return App.error("Chaîne d'identification des évènements introuvable !")

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
    }
    return Promise.all(results)
	}

	async _processSyncTask(sync, start, end, suffix, incrProgress) {
    const respClear = await this._clearEvents(sync.calendarId, start, end, suffix)
    console.log(respClear)
    if (respClear) {
      incrProgress(sync.events.length)

      const respInsert = await this._insertEvents(sync.calendarId, sync.events)

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
    const requests = _.map(events, (evt, index) => {
      const data = this._transform(evt, baseId, index, useCREWMobileFormat)
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

	async __clearEventsBatch(calendarId, start, end, suffix) {
		const deleteBatch = gapi.client.newBatch()
		let count = 0

		const resp = await gapi.client.request({
			'path': '/calendar/v3/calendars/'+calendarId+'/events',
			'params': {
				timeMin: start.format(),
				timeMax: end.format(),
				maxResults: 999,
				fields: 'items(iCalUID,id)'
			}
		})

    if (_.has(resp, 'result.items') && resp.result.items.length) {
      _.forEach(resp.result.items, function (item, index) {
        if (item.iCalUID.substr(-7) === 'CHOPETO' || item.iCalUID.substr(-10) === 'METEORCREW' || item.iCalUID.substr(-4) === suffix || item.id.substr(-4) === suffix) {
          deleteBatch.add(
            gapi.client.request({
              'method': 'DELETE',
              'path': '/calendar/v3/calendars/'+calendarId+'/events/'+item.id,
              'params': { sendUpdates: 'none' }
            })
          )
          count++
        }
      })
    }

    if (count) {
      console.log('gapiClient : ' + count + ' events to delete found in "' + calendarId + '"')
      const resp = await deleteBatch

      if (_.has(resp, 'result') && _.isObject(resp.result)) {
        const clearCount = _.reduce(resp.result, (count, result, id) => {
          return result && _.isEmpty(result.result) && result.status == 204 ? count+1 : count
        }, 0)

        const diff = count - clearCount

        if (diff === 0) {
          return resp
        } else if (diff < 5) {
          App.error(`${diff} évènements n'ont pas été supprimés de l'agenda !`)
          return resp
        } else {
          throw new Meteor.Error("Echec", "Trop d'évènements n'ont pu être supprimés de l'agenda : " + calendarId + ": Synchronisation annulée !")
        }
      } else {
        throw new Meteor.Error("Echec", "Des évènements n'ont pu être supprimés de l'agenda : " + calendarId + "\n\n!!! Synchronisation annulée !!!")
      }
    } else {
      return true
    }
	}

	__insertEventsBatch(calendarId, events) {
		const baseId = '' + Date.now() + ''
		const batch = gapi.client.newBatch()
    const useCREWMobileFormat = Config.get('useCREWMobileFormat')
		_.forEach(events, (evt, index) => {
			batch.add(gapi.client.request({
				'path': '/calendar/v3/calendars/'+calendarId+'/events',
				'method': 'POST',
				'body': JSON.stringify(this._transform(evt, baseId, index, useCREWMobileFormat))
			}))
		})
    return batch
	}

	_transform(event, baseId, index, useCREWMobileFormat) {
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
					description: Export.description(event)
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
					description: Export.description(event)
				})
			case 'vol':
				return _.extend(body, {
					summary: Export.titre(_.defaults(event, {from: '', to: '', type: '', num: ''}), useCREWMobileFormat),
					description: Export.description(event),
				})
			case 'mep':
				return _.extend(body, {
					summary: Export.titre(event, useCREWMobileFormat),
					description: Export.description(event),
				})
			default:
				return _.extend(body, {
          summary: event.summary,
          description: Export.description(event)
        })
		}
	}
}

const instance = new Gapi()

export default instance
