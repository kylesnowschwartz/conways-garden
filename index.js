import Cycle from '@cycle/core'
import {makeDOMDriver, div, button} from '@cycle/dom'
import {Observable} from 'rx'

function main({DOM}) {
  const add$ = DOM
    .select('.add')
    .events('click')
    .map((event) => 1);

  const subtract$ = DOM
    .select('.subtract')
    .events('click')
    .map((event) => -1);

  const change$ = Observable.merge(
    add$,
    subtract$
  )

  const total$ = change$
    .startWith(0)
    .scan((total, change) => total + change)

  return {
    DOM: total$.map(total =>
      div([
        button('.add', {style: {color: 'green'}}, '+'),
        button('.subtract', {style: {color: 'red'}}, '-'),
        div(`count: ${total}`)
      ])
    )
  }
}

const drivers = {
  DOM: makeDOMDriver('.app')
}

Cycle.run(main, drivers)