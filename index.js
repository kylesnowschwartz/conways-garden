import Cycle from '@cycle/core'
import {makeDOMDriver, div} from '@cycle/dom'
import {Observable} from 'rx'

function main(sources) {
  return {
    DOM: Observable.just(
      div([
        div('.hello', {style: {color: 'red'}}, 'Hello Nurse'),
        div('The world is your oysters')
      ])
    )
  }
}

const drivers = {
  DOM: makeDOMDriver('.app')
}

Cycle.run(main, drivers)