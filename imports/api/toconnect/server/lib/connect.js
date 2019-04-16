import request from 'request';
import cheerio from 'cheerio';

const requestSync = Meteor.wrapAsync(request.defaults({
	rejectUnauthorized: false,
	followRedirects: true,
	headers: {
		'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.28 Safari/537.36'
	}
}));

export const TOConnectManager = function (userId) {
	var session = "";

	if (userId) session = Meteor.users.findOne(userId, {fields: {'services.toconnect.session': 1}}).services.toconnect.session || "";

	console.log('SESSION', session);

	this.Jar = new TOConnectJar(session);
	this.Session = new TOConnectSession(userId, session);
};

_.extend(TOConnectManager.prototype, {

	ROOT_URL: 'https://connect.fr.transavia.com',
	LOGIN_URL: '/TOConnect/login.jsf',
	PLANNING_URL: '/TOConnect/pages/crewweb/planning.jsf',
	ACTIVITE_PN_URL: '/TOConnect/pages/activitePN.jsf',
	ACCUEIL_URL: '/TOConnect/accueil.jsf',

	login: function (login, password) {
		// this.revokeSession();	
		var resp = this._get(this.ROOT_URL + this.LOGIN_URL);

		if (resp  && resp.statusCode == 200 && resp.body) {
			var $ = cheerio.load(resp.body),
				data = {};

			var $form = $('form[name=formLogin]');
			var action = this.ROOT_URL + ($form.attr('action') || this.LOGIN_URL);
			$form.find('input').each(function (index, el) {
				var attr = el.attribs || {};
				if (attr.name && attr.value) {
					data[attr.name] = attr.value;
				}
			});
			
			resp = this._post(action, _.extend(data, {
				formLogin_username: login,
				formLogin_password: password,
				formLogin_actionLogin: ''
			}));


			if (resp && resp.statusCode == 302 && resp.headers.location && resp.headers.location.indexOf('accueil.jsf') !== -1) {
				resp = this._get(resp.headers.location);
			}
			
			// Login Successfull
			if (this._checkResponse(resp) && resp.body.indexOf('accueilDonneesUtilisateur.jsf') !== -1) {
				return true;
			} else {
				throw new Meteor.Error(401, "Echec authentification !", "Identifiant / mot de passe incorrect ou impossible de vérifier votre authentification sur TO Connect.");
			}
		} else {
			throw new Meteor.Error(500, "Connexion impossible !", "TO Connect est peut-être inaccessible ou a été mis à jour...");
		}
		throw new Meteor.Error(500, "Connexion impossible !");
	},

	checkSession: function () {
		if (!this.Session.get()) return false;

		var resp = this._get(this.ROOT_URL + this.ACCUEIL_URL);

		if (this._checkResponse(resp) && resp.body.indexOf('accueilDonneesUtilisateur.jsf') !== -1) {
			return true;
		} else {
			return false;
		}
	},

	getUserData: function () {
		var resp = this._get(this.ROOT_URL + this.ACCUEIL_URL);

		if (this._checkResponse(resp) && resp.body.indexOf('accueilDonneesUtilisateur.jsf') !== -1) {
			var $ = cheerio.load(resp.body);
			var href = this.ROOT_URL + $('.app-user a .fa-cog').parent().attr('href');

			if (!href) throw new Meteor.Error(500, "Profil introuvable !", "Si TO Connect a été mis à jour, contactez l'administrateur du site.");

			resp = this._get(href);

			if (this._checkResponse(resp)) {
				$ = cheerio.load(resp.body);

				var profil = {nom: '', prenom: '', email: '', fonction: ''};

				$('#form_dossierUtilisateur table tr').each(function (index, row) {
					var $cells = $(row).find('td');

					var heading = $cells.eq(0).text()
							.replace(/\*|\:/g, '')
							.trim()
							.toLowerCase()
							.replace(/\s/g,'_')
							.replace(/é/g,'e'),
						value = $cells.eq(1).text().trim();

					if (heading && value) {
						profil[heading] = value;
					}
				});

				return _.pick(profil, 'nom', 'prenom', 'email', 'fonction');

			} else {
				throw new Meteor.Error(500, "Page de profil introuvable !", "TO Connect a peut-être été mis à jour.");
			}
		} else {
			throw new Meteor.Error(401, "Echec authentification !", "Votre session a expirée.");
		}
	},

	getPlanning: function () {
		var resp = this._get(this.ROOT_URL + this.PLANNING_URL);

		if (this._checkResponse(resp)) {
			$ = cheerio.load(resp.body);
			
			if ($('.erreur').length || resp.body.indexOf('Sign Roster') !== -1) {
				throw new Meteor.Error(409, "Planning non signé !", "Vous devez valider votre planning sur TO Connect avant de pouvoir l'importer !");
			}

			var data = {};
			var $form = $('form[name=formPlanning]');
			var actionUrl = this.ROOT_URL + ($form.attr('action') || this.PLANNING_URL);
			$('form[name=formPlanning] input').each(function (index, el) {
				var attr = el.attribs || {};
				if (attr.name && attr.value) {
					data[attr.name] = attr.value;
				}
			});

			var action = $('button:contains(Agenda)').attr('name') || 'formPlanning_j_idt145';

			data[action] = '';

			resp = this._post(actionUrl, 
				_.extend({
					formPlanning: 'formPlanning',
					formPlanning_tabListeActivites_selection: '',
					'javax.faces.ViewState': ''
				}, data),
				{
					followRedirects: false
				}
			);

			if (this._checkResponse(resp) && resp.headers['content-type'].indexOf("text/calendar") !== -1) {
				return resp.body;
			} else {
				throw new Meteor.Error(500, "Echec téléchargement !", "Le téléchargement de votre planning a échoué.");
			}
		} else {
			throw new Meteor.Error(500, "Planning introuvable !", "La page planning de TO Connect est inaccessible ou a été déplacée.");
		}
	},

	getActivitePN: function (debut, fin) {
		var resp = this._get(this.ROOT_URL + this.ACTIVITE_PN_URL);

		if (this._checkResponse(resp)) {
			$ = cheerio.load(resp.body);
			var result = [];
			$('table tr.ui-widget-content')
				.each(function (i, tr)  {
					result.push($(tr).find('td').map(function(i,td) { return $(td).text()}).get());
				});
			return result;
		}
	},

	setUserId: function (userId) {
		this.Session.setUserId(userId);
	},

	setSession: function (session) {
		this.Session.set(session);
		this.Jar.setSession(session);
	},

	revokeSession: function () {
		this.setSession('');
	},

	_checkResponse: function (resp) {
		this.Session.set(this.Jar.getSession());
		if ((resp.body && resp.body.indexOf('TOConnect/login.jsf') !== -1)
			|| (resp.headers && resp.headers.location && resp.headers.location.indexOf('login.jsf') !== -1)) {
			this.revokeSession();
			throw new Meteor.Error(401, "Echec authentification !", "Votre session a expirée.");
		}
		return resp && resp.statusCode == 200;
	},

	_httpCall: function (method = 'GET', url = '', options = {}) {
		check(method, String);
		check(url, String);

		// options.npmRequestOptions = _.defaults(options.npmRequestOptions || {}, {
		// 	rejectUnauthorized: false,
		// 	jar: this.Jar.getRequestJar()
		// });

		options = _.defaults(options, {
			jar: this.Jar.getRequestJar(),
			// rejectUnauthorized: false,
			// followRedirects: true,
			// headers: {
			// 	'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.99 Safari/537.36'
			// }
		});
		log([method, url].join(' '), this.Jar._jar.getCookieString(url));
		const resp = requestSync(_.extend({ url, method }, options));
		log(resp.statusCode, resp.href, _.pick(resp, 'body', 'headers'), this.Jar._jar.getCookieString(url));
		return resp;
	},

	_get: function (url, options) {
		return this._httpCall('GET', url, options);
	},

	_post: function (url, postData, options) {
		if (postData) {
			options = options || {};
			options.form = postData;
		}
		return this._httpCall('POST', url, options);
	}

});

