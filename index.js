import Cycle from '@cycle/core'
import {makeDOMDriver, div, button} from '@cycle/dom'
import {Observable} from 'rx'

function main({DOM}) {
  const click$ = DOM
    .select('.add')
    .events('click')
    .map((event) => 1);

  const total$ = click$
    .startWith(0)
    .scan((total, change) => total + change)

  return {
    DOM: total$.map(total =>
      div([
        button('.add', {style: {color: 'red'}}, 'Add'),
        div(`count: ${total}`)
      ])
    )
  }
}

const drivers = {
  DOM: makeDOMDriver('.app')
}

Cycle.run(main, drivers)