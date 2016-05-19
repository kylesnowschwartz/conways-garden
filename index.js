import Cycle from '@cycle/core'
import {makeDOMDriver, div, button} from '@cycle/dom'
import {Observable} from 'rx'
import _ from 'lodash'
import {makeKeysDriver} from 'cycle-keys'
import {makeAnimationDriver} from 'cycle-animation-driver'
import combineLatestObj from 'rx-combine-latest-obj'

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
    velocity: {x:0, y:0},
    acceleration: 0.2,
    friction: .94,
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

function update(delta, keysDown) {
  return function(state) {
    const gardener = state.gardener
    const acceleration = state.gardener.acceleration * delta 

    if (keysDown.W) {
      gardener.velocity.y -= acceleration
    }

    if (keysDown.S) {
      gardener.velocity.y += acceleration
    }

    if (keysDown.A) {
      gardener.velocity.x -= acceleration
    }

    if (keysDown.D) {
      gardener.velocity.x += acceleration
    }

    gardener.position.x += gardener.velocity.x * delta
    gardener.position.y += gardener.velocity.y * delta

    gardener.velocity.x *= gardener.friction
    gardener.velocity.y *= gardener.friction

    return state
  }
}

function tileAtPosition(board, position) {
  let row = Math.round(position.y / 30)
  let column = Math.round(position.x / 30)

  return board[row][column]
}

function plant(state) {
  const tile = tileAtPosition(state.board, state.gardener.position)

  tile.plant = !tile.plant

  return state
}

function main({DOM, Keys, Animation}) {
  const initialState = {
    board: Board({rows: 20, columns: 20}),
    gardener: Gardener({position: {x: 200, y: 150}})
  }

  function isDown(key) {
    const down$ = Keys.down(key)
      .map(event => true)

    const up$ = Keys.up(key)
      .map(event => false)

    return Observable.merge(
      down$,
      up$
    ).startWith(false)
  }

  const keys$ = combineLatestObj({
    W$: isDown('W'),
    A$: isDown('A'),
    S$: isDown('S'),
    D$: isDown('D')
  })
    //if spacebar is pressed, change underlying div to have a plant
  const plant$ = Keys.down('space')
    .do(event => event.preventDefault())
    .map(event => plant)

  const update$ = Animation.pluck('delta')
    .withLatestFrom(keys$, (delta, keys) => update(delta/FRAMERATE, keys))

  initialState.board[0][4].plant = true

  const action$ = Observable.merge(
    update$,
    plant$
  )

  const state$ = action$
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