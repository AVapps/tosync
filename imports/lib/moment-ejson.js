import moment from 'moment';
import { EJSON } from 'meteor/ejson';

// Ensure the `typeName` is the same as in the `addType` call
moment.fn.typeName = function () {return 'Moment'};

// Check if the moment is an instance of `Moment`, and if it matches our current value
moment.fn.equals = function (comp) {
	return this.isSame(comp);
};

// Map `toJSONValue` to `valueOf`
moment.fn.toJSONValue = moment.fn.valueOf;

// Add the new Moment type
EJSON.addType('Moment', function (value) { return moment(value) });