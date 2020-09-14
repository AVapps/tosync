import PDFJS from '../vendor/pdf.js'
import _ from 'lodash'
import pdf_table_extractor from './pdf-table-extractor.js'
PDFJS.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

const HEADER = ["Type", "From", "To", "Activity", "Fct", "Routing / Description", "A/C", "Blk", "Training", "Crew Member", "Remark"].join(';')
const DATE_REG = /^[a-z]{3}\.\s(\d\d)\/(\d\d)\/(\d\d\d\d)/

export default {
  async extractData(dataBuffer) {
    const doc = await PDFJS.getDocument(dataBuffer).promise
    const result = await pdf_table_extractor(doc)
    doc.destroy()

    if (result.pageTables.length) {
      const pages = _.map(result.pageTables, table => {
        const meta = {}
        let line, found
        while (line = table.shift()) {
          if (line.join(';') == HEADER) {
            found = true
            break
          } else if (line.length === 1 && DATE_REG.test(line[0])) {
            found = true
            table.unshift(line)
            break
          } else {
            if (line.length === 1) {
              if (line[0].indexOf('Crew Roster by Period') !== -1) {
                const m = line[0].match(/\[(\d\d\/\d\d\/\d\d\d\d)\-(\d\d\/\d\d\/\d\d\d\d)\]/)
                if (m && m.length === 3) {
                  meta.debut = m[1]
                  meta.fin = m[2]
                }
              }
              if (line[0].indexOf('Printed on') !== -1) {
                const m = line[0].match(/Printed on (\d\d\/\d\d\/\d\d\d\d \d\d:\d\d)/)
                if (m && m.length === 2) {
                  meta.printedOn = m[1]
                }
              }
            } else if (line.length === 2 && /[A-Z]{3}/.test(line[0]) && line[1].indexOf('/ Box ') !== -1) {
              meta.trigramme = line[0].trim()
              const m = line[1].match(/([A-Z\- ]+)\s([A-z\- ]+)\s+([A-Z]{3}) \/ Box/)
              if (m && m.length === 4) {
                meta.nom = m[1]
                meta.prenom = m[2]
                meta.fonction = m[3]
              }
            }
          }
        }

        if (!found) {
          throw new Meteor.Error('table-unknown', "Format de tableau inconnu.")
        }

        return { table, meta }
      })

      const firstPage = _.first(pages)
      const checkFormat = _.every(pages, page => {
        return _.isString(page.meta.trigramme)
          && page.meta.trigramme === firstPage.meta.trigramme
          && _.isString(page.meta.debut)
          && _.isString(page.meta.fin)
      })

      if (!checkFormat) {
        throw new Meteor.Error('format-error', "Format de fichier incorrect !")
      }

      _.forEach(pages, (page, i)  => {
        if (i < pages.length - 1) {
          const last = _.last(page.table)
          const nextFirst = _.first(pages[i+1].table)
          if (last.length === 1 && nextFirst.length === 1 && last[0].trim() == nextFirst[0].trim()) {
            page.table.pop()
          }
        } else {
          const lastRowIndex = _.findLastIndex(page.table, row => row.length === 1 && row[0].indexOf('Blk Hrs of printed period') !== -1)
          if (lastRowIndex !== -1) {
            page.table.splice(lastRowIndex)
          } else {
            // throw new Meteor.Error('format-error', "Format de fichier incorrect !")
          }
        }
      })

      return {
        meta: firstPage.meta,
        table: _.concat(...(_.map(pages, 'table')))
      }
    } else {
      throw new Meteor.Error('no-table', "Planning introuvable.")
    }
  }
}
