const { Component, h } = require('uzu')

// TODO
// - global constants
// - readable field names
// - cache evaluated props
// - grid of rectangles, evenly spaced x and y
// - try to remove ctx.save and restore
// - checkboxes for fill, stroke, etc
// - general shapes
// - canvas fill
// - when creating an elem, repeat props from last elem
// - ++ keyframes

// Components
const { Rectangle } = require('./components/Rectangle')

// Utils/views
const newElemButton = require('./utils/newElemButton')
const fieldset = require('./components/fieldset')

function App () {
  const canvasState = CanvasState()
  const canvas = Canvas(canvasState)
  return Component({
    canvasState,
    canvas,
    view () {
      return h('div', [
        this.canvasState.view(),
        this.canvas.view()
      ])
    }
  })
}

const start = window.performance.now()

function CanvasState () {
  return Component({
    // Builtin math functions
    funcs: {
      neg: ([x]) => [-x],
      mod: ([x, y]) => [x % y],
      mul: ([x, y]) => [x * y],
      add: ([x, y]) => [x + y],
      sum: (xs) => [xs.reduce((s, n) => s + n, 0)],
      sub: ([x, y]) => [x - y],
      div: ([x, y]) => [x / y],
      all: (xs) => [xs.reduce((acc, x) => acc && x, true)],
      any: (xs) => [xs.reduce((acc, x) => acc || x, false)]
    },
    // Dynamic variables for use in properties
    vars: {
      canvasWidth: () => 1000,
      canvasHeight: () => 1000,
      ts: () => window.performance.now() - start,
      pi: () => Math.PI,
      mouseX: () => document._mouseX,
      mouseY: () => document._mouseY,
      scrollTop: () => document.scrollTop,
      windowHeight: () => window.innerHeight,
      windowWidth: () => window.innerWidth
    },
    elems: { },
    elemOrder: [],
    view () {
      const elems = this.elemOrder.map(elem => {
        return h('div', { key: elem.name }, [
          h('p', { on: { click: () => { elem.toggleFormOpen() } } }, elem.name),
          elem.view(),
          h('button', {
            on: {
              click: () => {
                delete this.elems[elem.name]
                this.elemOrder = this.elemOrder.filter(e => e.name !== elem.name)
                this._render()
              }
            }
          }, ['Remove ', elem.name])
        ])
      })
      return h('div', {
        css: {
          root: [
            'width: 300px',
            'float: left',
            'background: #f8f8f8'
          ]
        }
      }, [
        fieldset([
          h('label', 'canvas-width'),
          h('input', {
            props: { type: 'number', value: this.vars.canvasWidth() },
            on: {
              input: ev => {
                const val = ev.currentTarget.value
                this.vars.canvasWidth = () => val
                document._canvas.width = val
              }
            }
          })
        ]),
        fieldset([
          h('label', 'canvas-height'),
          h('input', {
            props: { type: 'number', value: this.vars.canvasHeight() },
            on: {
              input: ev => {
                const val = ev.currentTarget.value
                this.vars.canvasHeight = () => val
                document._canvas.height = val
              }
            }
          })
        ]),
        // newElemButton(this, Value, 'value'),
        newElemButton(this, Rectangle, 'rectangle'),
        h('div', elems)
      ])
    }
  })
}

/*
let id = 0
// TODO
function Value (canvasState) {
  return Component({
    name: 'val-' + id++,
    value: () => 0,
    formOpen: true,
    toggleFormOpen () {
      this.formOpen = !this.formOpen
      this._render()
    },
    view () {
      if (!this.formOpen) return h('div', '')
      return h('div', [
        field(this, 'value', canvasState)
      ])
    }
  })
}
*/

function Canvas (canvasState) {
  return Component({
    view () {
      return h('canvas', {
        css: {
          root: [
            'position: fixed',
            'top: 0',
            'left: 320px'
          ]
        },
        props: {
          id: 'tutorial'
        },
        hook: {
          insert: (vnode) => {
            const elm = vnode.elm
            elm.width = canvasState.vars.canvasWidth()
            elm.height = canvasState.vars.canvasHeight()
            document._canvas = elm
            const ctx = elm.getContext('2d')
            ctx.globalCompositeOperation = 'destination-over'
            window.ctx = ctx
            ctx.save()
            function draw (ts) {
              document._ts = ts
              ctx.clearRect(0, 0, canvasState.vars.canvasWidth(), canvasState.vars.canvasHeight())
              for (let name in canvasState.elems) {
                let shape = canvasState.elems[name]
                if (shape.draw) shape.draw(ctx)
              }
              window.requestAnimationFrame(draw)
            }
            draw()
          }
        }
      })
    }
  })
}

// Get the mouse x/y coords globally
document.body.addEventListener('mousemove', ev => {
  document._mouseX = ev.clientX
  document._mouseY = ev.clientY
})

document.body.appendChild(App().view().elm)
