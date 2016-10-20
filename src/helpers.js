import uuid from 'node-uuid'
import constants from './constants'

const {PATCHSIZE, BOARDSIZE} = constants;


function Tile({row, column, plant = false, age = 0, duration = 1, id = uuid.v4(), color = 'black', instrument = 'synth'}) {
  return {row, column, plant, duration, age, id, color, instrument}
}

function tileAtPosition (board, position) {
  let row = Math.round(position.y / PATCHSIZE)
  let column = Math.round(position.x / PATCHSIZE)

 if (positionIsOnBoard({row, column})) {
   return board[row][column];
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

export {Tile, tileAtPosition, positionIsOnBoard}