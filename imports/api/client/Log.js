Log = new Meteor.Collection('log');
var handle = Meteor.subscribe('log');

Tracker.autorun(function () {
	var data = handle.ready() ? Log.findOne() : null;
	if (console && data && data.data) console.log('LOG : ', data.data);
});