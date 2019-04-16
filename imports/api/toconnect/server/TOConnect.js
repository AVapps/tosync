import { TOConnectManager } from './lib/connect.js';
export const TOConnect = {
	loginHandler(loginRequest) {
		//there are multiple login handlers in meteor.
		//a login request go through all these handlers to find it's login hander
		//so in our login handler, we only consider login requests which has trigramme field
		if(!loginRequest.trigramme) {
			return undefined;
		}

		var toconnect = new TOConnectManager();

		if (toconnect.login(loginRequest.trigramme, loginRequest.password)) {
			var userId = null;
			var user = Meteor.users.findOne({ username: loginRequest.trigramme });

			if(!user) {
				user = {
					createdAt: +(new Date),
					username: loginRequest.trigramme,
					active: true,
					profile: toconnect.getUserData(),
					services: {
						toconnect: {
							id: loginRequest.trigramme,
							session: toconnect.Session.get()
						}
					}
				};
				userId = Meteor.users.insert(user);

				// Update old events
				Events.update({ userId: loginRequest.trigramme }, {'$set': { userId: userId }}, { multi: true });
			} else {
				userId = user._id;
				toconnect.setUserId(userId);

				if (!user.active) {
					const profil = toconnect.getUserData();
					Meteor.users.update(user._id, {
						'$set': {
							createdAt: +(new Date),
							active: true,
							profile: {
								nom: profil.nom || user.profile.nom,
								prenom: profil.prenom || user.profile.prenom,
								fonction: profil.fonction || user.profile.fonction,
								email: profil.email || user.profile.email,
							}
						}
					});
					// Update old events
					Events.update({ userId: loginRequest.trigramme }, {'$set': { userId: userId }}, { multi: true });
				}

				if (!user.profile.nom) {
					const profil = toconnect.getUserData();
					Meteor.users.update(user._id, {
						'$set': {
							'profile.nom': profil.nom
						}
					});
				}

				toconnect.Session.save();
			}
		} else {
			throw new Meteor.Error(401, "Erreur d'authentification !");
		}

		return {
			userId: userId
		};
	},

	checkSession(userId) {
		return new TOConnectManager(userId).checkSession();
	},

	getPlanning(userId) {
		return new TOConnectManager(userId).getPlanning();
	},

	getActivitePN(userId) {
		return new TOConnectManager(userId).getActivitePN();
	},

	getSyncData(userId) {
		var toconnect = new TOConnectManager(userId),
			result = {};

		try {
			result['import'] = toconnect.getPlanning();
		} catch (e) {
			result.importError = e;
		}

		try {
			result['upsert'] = toconnect.getActivitePN();
		} catch (e) {
			result.activitePNError = e;
		}

		return result;
	},
};
