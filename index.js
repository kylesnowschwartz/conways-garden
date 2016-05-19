import Cycle from '@cycle/core'
import {makeDOMDriver, div, button} from '@cycle/dom'
import {Observable} from 'rx'
import _ from 'lodash'
import {makeKeysDriver} from 'cycle-keys';

function Board({rows, columns}) {
  return (
    _.range(0, rows).map((row, rowIndex) =>
      _.range(0, columns).map((column, columnIndex) => Tile({
        row: rowIndex,
        column: columnIndex
      }))
    )
  )
}

function Gardener({position}) {
  return {
    position
  }
}

function renderGardener({position}) {
  const style = {left: position.x + 'px', top: position.y + 'px'}

  return (
    div('.gardener', {style})
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

function view({board, gardener}) {
  return (
    div('.game', [
      div('.board', board.map(renderRow)),
      renderGardener(gardener)
    ])
  )
}

function update(state) {
  state.gardener.position.x += 10

  return state
}

//capture a keys stream
  //log some output when you press a key
  //


function main({DOM, Keys}) {
  const initialState = {
    board: Board({rows: 20, columns: 20}),
    gardener: Gardener({position: {x: 200, y: 150}})
  }

  const d$ = Keys.press('d')

  const moveGardener$

  const update$ = Observable
    .interval(100)
    .map(() => update)

  initialState.board[0][4].plant = true

  const state$ = update$
    .startWith(initialState)
    .scan((state, action) => action(state))

  return {
    DOM: state$.map(view)
  }
}

const drivers = {
  DOM: makeDOMDriver('.app'),
  Keys: makeKeysDriver()
}

Cycle.run(main, drivers)