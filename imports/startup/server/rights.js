import { Meteor } from 'meteor/meteor'

function isAdmin() {
  const userId = Meteor.userId()
  if (userId) {
    const user = Meteor.users.findOne({ _id: userId }, { fields: { username: 1 }})
    return user && user.username && user.username === Meteor.settings.public.adminUser
  }
  return false
}

Events.allow({
	insert(userId, doc) {
		return userId === doc.userId
	},
	update(userId, doc, fieldNames, modifier) {
		return userId === doc.userId
	},
	remove(userId, doc) {
		return userId === doc.userId
	}
})

// Used for testing only
// Meteor.users.allow({
// 	insert(userId, doc) {
// 		return isAdmin()
// 	},
// 	update(userId, doc, fieldNames, modifier) {
// 		return isAdmin()
// 	},
// 	remove(userId, doc) {
// 		return isAdmin()
// 	}
// })

HV100.allowStaticUpdate(function () {
	return isAdmin()
})

HV100.allowStaticPublish(function () {
	return Meteor.userId()
})

HV100AF.allowStaticUpdate(function () {
	return isAdmin()
})

HV100AF.allowStaticPublish(function () {
	return Meteor.userId()
})

PN.allowStaticUpdate(function () {
	return isAdmin()
})

PN.allowStaticPublish(function () {
	return Meteor.userId()
})

Airports.allowStaticUpdate(function () {
	return isAdmin()
})

Airports.allowStaticPublish(function () {
	return Meteor.userId()
})
