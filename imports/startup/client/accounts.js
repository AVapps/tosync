import { Accounts } from 'meteor/accounts-base'

Accounts.config({
  restrictCreationByEmailDomain: 'fr.transavia.com',
  forbidClientAccountCreation: true,
  sendVerificationEmail: true
})