import {div, button, input} from '@cycle/dom';
import {PLANT_MATURITY_AGE, MIN_TIMESCALE, MAX_TIMESCALE} from './constants';
import {tileAtPosition}  from './helpers';

function view ({board, gardener, nursery, selectedInstrumentIndex, selectedPlantIndex, beat, keySelection, selectedKeyIndex}) {
  const tileAtGardenerPosition = tileAtPosition(board, gardener.position);

  return (
    div('.game', [
      div('.board', board.map(row => renderRow(row, tileAtGardenerPosition, beat))),

      renderNursery(nursery, selectedInstrumentIndex, selectedPlantIndex),
      
      renderKeySelection(keySelection, selectedKeyIndex),

      div('.timescale-container', [
        'Timescale: ',
        input('.timescale', {attributes: {type: 'range', min: MIN_TIMESCALE, max: MAX_TIMESCALE}})
      ]),

      button('.reset', 'Reset')
    ])
  );
}

function renderRow (row, tileAtGardenerPosition, beat) {
  return (
    div('.row', row.map(tile => renderTile(tile, tile === tileAtGardenerPosition, beat)))
  );
}

function renderTile (tile, tileAtGardenerPosition, beat) {
  let classes = `.tile ${tile.plant ? '.plant' : ''} ${tileAtGardenerPosition ? '.outline' : ''}`;

  const style = {
    background: tile.color
  };

  const mature = tile.age > PLANT_MATURITY_AGE;

  if (tile.plant && !mature) {
    const borderThickness = 14 - (14 * tile.age / PLANT_MATURITY_AGE);

    style.border = `${borderThickness}px solid black`;
  }

  if (tile.plant && mature) {
    // TODO - make this better
    if (beat % (1 / tile.duration * 8) === 0) {
      classes += '.active';
    }
  }

  return (
    div(classes, {key: tile.id, style})
  );
}

function renderNurseryRow (nurseryRow, selectedInstrument, selectedPlantIndex) {
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
  );
}

function renderKeySelectionRow (keySelection, selectedKeyIndex) {
  return (
    div('.key-selection-row', [
      'Key',

      keySelection.options.map((key, index) =>
        div(
          `.nursery-slot ${index === selectedKeyIndex ? '.selected' : ''}`,
          {style: {background: key.color}},
          `${key.key}`
        )
      )
    ]
    )
  );
}

function renderNursery (nursery, selectedInstrumentIndex, selectedPlantIndex) {
  return (
    div('.nursery', nursery.map((row, index) => renderNurseryRow(row, selectedInstrumentIndex === index, selectedPlantIndex)))
  );
}

function renderKeySelection (keySelection, selectedKeyIndex) {
  return (
    div('.nursery', keySelection.map((row, index) => renderKeySelectionRow(row, selectedKeyIndex === index, selectedKeyIndex)))
  );
}

export default view;
