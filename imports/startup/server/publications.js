Meteor.publish('cloud_events', function (start, end) {
  // Meteor._sleepForMs(1000)
	return Events.find({
		userId: this.userId,
		end: {$gte: +start},
		start: {$lte: +end}
	})
})

Meteor.publish('userServices', function () {
	if (this.userId) {
		return Meteor.users.find(this.userId, {
			fields: {
				username: 1,
				emails: 1,
				profile: 1,
				'services.google.email': 1,
				'services.password.reset.email': 1,
				'services.password.reset.reason': 1,
				'services.email.verificationTokens.address': 1
			}
		})
	} else {
		return this.ready()
	}
})