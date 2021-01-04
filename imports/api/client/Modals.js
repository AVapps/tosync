export default {
	Day: {
		open() {
			$('#modal').modal('show')
		},
		close() {
			$('#modal').modal('hide')
		}
	},

	Enroll: {
		open() {
			$('#enrollModal').modal('show')
		},
		close() {
			$('#enrollModal').modal('hide')
		}
	},

	Google: {
		open() {
      $('#google').modal('show')
		},
		close() {
			$('#google').modal('hide')
		}
	},

	Remu: {
		open() {
			$('#remu').modal('show')
		},
		close() {
			$('#remu').modal('hide')
		}
	},

  Changelog: {
		open() {
			$('#changelog').modal('show')
		},
		close() {
			$('#changelog').modal('hide')
		}
	},

  Changes: {
		open() {
			return $('#changesModal').modal('show')
		},
		close() {
			return $('#changesModal').modal('hide')
		}
	}
}
