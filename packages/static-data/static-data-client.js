Static = {};

Static.Data = {
	_versions: null,
	_localVersions: null,
	_staticDataSub: null,

	_staticCollections: new Map(),

	init() {
		this._versions = new Mongo.Collection('staticDataRevisions');
		this._localVersions = new Ground.Collection('local_versions', { connection: null });
		this._staticDataSub = Meteor.subscribe('staticDataRevisions');
	},

	register(name, collection) {
		const computation = Tracker.autorun(() => {
			this.onVersionChange(name, collection);
		});
		this._staticCollections.set(name, {collection, computation});
	},

	onVersionChange(name, collection) {
		this.checkVersion(name, collection);
	},

	checkVersion(name, collection) {
		if (this._staticDataSub.ready() && collection.ready()) {
			const newVersion = this._versions.findOne({collection: name}, {fields: {version: 1}});
			const localVersion = this._localVersions.findOne({collection: name}, {reactive: false, fields: {version: 1}});
			// console.log(name, newVersion, localVersion);
			if (_.isUndefined(localVersion)) {
				// console.log('No locale version of ', name, ' : creating one ...');
				this.createLocalVersion(name, collection);
				collection.updateStaticData(() => this.setLocalVersion(name, newVersion.version));
			}
			if (newVersion && _.isNumber(newVersion.version) && localVersion && localVersion.version != newVersion.version) {
				// console.log('Version of "' + name + '" collection has changed !', 'Loading new collection data...');
				collection.updateStaticData(() => this.setLocalVersion(name, newVersion.version));
			}
		}
	},

	createLocalVersion(name, version) {
		return this._localVersions.insert({
			collection: name,
			version: null
		});
	},

	setLocalVersion(name, version) {
		return this._localVersions.update({collection: name}, {
			$set: { version }
		});
	},

	getCollection(collectionName) {
		check(collectionName, String);
		const collection = this._staticCollections.get(collectionName)
		return collection && collection.collection;
	}
};

Static.Collection = class StaticCollection extends Mongo.Collection {
	constructor(name, options) {
		options = options || {};
		options.connection = null;
		super(name, options);
		Ground.Collection(this);

		this._allowStaticImport = null;
		this._localDataReady = new ReactiveVar(false);
		this.on('loaded', () => {
			// console.log(name, 'READY');
			this._localDataReady.set(true);
		});
		Static.Data.register(name, this);
	}

	ready() {
		return this._localDataReady.get();
	}

	updateStaticData(successCb) {
		// console.log('Updating data of ' + this._name + '...')
		Meteor.call('fetchStaticData', this._name, (err,data) => {
			if (err) {
				throw err;
			} else if (_.isArray(data) && data.length) {
				// console.log('Receiving data for ' + this._name + ' : ', data);
				this.remove({});
				let res;
				if (this.batchInsert) {
					res = this.batchInsert(data);
				} else {
					res = _.map(data, rec => this.insert(rec));
				}
				if (_.isFunction(successCb)) successCb(res);
			} else {
				// console.log('... no data yet for ' + this._name + ' !');
				Static.Data.setLocalVersion(this._name, null);
			}
		});
		return this;
	}

	checkVersion() {
		Static.Data.checkVersion(this._name, this);
		return this;
	}

	importStaticData(dataStr, cb) {
		if (!this._allowStaticImport || !this._allowStaticImport.apply(this)) throw new Meteor.Error('Not authorized', "You're not authorized to update static data of this collection !");
		Meteor.call('importStaticData', this._name, dataStr, cb);
		return this;
	}

	allowStaticImport(handler) {
		check(handler, Function);
		this._allowStaticImport = handler;
		return this;
	}
}

Static.Data.init();