import _ from 'lodash'
import GARES from './Gares.js'

export default {
  find(code) {
    return Airports.findOne({ iata: code }) || _.find(GARES, { code })
  }
}
