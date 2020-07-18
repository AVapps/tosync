import './Blob.js'
import { saveAs } from 'file-saver'
import Utils from '/imports/api/client/lib/Utils.js'
import _ from 'lodash'

export const HdvTable = {
	generate(events, filename = 'TOSync_HDV.csv', separator = ';') {
		const data = [[ 'Numéro', 'AP Départ', 'AP Arrivée', 'Bloc départ TU', 'Bloc arrivée TU', 'Heures de vol', 'MEP' ]]
    const format = new Intl.NumberFormat().format

    _.forEach(events, evt => {
      if (evt.tag === 'vol' || evt.tag === 'mep') {
        data.push([
          evt.num,
          evt.from,
          evt.to,
          evt.start.utc().format('DD/MM/YYYY HH:mm'),
          evt.end.utc().format('DD/MM/YYYY HH:mm'),
          evt.tv ? format(evt.tv) : '',
          evt.mep ? format(evt.mep) : ''
        ])
      }
    })

    const csvStr = data.map(l => l.join(separator)).join("\n")

    let shared = false
    try {
      const filesArray = [ new File([ csvStr ], filename, { type: "text/csv" }) ]
      if (navigator.canShare && navigator.canShare({ files: filesArray })) {
        // const blob = new Blob(, { type: "text/calendar" })
        navigator.share({
          files: filesArray,
          title: 'Planning',
          text: 'Planning'
        })
        .then(() => console.log('[Share was successful.]'))
        .catch((error) => console.log('[Sharing failed]', error))
        shared = true
      }
    } catch (error) {
      console.log(error)
    }

    if (!shared) {
      // console.log(`[Your system doesn't support sharing files.]`)
      const blob = new Blob([ csvStr ], { type: "text/csv" })
      saveAs(blob, filename)
    }
	}
}
