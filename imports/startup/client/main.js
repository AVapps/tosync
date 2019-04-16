import './helpers.js';

import '../../api/client/lib/format.min.js';
import '../../api/client/lib/moment.lang.fr';

import '../../api/client/App.js';
import '../../api/client/Notifications.js';
import '../../api/client/Gapi.js';
// import '../../api/client/Remu.js';
import '../../api/client/Sync.js';
import '../../api/client/Config.js';
import '../../api/client/Log.js';

import '../../api/client/collections.js';
import '../../api/toconnect/client/login.js';

import '../../api/client/Calendar.js';
import '../../api/client/Connect.js';
import '../../api/client/Controller.js';
import '../../api/client/Modals.js';

import '../../lib/moment-ejson.js';

// Session Init
Session.set('calendarList', []);
Session.set('calendarLoading', false);
Session.setDefault('showLogin', false);

$(function() {
	FastClick.attach(document.body);
});

Config.init();
Connect.init();
Controller.init();
