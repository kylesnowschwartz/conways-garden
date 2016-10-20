// import {makeKeysDriver} from 'cycle-keys'
import combineLatestObj from 'rx-combine-latest-obj'
import {Observable} from 'rx'

export default function actions ({DOM, Keys, Animation}) {
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

  const timescale$ = DOM
    .select('.timescale')
    .events('change')
    .map(event => event.target.value)
    .startWith(150);

  const tick$ = timescale$.flatMapLatest(timescale => Observable.interval((MAX_TIMESCALE + MIN_TIMESCALE) - timescale))
    .shareReplay(1)

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
    .map(event => ({type: 'PREVIOUS_NURSERY_INSTRUMENT'}));

  const nextNurseryInstrumentAction$ = Keys
    .down('down')
    .map(event => ({type: 'NEXT_NURSERY_INSTRUMENT'}));

  const resetAction$ = DOM
    .select('.reset')
    .events('click')
    .map(event => ({type: 'RESET'}))

  return {
    plantAction$,
    updateAction$,
    incrementBeatAction$,
    pulseAction$,
    previousNurseryPlantAction$,
    nextNurseryPlantAction$,
    previousNurseryInstrumentAction$,
    nextNurseryInstrumentAction$,
    resetAction$
  }
}