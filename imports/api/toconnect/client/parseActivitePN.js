import moment from 'moment';

// 0:"19/03/2016" Date
// 1:"3144" NumVol
// 2:"FGZHE" Immat
// 3:"ORY" Origine
// 4:"MAD" Destination
// 5:"19/03/2016 05:22:00" Block départ
// 6:"19/03/2016 07:16:00" Block arrivée
// 7:"01:54" HDV block
// 8:"01:54" HDV de nuit
// 9:"06:29" Temps de service

export default function (table) {
	return _.chain(table)
		.map(function (line, index) {
			if (!line || line.length < 10) return null;
			const start = moment.utc(line[5], 'DD/MM/YYYY HH:mm:ss').local(),
				end = moment.utc(line[6], 'DD/MM/YYYY HH:mm:ss').local();
			
			return {
				num: 'TO' + line[1],
				immat: line[2],
				from: line[3],
				to: line[4],
				start,
				end,
				blk: line[7],
				tvnuit: line[8],
				ts: line[9]
			};
		})
		.reject(function (vol) {
			return !vol || !vol.immat;
		})
		.value();
};