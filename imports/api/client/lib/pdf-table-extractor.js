import _ from 'lodash'
import PDFJS from '../vendor/pdf.js'

function isInside(item, row) {
  return item.x >= row.x && item.x <= row.x + row.w && item.y >= row.y && item.y <= row.y + row.h
}

async function loadPage(doc, pageNum) {
  const page = await doc.getPage(pageNum)
  const opList = await page.getOperatorList()

  const cells = []
  const cellsMap = new Map()

  while (opList.fnArray.length) {
    const fn = opList.fnArray.shift()
    let args = opList.argsArray.shift()

    if (PDFJS.OPS.constructPath == fn) {
      while (args[0].length) {
        const op = args[0].shift();
        if (op == PDFJS.OPS.rectangle) { // Lister les rectangles qui constituent les cellules
          // console.log('RECTANGLE', args[1].toString())
          const x = args[1].shift()
          const y = args[1].shift()
          const w = args[1].shift()
          const h = args[1].shift()
          const slug = [ x, y, w, h ].join(',')
          if (!cellsMap.has(slug)) {
            const rect = { x, y, w, h, items: [] }
            cellsMap.set(slug, rect)
            cells.push(rect)
          }
        }
      }
    }
  }

  // 1- Détermine la structure du tableau à partir des rectangles listés précédemment en les regroupant en lignes de tableau
  const table = _.chain(cells)
    .groupBy('y')
    .values()
    .map(row => {
      const sortedRow = _.sortBy(row, 'x')
      const first = _.first(sortedRow)
      const last = _.last(sortedRow)
      return {
        x: first.x,
        y: first.y,
        h: first.h,
        w: last.x - first.x + last.w,
        cells: sortedRow,
        size: row.length
      }
    })
    .sortBy('y')
    .reverse()
    .value()

  // 2- positionner le contenu texte dans les cellules du tableau
  const content = await page.getTextContent()
  const filledTable = []
  let item, currentRow
  const items = _.chain(content.items)
    .map(item => ({
      x: item.transform[4],
      y: item.transform[5],
      w: item.width,
      h: item.height,
      str: item.str
    }))
    .sortBy('y')
    .reverse()
    .value()
  
  // tri le contenu texte par ligne de tableau
  _.forEach(items, item => {
    if (currentRow) {
      if (isInside(item, currentRow)) {
        currentRow.content.push(item)
      } else {
        filledTable.push(currentRow)
        currentRow = null
      }
    }

    if (!currentRow) {
      const matchingRow = _.find(table, row => isInside(item, row))
      if (matchingRow) {
        currentRow = matchingRow
        currentRow.content = [ item ]
        _.remove(table, { y: matchingRow.y })
      } else {
        console.log('! No matching row found !', item, table)
      }
    }
  })

  if (currentRow) {
    filledTable.push(currentRow)
    currentRow = null
  }

  // puis par sous-ligne dans chaque ligne de tableau et par colonne
  _.forEach(filledTable, row => {
    _.forEach(row.content, item => {
      const cell = _.find(row.cells, c => isInside(item, c))
      if (cell) {
        cell.items.push(item)
      } else {
        console.log('! No matching cell found !', row, item)
      }
    })

    row.lines = _.chain(_.first(row.cells).items)
      .groupBy('y')
      .mapValues((items, y) => {
        const maxH = _.maxBy(items, 'h')
        return { y: maxH.y, h: maxH.h }
      })
      .values()
      .sortBy('y')
      .reverse()
      .map(({ y, h }, index, col) => {
        const top = y + h
        const bottom = (index === col.length - 1) ? row.y : (col[index + 1].y + col[index + 1].h)
        const items = _.map(row.cells, cell => _.chain(cell.items)
          .filter(item => item.y >= bottom && item.y <= top )
          .sortBy('y')
          .reverse()
          .value()
        )
        if (row.size === 11) {
          _.forEach(items, item => {
            if (item.length) {
              const first = _.first(item)
              if ((first.y + first.h) < (top - 8)) { // Ajouter une ligne vide
                item.unshift({
                  x: first.x,
                  y: top - 9,
                  w: first.w,
                  h: 8,
                  str: ''
                })
              }
            }
          })
        }
        return items
      })
      .value()
  })

  console.log(`Page number ${ pageNum } parsing done !`, filledTable)

  return _.filter(_.flatMap(filledTable, row => {
    return _.map(row.lines, line => {
      return _.map(line, column => _.map(column, 'str').join("\n"))
    })
  }), line => _.isArray(line) && !(line.length === 1 && _.isEmpty(line[0])))
}

export default async function (doc) {
  const numPages = doc.numPages
  const result = {}
  result.pageTables = []
  result.numPages = numPages

  for (let i = 1; i <= numPages; i++) {
    result.pageTables.push(await loadPage(doc, i))
  }

  return result
}
