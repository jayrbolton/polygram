const { Component, h } = require('uzu')

const button = require('./components/button')

// TODO
// - ability to save work
// - global constants
// - cache evaluated formulas as functions
// - try to remove ctx.save and restore
// - general shapes
// - canvas fill

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
          h('div.b.bb.b--black-20.mv1.code.pv1.flex.justify-between', [
            h('span.pointer.dib', {
              on: { click: () => elem.toggleFormOpen() }
            }, elem.name),
            h('div', [
              copyButton(this, elem),
              removeButton(this, elem)
            ])
          ]),
          elem.view()
        ])
      })
      return h('div.mw5.bg-light-gray.pa2', {
        css: {
          root: [
            'padding: 1rem',
            'width: 300px',
            'float: left',
            'background: #f8f8f8'
          ]
        }
      }, [
        fieldset([
          h('label.code', { css: { root: ['font-family: mono'] } }, 'canvas-width'),
          h('input.code.f6.pa1.w-100', {
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
          h('label.code', { css: { root: ['font-family: mono'] } }, 'canvas-height'),
          h('input.code.f6.pa1.w-100', {
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
        h('div', [
          // newElemButton(this, Value, 'value'),
          newElemButton(this, Rectangle, 'shape')
        ]),
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
      return h('canvas.fixed.top-0', {
        style: {
          left: '16rem'
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

// Takes the full app component, plus a single element (like a Rectangle)
function removeButton (app, elem) {
  return h('button.bg-white.ba.b--black-10.f6.ml1', {
    on: {
      click: () => {
        delete app.elems[elem.name]
        app.elemOrder = app.elemOrder.filter(e => e.name !== elem.name)
        app._render()
      }
    }
  }, ['Remove'])
}

// Takes the full app component, plus a single element (like a Rectangle)
function copyButton (canvasState, elem) {
  return button('Copy', () => {
    const newElem = Rectangle(canvasState)
    const props = Object.create(elem.props)
    const flags = Object.create(elem.flags)
    newElem.props = props
    newElem.flags = flags
    canvasState.elems[newElem.name] = newElem
    canvasState.elemOrder.push(newElem)
    canvasState._render()
  })
}

// Get the mouse x/y coords globally
document.body.addEventListener('mousemove', ev => {
  document._mouseX = ev.clientX
  document._mouseY = ev.clientY
})

document.body.appendChild(App().view().elm)
