const { Component, h } = require('uzu')
const lzma = require('./lzma').LZMA()

const { Modal } = require('./components/Modal')
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

function CanvasState () {
  return Component({
    // Dynamic variables for use in properties
    canvasWidth: 1000,
    canvasHeight: 1000,
    elems: {},
    elemOrder: [],
    savedModal: Modal(),
    openModal: Modal(),
    compressedState: {
      loading: false
    },
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
      return h('div.bg-light-gray.pa2', {
        style: {
          width: '20rem'
        }
      }, [
        this.openModal.view({
          title: 'Open',
          content: h('div', [
            h('form', {
              on: {
                submit: ev => {
                  ev.preventDefault()
                  const link = ev.currentTarget.querySelector('textarea').value
                  const compressed = link.match(/#(.+)$/)[1]
                  restoreCompressed(compressed, this)
                }
              }
            }, [
              h('p', 'Paste a polygram link:'),
              h('textarea.w-100', {
                props: { rows: 4 }
              }),
              button('Load')
            ])
          ])
        }),
        this.savedModal.view({
          title: 'Save Polygram',
          content: this.compressedState.loading
            ? h('div', [h('p', 'Loading...')])
            : h('div', [
                h('p', 'Link for this polygram:'),
                h('textarea.w-100', {
                  props: {
                    value: this.compressedState.content,
                    rows: 4
                  }
                })
              ])
        }),
        h('div.flex.justify-end', [
          saveButton(this),
          openButton(this)
        ]),
        fieldset([
          h('label.code', { css: { root: ['font-family: mono'] } }, 'canvas-width'),
          h('input.code.f6.pa1.w-100', {
            props: { type: 'number', value: this.canvasWidth },
            on: {
              input: ev => {
                const val = ev.currentTarget.value
                this.canvasWidth = val
                document._canvas.width = val
              }
            }
          })
        ]),
        fieldset([
          h('label.code', { css: { root: ['font-family: mono'] } }, 'canvas-height'),
          h('input.code.f6.pa1.w-100', {
            props: { type: 'number', value: this.canvasHeight },
            on: {
              input: ev => {
                const val = ev.currentTarget.value
                this.canvasHeight = val
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
          left: '20rem'
        },
        props: {
          id: 'tutorial'
        },
        hook: {
          insert: (vnode) => {
            const elm = vnode.elm
            elm.width = canvasState.canvasWidth
            elm.height = canvasState.canvasHeight
            document._canvas = elm
            const ctx = elm.getContext('2d')
            ctx.globalCompositeOperation = 'destination-over'
            window.ctx = ctx
            ctx.save()
            function draw (ts) {
              document._ts = ts
              ctx.clearRect(0, 0, canvasState.canvasWidth, canvasState.canvasHeight)
              ctx.fillStyle = 'black'
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
function removeButton (canvasState, elem) {
  return button('Remove', () => {
    delete canvasState.elems[elem.name]
    canvasState.elemOrder = canvasState.elemOrder.filter(e => e.name !== elem.name)
    canvasState._render()
  })
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

// Create a new shape
function newElemButton (canvasState, constructor, name) {
  return button('Add ' + name, () => {
    const cmp = constructor(canvasState)
    canvasState.elems[cmp.name] = cmp
    canvasState.elemOrder.push(cmp)
    canvasState._render()
  })
}

// Save the state of the drawing
function saveButton (canvasState) {
  return button('Save', () => {
    canvasState.jsonState = persist(canvasState)
    canvasState.savedModal.open()
    canvasState._render()
    persistCompressed(canvasState.jsonState, canvasState)
  })
}

// Open a new drawing
function openButton (canvasState) {
  return button('Open', () => {
    canvasState.openModal.open()
  })
}

function persist (canvasState) {
  canvasState.compressedState.loading = true
  const getElem = elem => {
    return {
      flags: elem.flags,
      props: elem.props,
      name: elem.name
    }
  }
  const elemOrder = canvasState.elemOrder.map(getElem)
  const json = JSON.stringify({
    canvasWidth: canvasState.canvasWidth,
    canvasHeight: canvasState.canvasHeight,
    elemOrder
  })
  localStorage.setItem('canvas-state', json)
  console.log('compressing..')
  return json
}

function persistCompressed (json, canvasState) {
  lzma.compress(json, 2, result => {
    const str = Buffer.from(result).toString('base64')
    canvasState.compressedState.loading = false
    document.location.hash = str
    canvasState.compressedState.content = window.location.href
    document.location.hash = ''
    canvasState._render()
  })
}

// Restore from a json string
function restore (json, canvasState) {
  const data = JSON.parse(json)
  canvasState.canvasWidth = data.canvasWidth
  canvasState.canvasHeight = data.canvasHeight
  canvasState.elems = {}
  canvasState.elemOrder = []
  data.elemOrder.forEach(elemData => {
    const elem = Rectangle(canvasState)
    elem.props = elemData.props
    elem.flags = elemData.flags
    elem.name = elemData.name
    canvasState.elems[elem.name] = elem
    canvasState.elemOrder.push(elem)
  })
  canvasState._render()
}

// Restore from a lzma-compressed url hash
function restoreCompressed (compressed, canvasState) {
  const bytes = Buffer.from(compressed, 'base64')
  lzma.decompress(bytes, result => {
    restore(result, canvasState)
  })
}

// Get the mouse x/y coords globally
document.body.addEventListener('mousemove', ev => {
  document._mouseX = ev.clientX
  document._mouseY = ev.clientY
})

const app = App()

if (document.location.hash.length) {
  // Load from the url hash
  const compressed = document.location.hash.replace(/^#/, '')
  restoreCompressed(compressed, app.canvasState)
  document.location.hash = ''
} else {
  // Load from localstorage
  const initialState = localStorage.getItem('canvas-state')
  if (initialState) {
    try {
      restore(initialState, app.canvasState)
    } catch (e) {
      console.error('Unable to restore localstorage state:', e)
      localStorage.removeItem('canvas-state')
    }
  }
}

document.body.appendChild(app.view().elm)
