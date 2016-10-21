import Cycle from '@cycle/core';
import {makeDOMDriver} from '@cycle/dom';
import {makeKeysDriver} from 'cycle-keys';
import {makeAnimationDriver} from 'cycle-animation-driver';
import {Observable} from 'rx';
import _ from 'lodash';
import Tone from 'tone';

import reducers from './src/reducers';
import view from './src/view';
import actions from './src/actions';
import initialState from './src/initial-state';

import {BOARDSIZE, PLANT_MATURITY_AGE} from './src/constants';

const octave = 'G B D F#'.split(' ')
// const octave = 'G A C D E G'.split(' ');
const synth = new Tone.PolySynth(BOARDSIZE, Tone.SimpleFM).toMaster();
synth.set('volume', -10);

const drum = new Tone.PolySynth(BOARDSIZE, Tone.DrumSynth).toMaster();
drum.set('volume', -10);

const instruments = {
  synth,
  drum
};

function applyMusicRules (state, noteDuration) {
  const notes =  state.board.map(row =>
    row
      .filter(tile => tile.duration === noteDuration)
      .map(tile => applyNote(tile))
  );

  return _.compact(_.flatten(notes));
}

function applyNote (tile) {
  if (tile.plant && tile.age >= PLANT_MATURITY_AGE) {
    const register = Math.floor(tile.column / 8 + 2);

    const note = octave[tile.row % octave.length] + register.toString();
    const instrument = tile.instrument;

    return {note, instrument};
  }
}

function main ({DOM, Keys, Animation}) {
  const action$ = actions({DOM, Keys, Animation});

  const state$ = action$
    .startWith(initialState())
    .scan((state, action) => {
      const reducer = reducers[action.type];

      if (!reducer) {
        throw new Error(`No such reducer for action: ${JSON.stringify(action.type)}`);
      }

      return reducer(state, action);
    })
    .shareReplay();

  const beat$ = state$.pluck('beat').distinctUntilChanged().shareReplay();

  const wholeNotes$ = beat$
    .filter((i) => i % 8 === 0)
    .withLatestFrom(state$, (__, state) => applyMusicRules(state, 1));

  const halfNotes$ = beat$
    .filter((i) => i % 4 === 0)
    .withLatestFrom(state$, (__, state) => applyMusicRules(state, 2));

  const quarterNotes$ = beat$
    .filter((i) => i % 2 === 0)
    .withLatestFrom(state$, (__, state) => applyMusicRules(state, 4));

  const eightNotes$ = beat$
    .withLatestFrom(state$, (__, state) => applyMusicRules(state, 8));

  const notes$ = Observable.merge(
    wholeNotes$,
    halfNotes$,
    quarterNotes$,
    eightNotes$
  );

  return {
    DOM: state$.map(view),
    Music: notes$
  };
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

      instruments[instrument].triggerAttackRelease(_.uniq(notesToPlay), '8n');
    }
  })
};

Cycle.run(main, drivers);
