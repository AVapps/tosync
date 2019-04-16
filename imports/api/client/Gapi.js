import { Meteor } from 'meteor/meteor';
import { queue } from 'd3-queue';
import Utils from './lib/Utils.js';

if (!console ) console = {log: function () {}};

window.handleGapiClientLoad = function () {
	Gapi.init();
};

window.Gapi = {
	clientId: Meteor.settings.public.gapi.clientId,
	scope: Meteor.settings.public.gapi.scope,

	_loaded: false,
	_ready: new ReactiveVar(false),
	_calendarList: new ReactiveVar([]),

	init: function () {
		this._loaded = true;
		this.immediateAuthorize();
	},

	ready: function () {
		return this._ready.get();
	},

	_setReady: function (ready) {
		return this._ready.set(ready);
	},

	error: function (msg) {
		this._setReady(false);
		Session.set('gapiError', msg);
	},

	immediateAuthorize: function (success, error) {
		gapi.auth.authorize({client_id: Gapi.clientId, scope: Gapi.scope, immediate: true}, function (authResult) {
			// console.log('gapiClient : handleImmediateAuthResult', authResult);
			if (Gapi.handleResponse(authResult)) {
				Gapi._getCalendarList((list) => {
						Gapi._calendarList.set(list);
						Gapi._setReady(true);
					}, error);
				if (_.isFunction(success)) success(authResult);
			} else {
				Gapi._setReady(false);
				if (_.isFunction(error)) error(authResult.error || authResult);
			}
		});
	},

	authorize: function (success, error) {
		gapi.auth.authorize({client_id: Gapi.clientId, scope: Gapi.scope, immediate: false, authuser: -1}, function (authResult) {
			// console.log('gapiClient : handleAuthResult', authResult);
			if (Gapi.handleResponse(authResult)) {
				Gapi._getCalendarList((list) => {
						Gapi._calendarList.set(list);
						Gapi._setReady(true);
					}, error);
				if (_.isFunction(success)) success(authResult);
			} else {
				Gapi._setReady(false);
				if (_.isFunction(error)) error(authResult.error || authResult);
			}
		});
	},

	handleResponse: function (resp) {
		if (resp && !resp.error) {
			return true;
		} else {
			return false;
		}
	},

	checkAuth: function (success, error) {
		if (!this._loaded) error("Gapi Javascript client not yet loaded ! Try again later.");

		if (this.ready()) {
			Gapi.immediateAuthorize(success, function (err) {
				Gapi.authorize(success, error);
			});
		} else {
			Gapi.authorize(success, error);
		}
	},

	_getCalendarList: function (success, error) {
		// Charge la liste des agendas

		gapi.client.request({
			'path': '/calendar/v3/users/me/calendarList',
			'params': {
				minAccessRole: 'owner',
				fields: 'items(accessRole,backgroundColor,foregroundColor,id,primary,summary,timeZone)'
			}
		}).execute(function(resp) {
			if (Gapi.handleResponse(resp)) {
				if (resp.items && resp.items.length) {

					var _calendarList = _.sortBy(resp.items, function (item) {
						if (item.primary) return '0';
						return item.summaryOverride || item.summary;
					});

					if (_.isFunction(success)) success(_calendarList);

				} else {
					if (_.isFunction(error)) error('Aucun calendrier trouvé !');
				}
			} else {
				if (_.isFunction(error)) error('Impossible de charger la liste des calendriers !');
			}
		});
	},

	getCalendarList: function () {
		return this._calendarList.get();
	},

	loadCalendarList: function () {
		Gapi._getCalendarList((list) => this._calendarList.set(list));
	},

	syncEvents: function (events, progress = _.noop, cb = _.noop) {
		progress(0);
		const startOfMonth = moment().startOf('month');

		if (!events.length) return error("Rien à synchroniser !");

		const config = Config.get('googleCalendarIds');
		const authorizedCalendars = _.pluck(Gapi.getCalendarList(), 'id');

		if (!_.some(authorizedCalendars, function (calId) { return !_.isEmpty(config[calId]) })) return error("Sélectionnez au moins un calendrier !");

		const syncList = _.map(authorizedCalendars, (calId) => {
			const tags = config[calId];
			return {
				calendarId: calId,
				events: _.isEmpty(tags) ? [] : _.filter(events, (evt) => {
					switch (evt.tag) {
						case 'sol':
						case 'delegation':
						case 'autre':
						case 'stage':
						case 'simu':
							return _.contains(tags, 'sol');
						case 'instruction':
						case 'instructionSol':
						case 'instructionSimu':
							return _.contains(tags, 'instruction');
						case 'vol':
						case 'mep':
							return _.contains(tags, 'vol');
						default:
							return _.contains(tags, evt.tag);
					}
				})
			}
		});

		const suffix = ('-' + Meteor.user().username) || 'METEORCREW';

		if (suffix.length < 4) return error("Chaîne d'identification des évènements introuvable !");

		console.log(syncList, suffix);

		const total = syncList.length * 2,
			start = _.first(events).start,
			end = _.last(events).end;
		let count = 0;

		function incrProgress() {
			count++;
			progress(Math.round(count*100/total));
		}

		const q = queue();

		const task = (sync, callback) => {
			return this._processSyncTask(sync, start, end, suffix, incrProgress, callback);
		};

		_.forEach(syncList, (sync) => {
			q.defer(task, sync);
		});

		q.awaitAll((error, results) => {
			if (error) {
				cb(error);
			} else {
				cb(null, results);
			}
		});

		return this;
	},

	_processSyncTask(sync, start, end, suffix, incrProgress, cb) {
		this._clearEvents(sync.calendarId, start, end, suffix, (error, result) => {
			if (error) {
				cb(error);
			} else if (!_.isEmpty(sync.events)) {
				this._batchInsert(sync.calendarId, sync.events, (e,r) => {
					incrProgress();
					cb(e,r);
				});
			} else {
				incrProgress();
				cb(null, []);
			}
		});
	},

	_clearEvents(calendarId, start, end, suffix, cb) {
		const deleteBatch = gapi.client.newBatch();
		let count = 0;
		gapi.client
			.request({
				'path': '/calendar/v3/calendars/'+calendarId+'/events',
				'params': {
					timeMin: start.format(),
					timeMax: end.format(),
					maxResults: 999,
					fields: 'items(iCalUID,id)'
				}
			})
			.execute(resp => {
				if (resp && !resp.error && _.isArray(resp.items)) {
					_.forEach(resp.items, function (item, index) {
						if (item.iCalUID.substr(-7) === 'CHOPETO' || item.iCalUID.substr(-10) === 'METEORCREW' || item.iCalUID.substr(-4) === suffix || item.id.substr(-4) === suffix) {
							deleteBatch.add(
								gapi.client.request({
									'method': 'DELETE',
									'path': '/calendar/v3/calendars/'+calendarId+'/events/'+item.id
								})
							);
							count++;
						}
					});

					if (count) {
						console.log('gapiClient : ' + count + ' events to delete found in "' + calendarId + '"');

						deleteBatch.execute((result, rawResponse) => {
							console.log('gapiClient : batchDelete on ' + calendarId, result);

							if (!result || result.error) {
								return cb(new Meteor.Error("Echec", "Erreur lors de la suppression des évènements dans " + calendarId + " !\n\n!!! Synchronisation annulée !!!"));
							}

							const every = _.every(resp, function (result, id) {
								return result && _.isEmpty(result.result);
							});

							if (!every) return cb(new Meteor.Error("Echec", "Des évènements n'ont pu être supprimés de l'agenda : " + calendarId + "\n\n!!! Synchronisation annulée !!!"));

							cb(null, result);
						});
					} else {
						cb(null, []);
					}
				} else if (_.isFunction(cb)) {
					cb(new Meteor.Error('Introuvable', "Impossible de charger la liste des évènements du calendrier Google !"));
				}
			});
	},

	_batchInsert(calendarId, events, cb) {
		const baseId = '' + Date.now() + '';
		const batch = gapi.client.newBatch();
		_.forEach(events, (evt, index) => {
			batch.add(gapi.client.request({
				'path': '/calendar/v3/calendars/'+calendarId+'/events',
				'method': 'POST',
				'body': JSON.stringify(this._transform(evt, baseId, index))
			}));
		});

		batch.execute(function (resp, rawResponse) {
			console.log('gapiClient : batchInsert on : ' + calendarId);

			if (!resp || resp.error) return cb(new Meteor.Error("Erreur d'insertion", "Erreur lors de la synchronisation des nouveaux évènements !"));

			var every = _.every(resp, function (result, id) {
				return result && result.result && !result.result.error;
			});

			if (!every) return cb(new Meteor.Error("Erreur d'insertion", "Des évènements n'ont pu être ajoutés à l'agenda !\n\n !!! ATTENTION : Synchronisation incomplète !!!"));

			cb(null, resp);
		});

	},

	_transform(event, baseId, index) {
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
		};
		switch (event.tag) {
			case 'repos':
			case 'conges':
			case 'delegation':
				return _.extend(body, {
					start: {
						date: event.start.format('YYYY-MM-DD')
					},
					end: {
						date: event.start.clone().add(1, 'd').format('YYYY-MM-DD')
					},
					summary: this._titre(event),
					description: this._description(event)
				});
			case 'rotation':
				return _.extend(body, {
					start: {
						date: event.tsStart.format('YYYY-MM-DD')
					},
					end: {
						date: event.tsEnd.clone().add(1, 'd').format('YYYY-MM-DD')
					},
					summary: this._titre(event),
					description: this._description(event)
				});
			case 'vol':
				return _.extend(body, {
					summary: this._titre(_.defaults(event, {from: '', to: '', type: '', num: ''})),
					description: this._description(event),
				});
			case 'mep':
				return _.extend(body, {
					summary: this._titre(event),
					description: this._description(event),
				});
			default:
				return _.extend(body, _.pick(event, 'summary', 'description'));
		}
	},

	_description(event) {
		switch (event.tag) {
			case 'conges':
				return App.templates.events.conge ? Blaze.toHTMLWithData(Template[App.templates.events.conge], event) : event.description;
			case 'repos':
				return App.templates.events.repos ? Blaze.toHTMLWithData(Template[App.templates.events.repos], event) : event.description;
			case 'rotation':
				return App.templates.events.rotation ? Blaze.toHTMLWithData(Template[App.templates.events.rotation], event) : event.description;
			case 'vol':
			case 'mep':
				return App.templates.events.vol ? Blaze.toHTMLWithData(Template[App.templates.events.vol], event) : event.description;
			default:
				return App.templates.events.sol ? Blaze.toHTMLWithData(Template[App.templates.events.sol], event) : event.description;
		}
	},

	_titre(event) {
		switch (event.tag) {
			case 'rotation':
				return App.templates.titre.rotation ?  App.templates.titre.rotation(event) : Utils.titre(event);
			case 'vol':
				return App.templates.titre.vol ?  App.templates.titre.vol(event) : event.summary;
			case 'mep':
				return App.templates.titre.mep ?  App.templates.titre.mep(event) : event.summary;
			default:
				return Utils.titre(event);
		}
	}
};
