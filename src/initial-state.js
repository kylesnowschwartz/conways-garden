import {BOARDSIZE} from './constants';
import {Tile} from './helpers';
import uuid from 'node-uuid';
import _ from 'lodash';

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

const keySelection = [
  {
    options: [
      {key: 'G B D F#'.split(' '), color: '#AD1457'},
      {key: 'C A B F'.split(' '), color: '#D81B60'}
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
  selectedPlantIndex: 0,
  keySelection,
  selectedKeyIndex: 0
});

function Board ({rows, columns}) {
  return (
    _.range(0, rows).map((row, rowIndex) =>
      _.range(0, columns).map((column, columnIndex) => Tile({
        row: rowIndex,
        column: columnIndex
      }))
    )
  );
}

function Gardener ({position, velocity, id = uuid.v4()}) {
  return {
    velocity,
    acceleration: 0.4,
    friction: 0.94,
    position,
    id
  };
}

export default initialState;
