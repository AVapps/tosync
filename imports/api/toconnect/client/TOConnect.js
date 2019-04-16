import parseICSFile from './parseICSFile';
import parseActivitePN from './parseActivitePN';

const TOConnect = {
	login(login, password, cb) {
		return Meteor.loginConnect(login, password, cb);
	},

	logout() {
		return true;
	},

	fetchSyncData(cb) {
		return Meteor.call('getSyncData', function (error, data) {
			if (error) {
				cb(error);
			} else {
				if (_.has(data, 'import')) {
					data['import'] = parseICSFile(data['import']);
				}

				if (_.has(data, 'upsert')) {
					data['upsert'] = parseActivitePN(data['upsert']);
				}

				cb(null, data);
			}
		});
	}
};

export { parseICSFile, parseActivitePN, TOConnect };
