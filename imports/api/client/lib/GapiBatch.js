import axios from 'axios'
import _ from 'lodash'
import { Meteor } from 'meteor/meteor'
import { HTTP, HTTPResponse } from './Http.js'

const BASE_URL = 'https://content.googleapis.com/'
const BOUNDARY = 'tosync-avapps-googleAPI-BaTcH'

function wait(ms) {
  return new Promise((resolve, reject) => {
    Meteor.setTimeout(resolve, ms)
  })
}

export default {
  async request(req, auth) {
    const options = {
      method: req.method || 'GET',
      baseURL: BASE_URL,
      url: req.path,
      params: req.params,
      headers: { Authorization: [auth.token_type, auth.access_token].join(' ') },
      maxContentLength: 1000000
    }
    return axios(options)
  },

  async batchRequest(reqs, batchPath, auth) {
    const batchBody = this.createBatchBody(reqs, BOUNDARY)
    const options = {
      method: 'POST',
      baseURL: BASE_URL,
      url: batchPath,
      headers: {
        'Content-Type': 'multipart/mixed; boundary="' + BOUNDARY + '"',
        'Authorization': [ auth.token_type, auth.access_token ].join(' ')
      },
      data: batchBody
    }

    const resp = await axios(options)
    return this.parseBatchResponse(resp)
  },

  async batchRequestWithBackoffRetry(reqs, batchPath, auth, delay = 1000) {
    let resp
    let retry = []
    let results = {}

    do {
      if (retry.length) {
        console.log('batchRequestWithBackoffRetry : backoffWait', delay)
        await wait(delay)
        delay *= 2
      }

      resp = await this.batchRequest(retry.length ? retry : reqs, batchPath, auth)
      retry = []

      if (_.has(resp, 'result') && _.isObject(resp.result)) {
        _.extend(results, resp.result)

        _.forEach(resp.result, (result, id) => {
          if (_.has(result, 'result.error.message') && result.result.error.message == "Rate Limit Exceeded") {
            const req = _.find(reqs, { id })
            if (req) retry.push(req)
          }
        })
      }
    } while (retry.length > 0)
    return _.extend(resp, { result: results, delay })
  },

  /**
   * Takes an array of API call objects and generates a string that can be used
   * as the body in a call to Google batch API.
   * @param  {object[]} apiCalls
   * @param  {string}   apiCalls[].[path]   - Path og the API call (ex: "/calendar/v3/users/me/calendarList")
   * @param  {string}   apiCalls[].[method] - Optional HTTP method. Defaults to GET.
   * @param  {object}   apiCalls[].[params] - Optional object with querystring parameters.
   * @param  {object}   apiCalls[].[data]   - Optional request body content.
   * @param  {string}   boundary            - String that delimits the calls.
   * @return {string}
   */
  createBatchBody(apiCalls, boundary) {
    let batchBody = []

    apiCalls.forEach(function(call) {
      const method = call.method || 'GET'
      const url = new URL(call.path, BASE_URL)

      if (call.params) {
        _.forEach(call.params, (value, key) => {
          url.searchParams.append(key, value)
        })
      }

      const id = call.id ? [ '\r\n', 'Content-ID: ', call.id ].join('') : ''
      const body = call.data ? [
        'Content-Type: application/json', '\r\n\r\n',

         JSON.stringify(call.data), '\r\n\r\n'
      ].join('') : '\r\n'

      batchBody = batchBody.concat([
        '--', boundary, '\r\n',
        'Content-Type: application/http',
        id, '\r\n\r\n',

        method, ' ', url.pathname, url.search || '', '\r\n',
        body
      ])
    })

    return batchBody.concat(['--', boundary, '--']).join('')
  },

  /**
   * Parses a raw string response from the Google batch API into objects.
   * @param  {string} : axios response object
   * @return {object[]}
   */
  parseBatchResponse(response) {
    if (_.has(response, 'headers.content-type')) {
      const match = response.headers['content-type'].match(/boundary=(.*)$/)
      if (match && match.length === 2) {
        const boundary = match[1]
        const subResps = response.data.split('--' + boundary)
        subResps.pop() // Last element is always "--\r\n"

        const result = {}
        let key = 0

        _.forEach(subResps, resp => {
          resp = resp.trim()
          if (resp.length && resp !== "--") {
            const splitIndex = resp.indexOf('HTTP')
            const partHeaders = HTTP.parseHeaders(resp.substring(0, splitIndex).trim().split('\r\n'))
            const subResp = HTTPResponse.parseResponse(resp.substring(splitIndex))

            const innerResult = _.pick(subResp, 'headers', 'status', 'statusText')

            if (_.has(subResp, 'payload') && _.isString(subResp.payload) && !_.isEmpty(subResp.payload.trim())) {
              try {
                _.extend(innerResult, {
                  body: subResp.payload.trim(),
                  result: JSON.parse(subResp.payload)
                })
              } catch (error) {
                console.log("Can't parse response payload : ", subResp)
              }
            }

            if (_.has(partHeaders, 'Content-ID')) {
              innerResult.id = _.get(partHeaders, 'Content-ID').replace('response-', '')
            } else {
              innerResult.id = ['UNKNOWN', key].join('-')
              key++
            }
            result[innerResult.id] = innerResult
          }
        })

        return {
          result,
          body: response.data,
          headers: response.headers,
          status: response.status,
          statusText: response.statusText,
          _axiosResponse: response
        }
      }
    }
    throw new Error("Can't find a valid boundary string in headers. Is it a multipart/mixed Http response ?")
    return null
  }
}
