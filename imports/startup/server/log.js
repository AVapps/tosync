Log = new Meteor.Collection('log');
Log.remove({});
Log.insert({data: ""});

// Meteor.settings.clientLog = true;

log = function log() {
	if (Meteor.settings.clientLog) {
		Log.update({}, {$set: {data: arguments}});
		console.log.apply(console, arguments);
	}
}