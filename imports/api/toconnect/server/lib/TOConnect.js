import { Meteor } from 'meteor/meteor'
import _ from 'lodash'

import axios from 'axios'
import axiosCookieJarSupport from 'axios-cookiejar-support'
import { CookieJar } from 'tough-cookie'
import qs from 'qs'
import cheerio from 'cheerio'

axiosCookieJarSupport(axios)
axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded'

const ROOT_URL = 'https://connect.fr.transavia.com'
const LOGIN_URL = '/TOConnect/login.jsf'
const PLANNING_URL = '/TOConnect/pages/crewweb/planning.jsf'
const DASHBOARD_URL = '/TOConnect/pages/crewweb/dashboard.jsf'
const CHANGES_URL = '/TOConnect/pages/crewweb/changes.jsf'
const ACTIVITE_PN_URL = '/TOConnect/pages/activitePN.jsf'
const ACCUEIL_URL = '/TOConnect/accueil.jsf'

export default class TOConnect {
  constructor(session) {
    // console.log('TOConnect.init', session)
    this.cookieJar = new CookieJar()
    if (session && _.isString(session)) {
      this.cookieJar.setCookieSync(session, ROOT_URL + LOGIN_URL)
    }

  }

  async login(login, password) {
    let resp = await this._get(ROOT_URL + LOGIN_URL)

		if (resp  && resp.status === 200 && resp.data) {
			const $ = cheerio.load(resp.data)
			const data = {}

			const  $form = $('form[name=formLogin]')
			const action = ROOT_URL + ($form.attr('action') || LOGIN_URL)
			$form.find('input').each((index, el) => {
				const attr = el.attribs || {}
				if (attr.name && attr.value) {
					data[attr.name] = attr.value
				}
			})

			resp = await this._post(action, _.extend(data, {
				formLogin_username: login,
				formLogin_password: password,
				formLogin_actionLogin: ''
			}))

			if (resp && resp.status === 302 && resp.headers.location && resp.headers.location.indexOf('accueil.jsf') !== -1) {
				resp = await this._get(resp.headers.location)
			}

			// Login Successfull
			if (resp  && resp.status === 200 && resp.data.indexOf('accueilDonneesUtilisateur.jsf') !== -1) {
				return true
			} else {
				throw new Meteor.Error(401, "Echec authentification !", "Identifiant ou mot de passe incorrect.")
			}
		} else {
			throw new Meteor.Error(500, "Connexion impossible !", "TO Connect est inaccessible...")
		}
		throw new Meteor.Error(500, "Connexion impossible !")
	}

	async checkSession() {
		if (!this.getSession()) return { connected: false }
		return this.getState()
	}

  async getState() {
    const resp = await this._get(ROOT_URL + DASHBOARD_URL, { maxRedirects: 0 })
    if (this._checkResponse(resp)) {
      let changesPending = resp.data.indexOf("Please check your planning modifications</a>") !== -1
      if (changesPending) {
        changesPending = await this.getChangesPending()
      }

      const signNeeded = resp.data.indexOf("Please validate your planning</a>") !== -1
      return {
        connected: true,
        changesPending,
        signNeeded
      }
    } else {
      return { connected: false }
    }
  }

  async getChangesPending() {
    const resp = await this._get(ROOT_URL + CHANGES_URL)
    if (this._checkResponse(resp)) {
      const $ = cheerio.load(resp.data)
      return $('th:contains(BEFORE CHANGE)').closest('table').html() || true
    }
  }

	async getUserData() {
		let resp = await this._get(ROOT_URL + ACCUEIL_URL)

		if (this._checkResponse(resp) && resp.data.indexOf('accueilDonneesUtilisateur.jsf') !== -1) {
			let $ = cheerio.load(resp.data)
			const href = ROOT_URL + $('.app-user a .fa-cog').parent().attr('href')

			if (!href) throw new Meteor.Error(500, "Profil introuvable !")

			resp = await this._get(href)

			if (this._checkResponse(resp)) {
				$ = cheerio.load(resp.data)

				const profil = { nom: '', prenom: '', email: '', fonction: '' }

				$('#form_dossierUtilisateur table tr').each((index, row) => {
					const $cells = $(row).find('td')

					const heading = $cells.eq(0).text()
							.replace(/\*|\:/g, '')
							.trim()
							.toLowerCase()
							.replace(/\s/g,'_')
							.replace(/é/g,'e')
					const value = $cells.eq(1).text().trim()

					if (heading && value) {
						profil[heading] = value
					}
				})
				return _.pick(profil, 'nom', 'prenom', 'email', 'fonction')
			} else {
				throw new Meteor.Error(500, "Page de profil introuvable !", "TO Connect a peut-être été mis à jour.")
			}
		} else {
			throw new Meteor.Error(401, "Echec authentification !", "Votre session a expirée.")
		}
	}

