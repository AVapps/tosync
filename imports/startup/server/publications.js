Meteor.publish('cloud_events', function (start, end) {
  // Meteor._sleepForMs(1000)
	return Events.find({
		userId: this.userId,
		end: {$gte: +start},
		start: {$lte: +end}
	})
})