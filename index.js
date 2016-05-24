import Cycle from '@cycle/core'
import {makeDOMDriver, div, button} from '@cycle/dom'
import {Observable} from 'rx'
import _ from 'lodash'
import {makeKeysDriver} from 'cycle-keys'
import {makeAnimationDriver} from 'cycle-animation-driver'
import combineLatestObj from 'rx-combine-latest-obj'
import uuid from 'node-uuid'
import Tone from 'tone'

import lodashMath from 'lodash-math';

const FRAMERATE = 1000 / 60
const BOARDSIZE = 20
const PATCHSIZE = 30 //px
const BOARDSIZE_IN_PX = BOARDSIZE * PATCHSIZE
const PLANT_MATURITY_AGE = 3000 / FRAMERATE // msec
const octave = "G A G B G C# G D# G F G".split(" ") //"G A G C D G E G".split(" ");
const synth = new Tone.PolySynth(BOARDSIZE * 2, Tone.SimpleFM).toMaster()

synth.set('volume', -10)

const nursery = [
  {duration: 1, color: '#AD1457'},
  {duration: 2, color: '#D81B60'},
  {duration: 4, color: '#EC407A'},
  {duration: 8, color: '#F48FB1'}
]

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

function Gardener({position, velocity, id = uuid.v4()}) {
  return {
    velocity,
    acceleration: 0.4,
    friction: .94,
    position,
    id
  }
}

function renderGardener({id, position}) {
  const style = {left: position.x + 'px', top: position.y + 'px'}

  return (
    div('.gardener', {style, key: id})
  )
}

function Tile({row, column, plant = false, age = 0, duration = 1, id = uuid.v4(), color = 'black'}) {
  return {row, column, plant, duration, age, id, color}
}

