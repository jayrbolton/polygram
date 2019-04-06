const { Component, h } = require('uzu')

// Because lzma is not well setup for browserify/webpack, we inject it into our codebase to make it work.
const lzma = require('./vendor/lzma').LZMA()

// Components and views
const { Modal } = require('./components/Modal')
const { Element } = require('./components/Element')
const button = require('./components/button')

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
    shareModal: Modal(),
    openModal: Modal(),
    compressedState: {
      loading: false
    },
    // Compress the canvas state with lzma and generate a share link
    shareState () {
      this.shareModal.open()
      this.compressedState.loading = true
      this._render()
      const jsonState = stateToJson(this)
      persistCompressed(jsonState, result => {
        this.compressedState.loading = false
        document.location.hash = result
        this.compressedState.content = window.location.href
        this._render()
      })
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
        this.shareModal.view({
          title: 'Save Polygram',
          content: shareModalContent(this)
        }),
        h('div.flex.justify-end', [
          shareButton(this),
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
          newElemButton(this, Element, 'shape')
        ]),
        h('div', elems)
      ])
    }
  })
}

function shareModalContent (canvasState) {
  if (canvasState.compressedState.loading) {
    return h('div', [h('p', 'Loading...')])
  }
  return h('div', [
    h('p', 'Saved!'),
    h('p', 'Link for this polygram:'),
    h('textarea.w-100', {
      props: {
        value: canvasState.compressedState.content,
        rows: 6
      }
    })
  ])
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

// Takes the full app component, plus a single element
function removeButton (canvasState, elem) {
  return button('Remove', () => {
    delete canvasState.elems[elem.name]
    canvasState.elemOrder = canvasState.elemOrder.filter(e => e.name !== elem.name)
    canvasState._render()
  })
}

// Takes the full app component, plus a single element
function copyButton (canvasState, elem) {
  return button('Copy', () => {
    const newElem = Element(canvasState)
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
function shareButton (canvasState) {
  return button('Share/save', () => canvasState.shareState())
}

// Open a new drawing
function openButton (canvasState) {
  return button('Open', () => {
    canvasState.openModal.open()
  })
}

// Convert the canvas state to json text
function stateToJson (canvasState) {
  // mini function to get the properties of one "shape" element
  const getElem = elem => {
    return {
      f: elem.flags,
      p: elem.props,
      n: elem.name
    }
  }
  const elemOrder = canvasState.elemOrder.map(getElem)
  const json = JSON.stringify({
    w: canvasState.canvasWidth,
    h: canvasState.canvasHeight,
    es: elemOrder
  })
  return json
}

function persistCompressed (json, cb) {
  lzma.compress(json, 2, result => {
    const str = Buffer.from(result).toString('base64')
    cb(str)
  })
}

// Restore from a json string
function restoreJson (json, canvasState) {
  // The state will be minified where the keys are:
  // - 'h' is canvasHeight
  // - 'w' is canvasWidth
  // - 'es' is the elemOrder
  // For each element, we have properties for:
  // - 'p' is props
  // - 'f' is flags
  // - 'n' is name
  const data = JSON.parse(json)
  canvasState.canvasWidth = data.w || data.canvasWidth
  canvasState.canvasHeight = data.h || data.canvasHeight
  canvasState.elems = {}
  canvasState.elemOrder = []
  const elems = data.es || data.elemOrder
  elems.forEach(elemData => {
    const elem = Element(canvasState)
    elem.props = elemData.p || elemData.props
    elem.flags = elemData.f || elemData.flags
    elem.name = elemData.n || elemData.name
    canvasState.elems[elem.name] = elem
    canvasState.elemOrder.push(elem)
  })
  canvasState._render()
}

// Restore from a lzma-compressed url hash
function restoreCompressed (compressed, canvasState) {
  const bytes = Buffer.from(compressed, 'base64')
  lzma.decompress(bytes, result => {
    restoreJson(result, canvasState)
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
}

document.body.appendChild(app.view().elm)
