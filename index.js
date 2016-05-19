import Cycle from '@cycle/core'
import {makeDOMDriver, div, button} from '@cycle/dom'
import {Observable} from 'rx'
import _ from 'lodash'
import {makeKeysDriver} from 'cycle-keys';
import {makeAnimationDriver} from 'cycle-animation-driver';

const FRAMERATE = 1000 / 60

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
    speed: 2,
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

function update(delta, dIsDown) {
  return function(state) {
    if (dIsDown) {
      state.gardener.position.x += state.gardener.speed * delta
    }

    return state
  }
}

function main({DOM, Keys, Animation}) {
  const initialState = {
    board: Board({rows: 20, columns: 20}),
    gardener: Gardener({position: {x: 200, y: 150}})
  }

  const dDown$ = Keys.down('D')
    .map(event => true)

  const dUp$ = Keys.up('D')
    .map(event => false)

  const d$ = Observable.merge(
    dDown$,
    dUp$
  )

  const update$ = Animation.pluck('delta')
    .withLatestFrom(d$, (delta, dIsDown) => update(delta/FRAMERATE, dIsDown))

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
  Keys: makeKeysDriver(),
  Animation: makeAnimationDriver()
}

Cycle.run(main, drivers)