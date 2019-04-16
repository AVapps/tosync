Events.allow({
	insert: function (userId, doc) {
		return userId === doc.userId;
	},
	update: function (userId, doc, fieldNames, modifier) {
		return userId === doc.userId;
	},
	remove: function (userId, doc) {
		return userId === doc.userId;
	}
});

HV100.allowStaticUpdate(function () {
	return false;
});

HV100.allowStaticPublish(function () {
	return Meteor.userId();
});

PN.allowStaticUpdate(function () {
	return false;
});

PN.allowStaticPublish(function () {
	return Meteor.userId();
});

Airports.allowStaticUpdate(function () {
	return false;
});

Airports.allowStaticPublish(function () {
	return Meteor.userId();
});