function renderTile(tile, tileAtGardenerPosition) {
  const classes = `.tile ${tile.plant ? '.plant' : '' } ${tileAtGardenerPosition ? '.outline' : '' }`

  const style = {
    background: tile.color
  }

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

function renderNursery(nursery, selectedPlantIndex) {
  return (
    div('.nursery', nursery.map((plant, index) =>
      div(
        `.nursery-slot ${index === selectedPlantIndex ? '.selected' : ''}`,
        {style: {background: plant.color}},
        `1/${plant.duration}`
      )
    ))
  )
}

function view({board, gardener, nursery, selectedPlantIndex}) {
  const tileAtGardenerPosition = tileAtPosition(board, gardener.position)

  return (
    div('.game', [
      div('.board', board.map(row => renderRow(row, tileAtGardenerPosition))),
      renderGardener(gardener),

      renderNursery(nursery, selectedPlantIndex)
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

    position: calculatePosition(gardener, delta),

    velocity: calculateVelocity(gardener, delta, accelerationChange)
  }
}

function positionIsOnBoard ({row, column}) {
  if (row < 0 || column < 0) {
    return false;
  }

  if (row > BOARDSIZE - 1 || column > BOARDSIZE - 1) {
    return false;
  }

  return true;
}

function calculateVelocity(gardener, delta, accelerationChange) {
  const xVelocity = (gardener.velocity.x + accelerationChange.x * delta) * (gardener.friction / delta);
  const yVelocity = (gardener.velocity.y + accelerationChange.y * delta) * (gardener.friction / delta);

  return {
    x: xVelocity,
    y: yVelocity
  }
}

function calculatePosition(gardener, delta) {
  const xPosition = gardener.position.x + gardener.velocity.x * delta;
  const yPosition = gardener.position.y + gardener.velocity.y * delta;

  let row = xPosition / PATCHSIZE
  let column = yPosition / PATCHSIZE

  if (positionIsOnBoard({row, column})) {
    return {
        x: xPosition,
        y: yPosition
      }
  } else {
    let xWrapped = xPosition;
    let yWrapped = yPosition;

    console.log(gardener.position)

    if (xPosition > BOARDSIZE_IN_PX) {
      xWrapped = xPosition - BOARDSIZE_IN_PX
    }

    if (xPosition < 0) {
      xWrapped = xPosition + BOARDSIZE_IN_PX
    }

    if (yPosition > BOARDSIZE_IN_PX) {
      yWrapped = yPosition - BOARDSIZE_IN_PX
    }

    if (yPosition < 0) {
      yWrapped = yPosition + BOARDSIZE_IN_PX
    }

    return {
      x: xWrapped,
      y: yWrapped
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

// http://stackoverflow.com/a/20762713
function mode(arr){
  return arr.sort((a,b) =>
      arr.filter(v => v===a).length
    - arr.filter(v => v===b).length
  ).pop();
}

function applyConwayRules(board) {
  return board.map(row => 
    row.map(tile => {
      const neighbors = liveNeighbors(board, tile);
      const liveNeighborsCount = neighbors.length;

      if (!tile.plant) {
        if (liveNeighborsCount === 3) {
          const durationMode = mode(neighbors.map(neighbor => neighbor.duration));
          const color = mode(neighbors.map(neighbor => neighbor.color))

          return Tile({...tile, plant: true, age: PLANT_MATURITY_AGE, duration: durationMode, color})
        } else {
          return tile
        }
      }

      if (tile.age < PLANT_MATURITY_AGE) {
        return tile;
      }

      if (liveNeighborsCount < 2) {
        return Tile({...tile, plant: false, age: 0, color: 'black'})
      } else if (liveNeighborsCount <= 3) {
        return tile
      } else if (liveNeighborsCount > 3) {
        return Tile({...tile, plant: false, age: 0, color: 'black'})
      } 
    })
  )
}

function applyMusicRules(state, noteDuration) {
  const notes =  state.board.map(row => 
    row
      .filter(tile => tile.duration === noteDuration)
      .map(tile => applyNote(tile))
  )

  return _.compact(_.flatten(notes))
}

function applyNote(tile) {
  if (tile.plant && tile.age >= PLANT_MATURITY_AGE) {
    const register = Math.floor(tile.column / 8 + 2);
    
    return octave[tile.row % octave.length] + register.toString();
  }
}

function pulse(state) {
  return {
    ...state,
    board: applyConwayRules(state.board)

  }
}

function liveNeighbors(board, tile) {
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
}

function tileAtPosition(board, position) {
  let row = Math.round(position.y / PATCHSIZE)
  let column = Math.round(position.x / PATCHSIZE)

  // console.log(position)
  // console.log(row, column)
  if (positionIsOnBoard({row, column})) {
    return board[row][column];
  }

  return false
}

function plant(state) {
  const tile = tileAtPosition(state.board, state.gardener.position)

  if (tile) {
    tile.plant = true
    tile.age = 0
    tile.duration = selectedPlant(state).duration
    tile.color = selectedPlant(state).color
  }

  return state
}

function selectedPlant(state) {
  return state.nursery[state.selectedPlantIndex]
}

function previousNurseryPlant (state) {
  return {
    ...state,

    selectedPlantIndex: state.selectedPlantIndex === 0 ? 3 : state.selectedPlantIndex - 1
  }
}

function nextNurseryPlant (state) {
  return {
    ...state,

    selectedPlantIndex: (state.selectedPlantIndex + 1) % nursery.length
  }
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

  const tick$ = Observable.interval(400)
    .shareReplay()
  
  const pulse$ = tick$
    .filter((i) => i % 8 === 0)
    .map(event => pulse)

  const previousNurseryPlant$ = Keys
    .down('left')
    .map(event => previousNurseryPlant);

  const nextNurseryPlant$ = Keys
    .down('right')
    .map(event => nextNurseryPlant);

  const action$ = Observable.merge(
    update$,
    plant$,
    pulse$,
    previousNurseryPlant$,
    nextNurseryPlant$
  )

  const initialState = {
    board: Board({rows: BOARDSIZE, columns: BOARDSIZE}),
    gardener: Gardener({
      position: {x: 200, y: 150},
      velocity: {x:0, y: 0}
    }),
    nursery,
    selectedPlantIndex: 0
  }

  const state$ = action$
    .startWith(initialState)
    .scan((state, action) => action(state))
    .shareReplay()

  const wholeNotes$ = tick$
    .filter((i) => i % 8 === 0)
    .withLatestFrom(state$, (__, state) => applyMusicRules(state, 1) )

  const halfNotes$ = tick$
    .filter((i) => i % 4 === 0)
    .withLatestFrom(state$, (__, state) => applyMusicRules(state, 2) )

  const quarterNotes$ = tick$
    .filter((i) => i % 2 === 0)
    .withLatestFrom(state$, (__, state) => applyMusicRules(state, 4) )

  const eightNotes$ = tick$
    .withLatestFrom(state$, (__, state) => applyMusicRules(state, 8) )

  const notes$ = Observable.merge(
    wholeNotes$,
    halfNotes$,
    quarterNotes$,
    eightNotes$
  )

  return {
    DOM: state$.map(view),
    Music: notes$
  }
}

const drivers = {
  DOM: makeDOMDriver('.app'),
  Keys: makeKeysDriver(),
  Animation: makeAnimationDriver(),
  Music: notes$ => notes$.subscribe(notes => synth.triggerAttackRelease(notes, "4n"))
}

Cycle.run(main, drivers)

