import {PATCHSIZE, PLANT_MATURITY_AGE, BOARDSIZE_IN_PX} from './constants';
import {Tile, tileAtPosition, positionIsOnBoard} from './helpers';
import initialState from './initial-state';

const reducers = {
  UPDATE (state, action) {
    state.board = updateBoard(state.board, action.delta);
    state.gardener = updateGardener(state.gardener, action.delta, action.keys);

    return state;
  },

  PULSE (state, action) {
    return {
      ...state,
      board: applyConwayRules(state.board)

    };
  },

  PLANT (state, action) {
    const tile = tileAtPosition(state.board, state.gardener.position);
    const currentSelectedPlant =  selectedPlant(state, action);

    if (tile) {
      tile.plant = true;
      tile.age = 0;
      tile.duration = currentSelectedPlant.duration;
      tile.color = currentSelectedPlant.color;
      tile.instrument = currentSelectedPlant.instrument;
    }

    return state;
  },

  PREVIOUS_NURSERY_PLANT (state, action) {
    return {
      ...state,

      selectedPlantIndex: state.selectedPlantIndex === 0 ? 3 : state.selectedPlantIndex - 1
    };
  },

  NEXT_NURSERY_PLANT (state, action) {
    return {
      ...state,

      selectedPlantIndex: (state.selectedPlantIndex + 1) % state.nursery[state.selectedInstrumentIndex].options.length
    };
  },

  PREVIOUS_NURSERY_INSTRUMENT (state, action) {
    const instrumentsCount = state.nursery.length;

    return {
      ...state,

      selectedInstrumentIndex: state.selectedInstrumentIndex === 0 ? instrumentsCount - 1 : state.selectedInstrumentIndex - 1
    };
  },

  NEXT_NURSERY_INSTRUMENT (state, action) {
    return {
      ...state,

      selectedInstrumentIndex: (state.selectedInstrumentIndex + 1) % state.nursery.length
    };
  },

  INCREMENT_BEAT (state, action) {
    state.beat += 1;

    return state;
  },

  RESET (state, action) {
    return initialState();
  }
};

function updateBoard (board, delta) {
  return board.map(row =>
    row.map(tile => {
      if (tile.plant) {
        tile.age += delta;
      }

      return tile;
    })
  );
}

function updateGardener (gardener, delta, keysDown) {
  const acceleration = gardener.acceleration * delta;
  const accelerationChange = {
    x: 0,
    y: 0
  };

  if (keysDown.W) {
    accelerationChange.y -= acceleration;
  }

  if (keysDown.S) {
    accelerationChange.y += acceleration;
  }

  if (keysDown.A) {
    accelerationChange.x -= acceleration;
  }

  if (keysDown.D) {
    accelerationChange.x += acceleration;
  }

  return {
    ...gardener,

    position: calculatePosition(gardener, delta),

    velocity: calculateVelocity(gardener, delta, accelerationChange)
  };
}

function calculatePosition (gardener, delta) {
  const xPosition = gardener.position.x + gardener.velocity.x * delta;
  const yPosition = gardener.position.y + gardener.velocity.y * delta;
  let row = xPosition / PATCHSIZE;
  let column = yPosition / PATCHSIZE;

  if (positionIsOnBoard({row, column})) {
    return {
      x: xPosition,
      y: yPosition
    };
  } else {
    let xWrapped = xPosition;
    let yWrapped = yPosition;

    if (xPosition > BOARDSIZE_IN_PX) {
      xWrapped = xPosition - BOARDSIZE_IN_PX;
    }

    if (xPosition < 0) {
      xWrapped = xPosition + BOARDSIZE_IN_PX;
    }

    if (yPosition > BOARDSIZE_IN_PX) {
      yWrapped = yPosition - BOARDSIZE_IN_PX;
    }

    if (yPosition < 0) {
      yWrapped = yPosition + BOARDSIZE_IN_PX;
    }

    return {
      x: xWrapped,
      y: yWrapped
    };
  }
}

function calculateVelocity (gardener, delta, accelerationChange) {
  const xVelocity = (gardener.velocity.x + accelerationChange.x * delta) * (gardener.friction / delta);
  const yVelocity = (gardener.velocity.y + accelerationChange.y * delta) * (gardener.friction / delta);

  return {
    x: xVelocity,
    y: yVelocity
  };
}

function applyConwayRules (board) {
  return board.map(row =>
    row.map(tile => {
      const neighbors = liveNeighbors(board, tile);
      const liveNeighborsCount = neighbors.length;

      if (!tile.plant) {
        if (liveNeighborsCount === 3) {
          const durationMode = mode(neighbors.map(neighbor => neighbor.duration));
          const color = mode(neighbors.map(neighbor => neighbor.color));
          const instrument = mode(neighbors.map(neighbor => neighbor.instrument));

          return Tile({...tile, plant: true, age: PLANT_MATURITY_AGE, duration: durationMode, color, instrument});
        } else {
          return tile;
        }
      }

      if (tile.age < PLANT_MATURITY_AGE) {
        return tile;
      }

      if (liveNeighborsCount < 2) {
        return Tile({...tile, plant: false, age: 0, color: 'black'});
      } else if (liveNeighborsCount <= 3) {
        return tile;
      } else if (liveNeighborsCount > 3) {
        return Tile({...tile, plant: false, age: 0, color: 'black'});
      }
    })
  );
}

function liveNeighbors (board, tile) {
  const potentialNeighbors = [
    {column: -1, row: -1}, // NW
    {column: 0, row: -1},  // N
    {column: 1, row: -1},  // NE
    {column: 1, row: 0},   // E
    {column: 1, row: 1},   // SE
    {column: 0, row: 1},   // S
    {column: -1, row: 1},  // SW
    {column: -1, row: 0}   // W
  ];

  const actualNeighborPositions = potentialNeighbors
    .map(({row, column}) => ({row: tile.row + row, column: tile.column + column}))
    .filter(positionIsOnBoard);

  return actualNeighborPositions
    .map(neighbor => board[neighbor.row][neighbor.column])
    .filter(neighbor => neighbor.plant);
}

function selectedPlant (state) {
  const selectedInstrument = state.nursery[state.selectedInstrumentIndex];
  const plant = selectedInstrument.options[state.selectedPlantIndex];

  return {
    ...plant,
    instrument: selectedInstrument.instrument
  };
}

// http://stackoverflow.com/a/20762713
function mode (arr) {
  return arr.sort((a, b) =>
      arr.filter(v => v === a).length
    - arr.filter(v => v === b).length
  ).pop();
}

export default reducers;
