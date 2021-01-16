import { DateTime } from 'luxon'
import { EJSON } from 'meteor/ejson'

DateTime.prototype.typeName = () => 'DateTime'
DateTime.prototype.toJSONValue = function toJSONValue() {
	return this.toISO()
}

EJSON.addType('DateTime', (value) => DateTime.fromISO(value))