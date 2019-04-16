import { _ } from 'meteor/underscore';
import lodash from 'lodash';
import moment from 'moment';
_.noConflict();
window._ = _;
window._.mapValues = lodash.mapValues;
window.lodash = lodash;
window.moment = moment;
