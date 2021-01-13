import { DDPRateLimiter } from 'meteor/ddp-rate-limiter'

// Limite à 5 exécution toutes les 10 secondes
DDPRateLimiter.addRule({ type: 'method', name: 'tosync.subscribeUser' }, 5, 10000)
DDPRateLimiter.addRule({ type: 'method', name: 'tosync.adminSubscribeUser' }, 5, 10000)
DDPRateLimiter.addRule({ type: 'method', name: 'tosync.subscribeLoggedUser' }, 5, 10000)
DDPRateLimiter.addRule({ type: 'method', name: 'tosync.disableGoogleAuth' }, 5, 10000)
DDPRateLimiter.addRule({ type: 'method', name: 'tosync.addEmail' }, 5, 10000)
DDPRateLimiter.addRule({ type: 'method', name: 'tosync.verifyEmail' }, 5, 10000)
DDPRateLimiter.addRule({ type: 'method', name: 'tosync.removeEmail' }, 5, 10000)

DDPRateLimiter.addRule({ type: 'method', name: 'tosync.Events.getInterval' }, 5, 10000)
DDPRateLimiter.addRule({ type: 'method', name: 'tosync.Events.batchRemove' }, 5, 10000)