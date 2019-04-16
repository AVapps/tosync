Meteor.loginConnect = function(login, password, callback) {
	var loginRequest = {'trigramme': login, 'password': password};
	//send the login request
	Accounts.callLoginMethod({
		methodArguments: [loginRequest],
		userCallback: callback
	});
};