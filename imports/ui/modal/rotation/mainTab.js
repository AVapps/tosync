import { Template } from 'meteor/templating'
import './mainTab.html'
import AirportsData from '/imports/api/client/lib/AirportsData.js'
import _ from 'lodash'
import { DateTime } from 'luxon'

function mapCrew(list) {
  return _.map(list, trigramme => {
    const pn = PN.findOne({ trigramme })
    if (pn) {
      return pn
    } else {
      return { trigramme, fonction: '', nom: '', prenom: '' }
    }
  })
}

const ISO_TIME_FORMAT = { suppressSeconds: true, includeOffset: false }

Template.rotationModalMainTab.helpers({
	equipage() {
		const equipage = _.reduce(this.day.events, (crew, evt) => {
			if (evt.pnt && evt.pnt.length) {
				_.forEach(evt.pnt, tri => {
					if (!_.includes(crew.pnt, tri)) crew.pnt.push(tri)
				})
			}
			if (evt.pnc && evt.pnc.length) {
				_.forEach(evt.pnc, tri => {
					if (!_.includes(crew.pnc, tri)) crew.pnc.push(tri)
				})
			}
			return crew
		}, { pnt: [], pnc: [] })

		return { pnt: mapCrew(equipage.pnt), pnc: mapCrew(equipage.pnc) }
	}
})

Template.listeEquipageRotationModal.helpers({
	showList() {
		return (this.pnt && this.pnt.length) || (this.pnc && this.pnc.length)
	}
})

Template.volsTable.helpers({
	showTable() {
		return this.etapes && this.etapes.length
	},

	remarks() {
		return _.chain(this.etapes)
			.filter(vol => vol.remark && vol.remark.length)
			.map('remark')
			.value()
	},

	airports() {
		return _.chain(_.map(this.etapes, 'from').concat(_.map(this.etapes, 'to')))
			.uniq()
			.without('ORY', 'CDG')
			.map(code => AirportsData.find(code))
			.filter(_.identity)
			.value()
	}
})

Template.volsTableRow.helpers({
	is(tag) {
		return this.vol.tag === tag
	},

	showReal() {
		return this.vol.real || (this.editing && this.vol.tag == 'vol')
	}
})

Template.volsTableRow.events({
	'input input': function(e,t) {
		const time = e.currentTarget.value
		if (time) {
			const field = e.currentTarget.name
			const isReal = field.indexOf('real') != -1
			const [hour, minute] = time.split(':')

			// console.log(field, isReal, time, hour, minute)

			if (field == 'start') {
				const start = DateTime.fromMillis(_.get(t.data.vol, field)).set({ hour, minute })
				const end = start.plus({ hours: t.data.vol.tv })
				const set = {
					event: t.data.vol,
					set: {
						start: start.valueOf(),
						end: end.valueOf()
					}
				}

				if (!t.data.vol.real) {
					_.extend(set.set, {
						'real.start': start.valueOf(),
						'real.end': end.valueOf()
					})
				}

				t.$(e.currentTarget).trigger('set.tosync', set)
				t.$('input[name=end]').val(end.toISOTime(ISO_TIME_FORMAT))
			} else if (field == 'end') {
				const start = _.get(t.data.vol, 'start')
				let end = DateTime.fromMillis(_.get(t.data.vol, field)).set({ hour, minute })

				if (end < start) {
					end = end.plus({ day: 1 })
				}

				const set = {
					event: t.data.vol,
					set: {
						end: end.valueOf()
					}
				}

				if (!t.data.vol.real) {
					_.extend(set.set, {
						end: end.valueOf(),
						'real.start': start,
						'real.end': end.valueOf()
					})
				}

				t.$(e.currentTarget).trigger('set.tosync', set)
			} else if (field == 'real.start') {
				let realStart = DateTime.fromMillis(t.data.vol.start).set({ hour, minute })

				if (!t.data.vol.real) {
					t.data.vol.real = _.pick(t.data.vol, 'start', 'end')
				}

				if (DateTime.fromMillis(t.data.vol.start).diff(realStart).as('hours') > 1) {
					realStart = realStart.plus({ day: 1 })
				}

				const realEnd = realStart.plus({ hours: t.data.vol.tv })

				t.$(e.currentTarget).trigger('set.tosync', {
					event: t.data.vol,
					set: {
						"real.start": realStart.valueOf(),
						"real.end": realEnd.valueOf()
					}
				})
				t.$('input[name=real\\.end]').val(realEnd.toISOTime(ISO_TIME_FORMAT))
			} else if (field == 'real.end') {
				if (t.data.vol.real && t.data.vol.real.start) {
					const realStart = _.get(t.data.vol, 'real.start')
					let realEnd = DateTime.fromMillis(_.get(t.data.vol, 'real.end')).set({ hour, minute })
					if (+realEnd < realStart) {
						realEnd = realEnd.plus({ day: 1 })
					}
					t.$(e.currentTarget).trigger('set.tosync', { event: t.data.vol, set: { [field]: realEnd.valueOf() }})
				}
			}

		}
	},

    'click .remove-button': function (e,t) {
		    t.$('tr').trigger('removeEvent.tosync', this.vol._id).fadeOut()
    }
})

Template.volTimeField.helpers({
	fieldValue() {
		let m = _.get(this.vol, this.field)
		if (!m && this.field.indexOf('real') != -1) {
			m = _.get(this.vol, this.field.replace("real.", ""))
		}
		return m ? DateTime.fromMillis(m).toISOTime(ISO_TIME_FORMAT) : ""
	}
})

Template.serviceVolTable.helpers({
  showSv() {
		return !_.isEmpty(this.sv)
	},

	isoTime(dt) {
		return dt.toISOTime(ISO_TIME_FORMAT)
	},

	diffDT(startDT, endDT) {
		return endDT.diff(startDT).as('hours')
	}
})
