import Cycle from '@cycle/core'
import {makeDOMDriver, div, button} from '@cycle/dom'
import {Observable} from 'rx'
import _ from 'lodash'
import {makeKeysDriver} from 'cycle-keys'
import {makeAnimationDriver} from 'cycle-animation-driver'
import combineLatestObj from 'rx-combine-latest-obj'
import uuid from 'node-uuid'

const FRAMERATE = 1000 / 60

const BOARDSIZE = 30

const PLANT_MATURITY_AGE = 3000 / FRAMERATE // msec

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

function Tile({row, column, plant = false, age = 0, id = uuid.v4()}) {
  return {row, column, plant, age, id}
}

function renderTile(tile, tileAtGardenerPosition) {
  const classes = `.tile ${tile.plant ? '.plant' : '' } ${tileAtGardenerPosition ? '.outline' : '' }`

  const style = {}

  if (tile.plant && tile.age < PLANT_MATURITY_AGE) {
    const borderThickness = 14 - (14 * tile.age / PLANT_MATURITY_AGE);

    style.border = `${borderThickness}px solid black`
  }

  return (
    div(classes, {key: tile.id, style})
  )
}

function renderRow(row, tileAtGardenerPosition) {
  return (
    div('.row', row.map(tile => renderTile(tile, tile === tileAtGardenerPosition)))
  )
}

function view({board, gardener}) {
  const tileAtGardenerPosition = tileAtPosition(board, gardener.position)

  return (
    div('.game', [
      div('.board', board.map(row => renderRow(row, tileAtGardenerPosition))),
      renderGardener(gardener)
    ])
  )
}

function updateGardener(gardener, delta, keysDown) {
  const acceleration = gardener.acceleration * delta
  const accelerationChange = {
    x: 0,
    y: 0
  };

  if (keysDown.W) {
    accelerationChange.y -= acceleration
  }

  if (keysDown.S) {
    accelerationChange.y += acceleration
  }

  if (keysDown.A) {
    accelerationChange.x -= acceleration
  }

  if (keysDown.D) {
    accelerationChange.x += acceleration
  }

  return {
    ...gardener,

    position: {
      x: gardener.position.x + gardener.velocity.x * delta,
      y: gardener.position.y + gardener.velocity.y * delta
    },

    velocity: {
      x: (gardener.velocity.x + accelerationChange.x * delta) * gardener.friction,
      y: (gardener.velocity.y + accelerationChange.y * delta) * gardener.friction
    }
  }
}

function updateBoard(board, delta) {
  return board.map(row => 
    row.map(tile => {
      if (tile.plant) {
        tile.age += delta
      }

      return tile;
    })
  )
}

function update(delta, keysDown) {
  return function(state) {
    return {
      ...state,

      board: updateBoard(state.board, delta),

      gardener: updateGardener(state.gardener, delta, keysDown)
    }
  }
}

function pulse(state) {
  const newBoard = state.board.map(row => 
    row.map(tile => {
      const liveNeighbors = numberOfLiveNeighbors(state.board, tile)


      if (!tile.plant) {
        if (liveNeighbors === 3) {
          console.log(liveNeighbors)
          return Tile({...tile, plant: true, age: PLANT_MATURITY_AGE})
        } else {
          return tile
        }
      }

      if (tile.age < PLANT_MATURITY_AGE) {
        return tile;
      }

      if (liveNeighbors < 2) {
        return Tile({...tile, plant: false, age: 0})
      } else if (liveNeighbors <= 3) {
        return tile
      } else if (liveNeighbors > 3) {
        return Tile({...tile, plant: false, age: 0})
      } 
    })
  )

  return {
    ...state,
    board: newBoard 
  }
}

function numberOfLiveNeighbors(board, tile) {
  function positionIsOnBoard ({row, column}) {
    const boardSize = board.length; // trololololo better hope the board is square

    if (row < 0 || column < 0) {
      return false;
    }

    if (row > boardSize - 1 || column > boardSize - 1) {
      return false;
    }

    return true;
  }


  const potentialNeighbors = [
    {column: -1, row: -1}, //NW
    {column: 0, row: -1},  //N
    {column: 1, row: -1},  //NE
    {column: 1, row: 0},   //E
    {column: 1, row: 1},   //SE
    {column: 0, row: 1},   //S
    {column: -1, row: 1},  //SW
    {column: -1, row: 0}   //W
  ]

  const actualNeighborPositions = potentialNeighbors
    .map(({row, column}) => ({row: tile.row + row, column: tile.column + column}))
    .filter(positionIsOnBoard);

  return actualNeighborPositions
    .map(neighbor => board[neighbor.row][neighbor.column])
    .filter(neighbor => neighbor.plant)
    .length
}

function tileAtPosition(board, position) {
  let row = Math.round(position.y / 30)
  let column = Math.round(position.x / 30)

  return board[row][column]
}

function plant(state) {
  const tile = tileAtPosition(state.board, state.gardener.position)

  tile.plant = !tile.plant
  tile.age = 0

  return state
}

function main({DOM, Keys, Animation}) {
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

  const plant$ = Keys.down('space')
    .do(event => event.preventDefault())
    .map(event => plant)

  const update$ = Animation.pluck('delta')
    .withLatestFrom(keys$, (delta, keys) => update(delta/FRAMERATE, keys))

  const pulse$ = Observable.interval(1500)
    .map(event => pulse)

  const action$ = Observable.merge(
    update$,
    plant$,
    pulse$
  )

  const initialState = {
    board: Board({rows: BOARDSIZE, columns: BOARDSIZE}),
    gardener: Gardener({position: {x: 200, y: 150}})
  }

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