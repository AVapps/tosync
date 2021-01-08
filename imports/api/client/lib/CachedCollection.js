import { Ground } from 'meteor/adrienv:grounddb'
import { Mongo } from 'meteor/mongo'
import { Tracker } from 'meteor/tracker'
import { ReactiveVar } from 'meteor/reactive-var'

function strId(id) {
  if (id && id._str) {
    return id._str
  }
  return id
}

export class CachedCollection extends Mongo.Collection {
  constructor(name, options) {
    super(name, options)
    this._cacheName = [name, 'cache'].join('_')
    this._cacheCollection = new Ground.Collection(this._cacheName)

    this._cacheCollectionLoaded = new ReactiveVar(false)
    this._cacheCollection.once('loaded', () => {
      this._cacheCollectionLoaded.set(true)
    })

    // Store original find functions
    this.orgFind = this.find
    this.orgFindOne = this.findOne

    // Copy state properties
    this.pendingReads = this._cacheCollection.pendingReads
    this.pendingWrites = this._cacheCollection.pendingWrites

    // Overwrite collection finds using the grounded data
    this.find = (...args) => {
      return this._cacheCollection.find(...args)
    }

    this.findOne = (...args) => {
      return this._cacheCollection.findOne(...args)
    }

    this.once = (...args) => {
      return this._cacheCollection.once(...args)
    }
  }

  get loaded() {
    return this._cacheCollectionLoaded.get()
  }

  sync(selector) { // Same selector as find
    // console.log('SYNC', selector, this.orgFind(selector).count())
    this.removeLocalOnlyFrom(selector, false)
    const handle = this._cacheCollection.observeSource(this.orgFind(selector))
    this._cacheCollection.invalidate()
    return handle
  }

  stopSync() {
    this._cacheCollection.stopObserver()
  }

  removeLocalOnlyFrom(selector, invalidate = true) { // Same selector as find
    // Map the ground db storage into an array of id's
    const currentIds = this.find(selector, { reactive: false }).map((doc) => strId(doc._id))
    // Map MiniMongo find in an array of id's
    const keepIds = this.orgFind(selector, { reactive: false }).map((doc) => strId(doc._id))
    // Remove all other documents from the collection
    _.each(_.difference(currentIds, keepIds), (_id) => {
      // Remove it from in memory
      delete this._cacheCollection._collection._docs._map[_id]
      // Remove it from storage
      this._cacheCollection.saveDocument({ _id }, true)
    })
    if (invalidate) this._cacheCollection.invalidate()
  }

  removeFromCacheBefore(time) {
    return this._cacheCollection.remove({
      end: {
        $lte: time
      }
    })
  }

  removeLocalOnly() {
    // Remove all documents not in current subscription
    this._cacheCollection.keep(this.orgFind())
  }
}
