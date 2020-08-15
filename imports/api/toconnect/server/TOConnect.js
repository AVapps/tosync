import TOConnectManager from './TOConnectManager.js'

export const TOConnect = {
	async checkSession(userId) {
		return new TOConnectManager(userId).checkSession()
	},

	async getPlanning(userId, type) {
		return new TOConnectManager(userId).getPlanning(type)
	},

  async validateChanges(userId) {
		return new TOConnectManager(userId).validateChanges()
	},

  async signPlanning(userId) {
		return new TOConnectManager(userId).signPlanning()
	},

	async getActivitePN(userId) {
		return new TOConnectManager(userId).getActivitePN()
	},

	async getSyncData(userId) {
		const connect = new TOConnectManager(userId)
    const result = {
      'import': await connect.getPlanning(),
      'upsert': await connect.getActivitePN()
    }
		return result
	}
}