	async getPlanning() {
		let resp = await this._get(ROOT_URL + PLANNING_URL)

		if (this._checkResponse(resp)) {
			const $ = cheerio.load(resp.data)

			if ($('.erreur').length || resp.data.indexOf('Sign Roster') !== -1) {
				throw new Meteor.Error(409, "Planning non signé !", "Vous devez valider votre planning avant de pouvoir l'importer !")
			}

			const data = {}
			const $form = $('form[name=formPlanning]')
			const actionUrl = ROOT_URL + ($form.attr('action') || PLANNING_URL)
			$('form[name=formPlanning] input').each((index, el) => {
				const attr = el.attribs || {}
				if (attr.name && attr.value) {
					data[attr.name] = attr.value
				}
			})

			const action = $('button:contains(Agenda)').attr('name')

			data[action] = ''

			resp = await this._post(actionUrl,
				_.extend({
					formPlanning: 'formPlanning',
					formPlanning_tabListeActivites_selection: '',
					'javax.faces.ViewState': ''
				}, data),
				{
					maxRedirects: 0
				}
			)

			if (this._checkResponse(resp) && resp.headers['content-type'].indexOf("text/calendar") !== -1) {
				return resp.data
			} else {
				throw new Meteor.Error(500, "Echec téléchargement !", "Le téléchargement de votre planning a échoué.")
			}
		} else {
			throw new Meteor.Error(500, "Planning introuvable !", "La page planning de TO Connect est inaccessible.")
		}
	}

  async validateChanges() {
    const success = await this.validate(ROOT_URL + CHANGES_URL, "Sign All Changes")
    if (success) {
      return this.getState()
    } else {
      throw new Meteor.Error(500, "Erreur !", "La signature du planning a échoué.")
    }
  }

  async signPlanning() {
    const success = await this.validate(ROOT_URL + PLANNING_URL, "Sign Roster")
    if (success) {
      return this.getState()
    } else {
      throw new Meteor.Error(500, "Erreur !", "La validation des modifications a échoué.")
    }
  }

  async validate(url, buttonText) {
    let resp = await this._get(url, { maxRedirects: 0 })
    console.log(resp.status, resp.headers, resp.path)
		if (this._checkResponse(resp)) {
			const $ = cheerio.load(resp.data)
      const $button = $(`form button:contains(${ buttonText })`)

			if ($button.length) {
        const $form = $button.closest('form')

        if ($form.length) {
          const data = {}
          const actionUrl = ROOT_URL + $form.attr('action')
          $form.find('input[type=hidden]').each((index, el) => {
            const attr = el.attribs || {}
            if (attr.name && attr.value) {
              data[attr.name] = attr.value
            }
          })

          const action = $button.attr('name')
          if (action) data[action] = ""

          resp = await this._post(actionUrl, data)
          return this._checkResponse(resp)
        }
			}
		}
  }

	async getActivitePN(debut, fin) {
		const resp = await this._get(ROOT_URL + ACTIVITE_PN_URL)

		if (this._checkResponse(resp)) {
			const $ = cheerio.load(resp.data)
			const result = []
			$('table tr.ui-widget-content')
				.each((i, tr) => {
					result.push($(tr).find('td').map((i,td) => $(td).text()).get())
        })
			return result
		}
	}

  getSession() {
    return this.cookieJar.getCookieStringSync(ROOT_URL + LOGIN_URL)
  }

	revokeSession() {
		this.cookieJar.removeAllCookiesSync()
	}

	_checkResponse(resp) {
    console.log('TOConnect._checkResponse', resp.request.method, resp.request.path, resp.status, resp.statusText)
		if ((resp.data && resp.data.indexOf('TOConnect/login.jsf') !== -1)
			|| (resp.headers && resp.headers.location && resp.headers.location.indexOf('login.jsf') !== -1)) {
			this.revokeSession()
			throw new Meteor.Error(401, "Echec authentification !", "Votre session a expirée.")
		}
		return resp && resp.status === 200
	}

	async _http(method = 'GET', url = '', options = {}) {
		check(method, String)
		check(url, String)

		options = _.defaults(options, {
      jar: this.cookieJar,
      withCredentials: true,
      validateStatus: function (status) {
        return status >= 200 && status < 400
      }
			// maxRedirects: 5, // default
		})
    let resp
    try {
      resp = await axios(_.extend({ url, method }, options))
    } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        throw new Meteor.Error(error.response.status, error.response.statusText, _.isFunction(error.toJSON) ? error.toJSON() : undefined)
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        throw new Meteor.Error('no-response', "No response to request was received !")
      } else {
        // Something happened in setting up the request that triggered an Error
        throw new Meteor.Error('request-error', "Error during request setup !")
      }
    }
    return resp
	}

	_get(url, options) {
		return this._http('GET', url, options)
	}

	_post(url, postData, options) {
		if (postData) {
			options = options || {}
			options.data = qs.stringify(postData)
		}
		return this._http('POST', url, options)
	}
}
