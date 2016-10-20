import Cycle from '@cycle/core'
import {makeDOMDriver, div, button, input} from '@cycle/dom'
import {Observable} from 'rx'
import _ from 'lodash'
import {makeKeysDriver} from 'cycle-keys'
import {makeAnimationDriver} from 'cycle-animation-driver'
import combineLatestObj from 'rx-combine-latest-obj'
import uuid from 'node-uuid'
import Tone from 'tone'
import reducers from './src/reducers'

const FRAMERATE = 1000 / 60
const BOARDSIZE = 20
const PATCHSIZE = 30 //px
const BOARDSIZE_IN_PX = BOARDSIZE * PATCHSIZE
const PLANT_MATURITY_AGE = 3000 / FRAMERATE // msec

const MAX_TIMESCALE = 250
const MIN_TIMESCALE = 50

const octave = "G A C D E G".split(" ");
const synth = new Tone.PolySynth(BOARDSIZE, Tone.SimpleFM).toMaster()
synth.set('volume', -10)

const drum = new Tone.PolySynth(BOARDSIZE, Tone.DrumSynth).toMaster()
drum.set('volume', -10)

const instruments = {
  synth,
  drum
};

const nursery = [
  {
    plantName: 'Synths',
    instrument: 'synth',
    options: [
      {duration: 1, color: '#AD1457'},
      {duration: 2, color: '#D81B60'},
      {duration: 4, color: '#EC407A'},
      {duration: 8, color: '#F48FB1'}
    ]
  },

  {
    plantName: 'Drums',
    instrument: 'drum',
    options: [
      {duration: 1, color: 'forestgreen'},
      {duration: 2, color: 'lime'},
      {duration: 4, color: 'lightgreen'},
      {duration: 8, color: '#B8F5C0'}
    ]
  }
];

const initialState = () => ({
  beat: 0,
  board: Board({rows: BOARDSIZE, columns: BOARDSIZE}),
  gardener: Gardener({
    position: {x: 200, y: 150},
    velocity: {x: 0, y: 0}
  }),
  nursery,
  selectedInstrumentIndex: 0,
  selectedPlantIndex: 0
})

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
    friction: 0.94,
    position,
    id
  }
}

function renderGardener({id, position}) {
  const style = {transform: `translate(${position.x}px, ${position.y}px)`}

  return (
    div('.gardener', {style, key: id})
  )
}

// TODO dedup
function Tile({row, column, plant = false, age = 0, duration = 1, id = uuid.v4(), color = 'black', instrument = 'synth'}) {
  return {row, column, plant, duration, age, id, color, instrument}
}

function renderTile(tile, tileAtGardenerPosition, beat) {
  let classes = `.tile ${tile.plant ? '.plant' : '' } ${tileAtGardenerPosition ? '.outline' : '' }`

  const style = {
    background: tile.color
  }

  const mature = tile.age > PLANT_MATURITY_AGE;

  if (tile.plant && !mature) {
    const borderThickness = 14 - (14 * tile.age / PLANT_MATURITY_AGE);

    style.border = `${borderThickness}px solid black`

  }

  if (tile.plant && mature) {
    // TODO - make this better
    if (beat % (1 / tile.duration * 8) === 0) {
      classes += '.active';
    }
  }

  return (
    div(classes, {key: tile.id, style})
  )
}

function renderRow(row, tileAtGardenerPosition, beat) {
  return (
    div('.row', row.map(tile => renderTile(tile, tile === tileAtGardenerPosition, beat)))
  )
}

function renderNurseryRow(nurseryRow, selectedInstrument, selectedPlantIndex) {
  return (
    div('.nursery-row', [
      nurseryRow.plantName,

      nurseryRow.options.map((plant, index) =>
        div(
            `.nursery-slot ${index === selectedPlantIndex && selectedInstrument ? '.selected' : ''}`,
            {style: {background: plant.color}},
            `1/${plant.duration}`
           )
        )
      ]
    )
  )
}

function renderNursery(nursery, selectedInstrumentIndex, selectedPlantIndex) {
  return (
    div('.nursery', nursery.map((row, index) => renderNurseryRow(row, selectedInstrumentIndex === index, selectedPlantIndex)))
  )
}

