import parseICSFile from './parseICSFile';
import parseActivitePN from './parseActivitePN';

const TOConnect = {
	login(login, password, cb) {
		return Meteor.loginConnect(login, password, cb);
	},

	logout() {
		return true;
	},

  async validateChanges() {
    return new Promise((resolve, reject) => {
      Meteor.call('validateChanges', (error, data) => {
        if (!error && data) {
          resolve(data)
        } else {
          reject(error)
        }
      })
    })
  },

  async signPlanning() {
    return new Promise((resolve, reject) => {
      Meteor.call('signPlanning', (error, data) => {
        if (!error && data) {
          resolve(data)
        } else {
          reject(error)
        }
      })
    })
  },

	async fetchSyncData() {
		return new Promise((resolve, reject) => {
      Meteor.call('getSyncData', function (error, data) {
  			if (error) {
  				reject(error)
  			} else {
  				if (_.has(data, 'import')) {
  					data['import'] = parseICSFile(data['import']);
  				}

  				if (_.has(data, 'upsert')) {
  					data['upsert'] = parseActivitePN(data['upsert']);
  				}
          resolve(data)
  			}
  		})
    })
	},

  async getPlanning(type = 'calendar') {
		return new Promise((resolve, reject) => {
      Meteor.call('getPlanning', type, (error, data) => {
  			if (error) {
  				reject(error)
  			} else {
          resolve(data)
  			}
  		})
    })
	}
}

export { parseICSFile, parseActivitePN, TOConnect };