TOConnectJar = function (cookieStr) {
	this._jar = request.jar();

	if (cookieStr) {
		this.setSession(cookieStr);
	}
};

_.extend(TOConnectJar.prototype, {
	getRequestJar: function () {
		return this._jar;
	},

	setCookie: function () {
		return this._jar.setCookie.apply(this._jar, arguments);
	},

	getCookieString: function () {
		return this._jar.getCookieString.apply(this._jar, arguments);
	},

	setSession: function (session) {
		return this.setCookie(session, 'https://connect.fr.transavia.com/TOConnect/');
	},

	getSession: function () {
		return this.getCookieString('https://connect.fr.transavia.com/TOConnect/');
	}
});

TOConnectSession = function (userId, session) {
	this._userId = userId || null;
	this._session = session || "";
}

_.extend(TOConnectSession.prototype, {
	set: function (session) {
		if (this._session !== session) {
			this._session = session;
			this.save();
		}
		return this;
	},
	get: function () {
		return this._session;
	},
	save: function () {
		if (this._userId) {
			console.log('SAVING...', this._session);
			Meteor.users.update(this._userId, {
				'$set': {
					'services.toconnect.session': this._session
				}
			});
		}
		return this;
	},
	setUserId: function (userId) {
		if (this._userId === null) {
			this._userId = userId;
		} else {
			throw new Meteor.Error(500, "Erreur !", "Il est interdit de tranférer une session à un autre utilisateur !");
		}
	}
});