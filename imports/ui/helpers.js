/**
Global helpers
**/
import moment from 'moment'
import Utils from '../api/client/lib/Utils.js'

Template.registerHelper('format', function (m, format) {
	if (m == undefined) return ''
	return moment.isMoment(m) ? m.format(format) : moment(m).format(format)
})

Template.registerHelper('formatUTC', function (m, format) {
	if (m == undefined) return ''
	return moment.isMoment(m) ? m.clone().utc().format(format) : moment(m).utc().format(format)
})

Template.registerHelper('date', function (m) {
	if (!moment.isMoment(m)) m = moment(m)
	return m.format('DD/MM/YYYY')
})

Template.registerHelper('heure', function (m) {
	if (!moment.isMoment(m)) m = moment(m)
	return m.format('HH:mm')
})

Template.registerHelper('duree', function (hours) {
	if (!_.isNumber(hours)) return ""
	const min = Math.round((hours % 1) * 60)
	return ('0' + Math.floor(hours)).slice(-2) + 'h' + ( '0' + min ).slice(-2)
})

Template.registerHelper('diffH', function (d, f) {
	return Utils.diffH(d, f)
})

Template.registerHelper('numFormat', function (value) {
	const pattern = "# ##0,00"
	return _.isNumber(value) ? format(pattern, value) : "" 
})

Template.registerHelper('disabledOnLoggingIn', function () {
	return Meteor.loggingIn() ? 'disabled' : ''
})

Template.registerHelper('pre', function (str) {
	return str ? str.replace(/\\n/g, '\r\n') : ''
})

Template.registerHelper('toHTML', function (str) {
	return str ? str.replace(/\\n/g, '<br>') : ''
})

Template.registerHelper('eventLabelClass', function (evt) {
	return Utils.eventLabelClass(evt)
})

Template.registerHelper('eventTagLabel', function (evt) {
	return Utils.titre(evt)
})
