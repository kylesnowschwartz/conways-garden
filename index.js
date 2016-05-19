import Cycle from '@cycle/core'
import {makeDOMDriver, div, button} from '@cycle/dom'
import {Observable} from 'rx'
import _ from 'lodash'

function makeBoard({rows, columns}) {
  return (
    _.range(0, rows).map((row, rowIndex) =>
      _.range(0, columns).map((column, columnIndex) => Tile({
        row: rowIndex,
        column: columnIndex
      }))
    )
  )
}

function Tile({row, column}) {
  return {row, column, plant: null}
}

function renderTile(tile) {
  return (
    div(`.tile ${tile.plant ? '.plant' : '' }`)
  )
}

function renderRow(row) {
  return (
    div('.row', row.map(renderTile))
  )
}

function view({board}) {
  return (
    div('.board', board.map(renderRow))
  )
}

function main({DOM}) {
  const initialState = {
    board: makeBoard({rows: 20, columns: 20})
  }

  initialState.board[0][4].plant = true

  const state$ = Observable.just(initialState)

  return {
    DOM: state$.map(view)
  }
}

const drivers = {
  DOM: makeDOMDriver('.app')
}

Cycle.run(main, drivers)