function view({board, gardener, nursery, selectedInstrumentIndex, selectedPlantIndex, beat}) {
  const tileAtGardenerPosition = tileAtPosition(board, gardener.position)

  return (
    div('.game', [
      div('.board', board.map(row => renderRow(row, tileAtGardenerPosition, beat))),

      renderNursery(nursery, selectedInstrumentIndex, selectedPlantIndex),

      div('.timescale-container', [
        'Timescale: ',
        input('.timescale', {attributes: {type: 'range', min: MIN_TIMESCALE, max: MAX_TIMESCALE}}),
      ]),

      button('.reset', 'Reset')
    ])
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

    const note = octave[tile.row % octave.length] + register.toString();
    const instrument = tile.instrument;

    return {note, instrument}
  }
}

// TODO dedup
function tileAtPosition (board, position) {
  let row = Math.round(position.y / PATCHSIZE)
  let column = Math.round(position.x / PATCHSIZE)

 if (positionIsOnBoard({row, column})) {
   return board[row][column];
 }
}

// TODO dedup - helpers file?
function positionIsOnBoard ({row, column}) {
  if (row < 0 || column < 0) {
    return false;
  }

  if (row > BOARDSIZE - 1 || column > BOARDSIZE - 1) {
    return false;
  }

  return true;
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

  // NON ACTIONS

  const timescale$ = DOM
    .select('.timescale')
    .events('change')
    .map(event => event.target.value)
    .startWith(150);

  const tick$ = timescale$.flatMapLatest(timescale => Observable.interval((MAX_TIMESCALE + MIN_TIMESCALE) - timescale))
    .shareReplay(1)

  // ACTIONS

  const plantAction$ = Keys.down('space')
    .do(event => event.preventDefault())
    .map(event => ({type: 'PLANT'}))

  const updateAction$ = Animation.pluck('delta')
    .withLatestFrom(keys$, (delta, keys) => ({type: 'UPDATE', delta: delta/FRAMERATE, keys}))

  const incrementBeatAction$ = tick$.map(event => ({type: 'INCREMENT_BEAT'}));

  const pulseAction$ = tick$
    .filter((i) => i % 8 === 0)
    .map(event => ({type: 'PULSE'}))

  const previousNurseryPlantAction$ = Keys
    .down('left')
    .map(event => ({type: 'PREVIOUS_NURSERY_PLANT'}));

  const nextNurseryPlantAction$ = Keys
    .down('right')
    .map(event => ({type: 'NEXT_NURSERY_PLANT'}));

  const previousNurseryInstrumentAction$ = Keys
    .down('up')
    .map(event => ({type: 'PREVIOUS_NURSERY'}));

  const nextNurseryInstrumentAction$ = Keys
    .down('down')
    .map(event => ({type: 'NEXT_NURSERY'}));

  const resetAction$ = DOM
    .select('.reset')
    .events('click')
    .map(event => ({type: 'RESET'}))

  const action$ = Observable.merge(
    updateAction$,
    plantAction$,
    pulseAction$,
    previousNurseryPlantAction$,
    nextNurseryPlantAction$,
    previousNurseryInstrumentAction$,
    nextNurseryInstrumentAction$,
    incrementBeatAction$,
    resetAction$
  )

  const state$ = action$
    .startWith(initialState())
    .scan((state, action) => {
      const reducer = reducers[action.type]

      if (!reducer) {
        throw new Error(`No such reducer for action: ${JSON.stringify(action.type)}`)
      };

      return reducer(state, action)
    })
    .shareReplay()

  const beat$ = state$.pluck('beat').distinctUntilChanged().shareReplay();

  const wholeNotes$ = beat$
    .filter((i) => i % 8 === 0)
    .withLatestFrom(state$, (__, state) => applyMusicRules(state, 1) )

  const halfNotes$ = beat$
    .filter((i) => i % 4 === 0)
    .withLatestFrom(state$, (__, state) => applyMusicRules(state, 2) )

  const quarterNotes$ = beat$
    .filter((i) => i % 2 === 0)
    .withLatestFrom(state$, (__, state) => applyMusicRules(state, 4) )

  const eightNotes$ = beat$
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
  Music: notes$ => notes$.subscribe(notes => {
    const notesGroupedByInstrument = _.groupBy(notes, 'instrument');

    for (let instrument in notesGroupedByInstrument) {
      const notesToPlay = notesGroupedByInstrument[instrument]
        .map(({note}) => note);

      instruments[instrument].triggerAttackRelease(_.uniq(notesToPlay), '4n');
    }
  })
}

Cycle.run(main, drivers)

