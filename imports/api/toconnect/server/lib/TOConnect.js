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
    this.windowId = null
    if (session) {
      if (_.isString(session)) {
        // console.log('TOConnect.init : session isString', session)
        this.cookieJar.setCookieSync(session, ROOT_URL + LOGIN_URL)
      } else if (_.isObject(session)) {
        // console.log('TOConnect.init : session isObject')
        if (_.has(session, 'cookie') && _.isString(session.cookie)) {
          // console.log('TOConnect.init : setting cookieString', session.cookie)
          this.cookieJar.setCookieSync(session.cookie, ROOT_URL + LOGIN_URL)
        }
        if (_.has(session, 'windowId')) {
          // console.log('TOConnect.init : setting windowId', session.windowId)
          this.windowId = session.windowId
        }
      }
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

  saveWindowId(path) {
    const url = new URL(ROOT_URL + path)
    if (url.searchParams.has('windowId')) {
      this.windowId = url.searchParams.get('windowId')
      // console.log('windowId found', this.windowId)
      return this.windowId
    }
  }

  async checkSession() {
    if (!this.getSession().cookie) return { connected: false }
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
    let resp = await this._get(ROOT_URL + CHANGES_URL, { maxRedirects: 0 })
    // if (this._checkResponse(resp)) {
    //   const $ = cheerio.load(resp.data)
    //   return $('th:contains(BEFORE CHANGE)').closest('table').html() || true
    // }

    // let resp = await this._get(url, { maxRedirects: 0 })

    if (this._checkResponse(resp)) {
      const $ = cheerio.load(resp.data)
      const $button = $(`form button:contains(Sign All Changes)`)

      if ($button.length) {
        const $form = $button.closest('form')

        if ($form.length) {
          const data = { 'javax.faces.partial.ajax' : true }
          const actionUrl = ROOT_URL + $form.attr('action')
          let formId
          $form.find('input[type=hidden]').each((i, el) => {
            const attr = el.attribs || {}
            if (attr.name && attr.value) {
              data[attr.name] = attr.value
              if (attr.name === attr.value) {
                formId = attr.name
              }
            }
          })

          if (!formId) throw new Meteor.Error('formid-not-found', "FormId introuvable")
          
          const op = [ formId, 'tab-change' ].join('_')
          _.extend(data, {
            'javax.faces.source': op,
            'javax.faces.partial.execute': op,
            'javax.faces.partial.render': op,
            [op]: op,
            [op+'_pagination']: true,
            [op+'_first']: 0,
            [op+'_rows']: 500,
            [op+'_encodeFeature']: true
          })

          resp = await this._post(actionUrl, data)
          
          if (this._checkResponse(resp)) {
            return resp.data
          }
        }
      }
    }
  }

  async getUserData() {
    let resp = await this._get(ROOT_URL + ACCUEIL_URL, { maxRedirects: 0 })

    if (this._checkResponse(resp) && resp.data.indexOf('accueilDonneesUtilisateur.jsf') !== -1) {
      let $ = cheerio.load(resp.data)
      const href = ROOT_URL + $('.app-user a .fa-cog').parent().attr('href')

      if (!href) throw new Meteor.Error(500, "Profil introuvable !")

      resp = await this._get(href, { maxRedirects: 0 })

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

  async getPlanning(type = 'calendar') {
    let resp = await this._get(ROOT_URL + PLANNING_URL, { maxRedirects: 0 })

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

      const buttonText = type === 'pdf' ? 'Pdf' : 'Agenda'

      const action = $(`button:contains(${buttonText})`).attr('name')

      data[action] = ''

      resp = await this._post(actionUrl,
        _.extend({
          formPlanning: 'formPlanning',
          formPlanning_tabListeActivites_selection: '',
          'javax.faces.ViewState': ''
        }, data),
        { maxRedirects: 0 }
      )

      const contentType = type === 'pdf' ? 'application/pdf' : 'text/calendar'

      if (this._checkResponse(resp) && resp.headers['content-type'].indexOf(contentType) !== -1) {
        return resp.data
      } else {
        throw new Meteor.Error(500, "Echec téléchargement !", "Le téléchargement de votre planning a échoué.")
      }
    } else {
      throw new Meteor.Error(500, "Planning introuvable !", "La page planning de TO Connect est inaccessible.")
    }
  }

  async getActivitePN(debut, fin) {
    const resp = await this._get(ROOT_URL + ACTIVITE_PN_URL, { maxRedirects: 0 })

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

  getSession() {
    const cookie = this.cookieJar.getCookieStringSync(ROOT_URL + LOGIN_URL)
    return { cookie, windowId: this.windowId }
  }

  revokeSession() {
    this.cookieJar.removeAllCookiesSync()
  }

  _checkResponse(resp) {
    console.log(resp.request.method, resp.request.path, resp.status, resp.statusText)
    if ((resp.data && resp.data.indexOf('TOConnect/login.jsf') !== -1)
      || (resp.headers && resp.headers.location && resp.headers.location.indexOf('login.jsf') !== -1)) {
      this.revokeSession()
      throw new Meteor.Error(401, "Echec authentification !", "Votre session a expirée.")
    }
    if (resp.status == 302) console.log(resp.headers)
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

    if (this.windowId) {
      if (_.has(options, 'params') && _.isObject(options.params)) {
        _.extend(options.params, { windowId: this.windowId })
      } else {
        options.params = { windowId: this.windowId }
      }
    } else if (_.has(options, 'maxRedirects') && options.maxRedirects === 0) {
      options.maxRedirects = 1
    }

    let resp
    try {
      // console.log(method, url, options)
      resp = await axios(_.extend({ url, method }, options))
    } catch (error) {
      // console.log(method, url, error.response.status, error.response.headers)
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.status >= 200 && error.response.status < 400) {
          resp = error.response
        } else {
          throw new Meteor.Error(error.response.status, error.response.statusText, _.isFunction(error.toJSON) ? error.toJSON() : undefined)
        }
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

    if (!this.windowId && resp) {
      this.saveWindowId(resp.request.path)
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
