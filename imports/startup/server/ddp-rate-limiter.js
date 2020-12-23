import { DDPRateLimiter } from 'meteor/ddp-rate-limiter'

// Limite le nombre de tentatives de création de compte à 5 toutes les 10 secondes
DDPRateLimiter.addRule({ type: 'method', name: 'tosync.subscribeUser' }, 5, 10000)