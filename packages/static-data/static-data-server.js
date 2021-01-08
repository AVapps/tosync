Static = {};

Static.Data = {
	_versions: null,
	_staticCollections: new Map(),

	init: function() {
		this._versions = new Mongo.Collection('staticDataRevisions');
		const fn = () => true;
		this._versions.deny({
			insert: fn,
			update: fn,
			remove: fn,
			fetch: []
		});
		this.publish();
	},

	publish: function () {
		const collection = this._versions;
		return Meteor.publish('staticDataRevisions', function () {
			return collection.find({});
		});
	},

	registerCollection: function (name, collection) {
		const fn = () => true;
		collection.deny({
			insert: fn,
			update: fn,
			remove: fn,
			fetch: []
		});
		this._staticCollections.set(name, collection);
		let rev = this._versions.findOne({collection: name});
		if (!rev) {
			rev = {
				collection: name,
				version: 0
			};
			rev._id = this._versions.insert(rev);
		}
		return rev;
	},

	getCollection: function (collectionName) {
		check(collectionName, String);
		if (!this._staticCollections.has(collectionName)) throw new Meteor.Error("500 - Collection not found", "Collection not found !");
		return this._staticCollections.get(collectionName);
	},

	removeCollection: function (collectionName) {
		return this._versions.remove({collection: collectionName});
	},

	getVersion: function (collectionName) {
		const version = this._versions.findOne({collection: collectionName});
		return version && version.version;
	},

	setVersion: function (collectionName, version) {
		return this._versions.update({collection: collectionName}, {
			$set: { version }
		});
	},

	incVersion: function (collectionName) {
		return this._versions.update({collection: collectionName}, {
			$inc: { version: 1 }
		});
	},

	fetchCollectionData: function (collectionName) {
		const collection = this.getCollection(collectionName);
		if (!collection._allowStaticPublish || collection._allowStaticPublish.apply(this)) {
			return this.getCollection(collectionName).find({}).fetch();
		} else {
			return [];
		}
	},

	importCollectionData: function (collectionName, data) {
		const collection = this.getCollection(collectionName);
		if (collection) return collection.importData(data);
	}
};

Static.Collection = class StaticCollection extends Mongo.Collection {
	constructor(name, options) {
		super(name, options);
		Static.Data.registerCollection(name, this);
		this._allowStaticUpdate = null;
		this._allowStaticPublish = null;
	}

	getVersion() {
		return Static.Data.getVersion(this._name);
	}

	setVersion(version) {
		return Static.Data.setVersion(this._name, version);
	}

	incVersion() {
		return Static.Data.incVersion(this._name);
	}

	importData(data) {
		if (!this._allowStaticUpdate || !this._allowStaticUpdate.apply(this)) throw new Meteor.Error('Not authorized', "You're not authorized to update static data of this colection !");
		data = EJSON.parse(data);
		check(data, Array);
		let result = {};
		result.removed = this.remove({});
		result.inserted = _.map(data, rec => this.insert(rec));
		this.incVersion();
		return result;
	}

	allowStaticUpdate(handler) {
		check(handler, Function);
		this._allowStaticUpdate = handler;
		return this;
	}

	allowStaticPublish(handler) {
		check(handler, Function);
		this._allowStaticPublish = handler;
		return this;
	}
}

Meteor.methods({
	fetchStaticData: function(collectionName) {
		check(collectionName, String);
		return Static.Data.fetchCollectionData(collectionName);
	},

	importStaticData: function(collectionName, data) {
		check(collectionName, String);
		check(data, String);
		return Static.Data.getCollection(collectionName).importData(data);
	}
});

Static.Data.init();