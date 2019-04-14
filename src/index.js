const { Component, h } = require('uzu')

// Because lzma is not set up for browserify/webpack, we inject it into our codebase to make it work.
const lzma = require('./vendor/lzma').LZMA()

// Components and views
const { Modal } = require('./components/Modal')
const { Layer } = require('./components/Layer')
const button = require('./components/button')
const fieldset = require('./components/fieldset')

function App () {
  // State of the drawing, including all the sidebar option fields.
  const canvasState = CanvasState()
  // The actual canvas element, which wraps the draw() function
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
    canvasWidth: 1000,
    canvasHeight: 1000,
    fillStyle: 'white',
    // Shape elements
    layers: {},
    layerOrder: [],
    // Share/save and open dialogs
    shareModal: Modal(),
    openModal: Modal(),
    // Compressed state of the canvas state and its elements
    compressedState: { loading: false },
    // undo/redo actions
    // array of objects with keys for `forwards` and `backwards`
    // each is a function that moves the state forward or back
    backwardActions: [],
    forwardActions: [],

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

    changeCanvasHeight (height) {
      this.canvasHeight = height
      this.elm.height = height
    },

    changeCanvasWidth (width) {
      this.canvasWidth = width
      this.elm.width = width
    },

    changeFillStyle (s) {
      // Will update on next frame
      this.fillStyle = s
    },

    view () {
      const layers = this.layerOrder.map(elem => {
        return h('div', { key: elem.name }, [
          h('div.b.bb.b--black-20.mv1.code.pv1.flex.justify-between.items-center', [
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
        style: { width: '20rem' }
      }, [
        this.openModal.view({
          title: 'Open',
          content: openModalContent(this)
        }),
        this.shareModal.view({
          title: 'Share Polygram',
          content: shareModalContent(this)
        }),
        h('div.flex.justify-end', [
          button({ on: { click: () => this.shareState() } }, 'Share'),
          button({ on: { click: () => this.openModal.open() } }, 'Open')
        ]),
        canvasOptionField(this.canvasWidth, 'canvas width', 'number', w => this.changeCanvasWidth(w)),
        canvasOptionField(this.canvasHeight, 'canvas height', 'number', h => this.changeCanvasHeight(h)),
        canvasOptionField(this.fillStyle, 'background color', 'text', fs => this.changeFillStyle(fs)),
        h('div', [
          // newElemButton(this, Value, 'value'),
          newLayerButton(this),
          undoButton(this),
          redoButton(this)
        ]),
        h('div', layers)
      ])
    }
  })
}

// Field element for canvas width, height, fill, etc
function canvasOptionField (val, label, inputType, onchange) {
  return fieldset([
    h('label.code', { css: { root: ['font-family: mono'] } }, label),
    h('input.code.f6.pa1.w-100', {
      props: { type: inputType, value: val },
      on: {
        input: ev => {
          const newval = ev.currentTarget.value
          onchange(newval)
        }
      }
    })
  ])
}

// Content in the modal for opening an existing polygram with a link
function openModalContent (canvasState) {
  return h('div', [
    h('form', {
      on: {
        submit: ev => {
          ev.preventDefault()
          const link = ev.currentTarget.querySelector('textarea').value
          const compressed = link.match(/#(.+)$/)[1]
          restoreCompressed(compressed, canvasState)
        }
      }
    }, [
      h('p', 'Paste a polygram link:'),
      h('textarea.w-100', { props: { rows: 4 } }),
      button({}, 'Load')
    ])
  ])
}

// Modal content for sharing the current polygram
function shareModalContent (canvasState) {
  if (canvasState.compressedState.loading) {
    return h('div', [h('p', 'Loading...')])
  }
  return h('div', [
    h('p', 'Unique link for this polygram:'),
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
            canvasState.elm = elm
            elm.width = canvasState.canvasWidth
            elm.height = canvasState.canvasHeight
            const ctx = elm.getContext('2d')
            ctx.globalCompositeOperation = 'source-over'
            ctx.save()
            function draw (ts) {
              document._ts = ts
              ctx.fillStyle = canvasState.fillStyle || 'white'
              ctx.fillRect(0, 0, canvasState.canvasWidth, canvasState.canvasHeight)
              for (let name in canvasState.layers) {
                let shape = canvasState.layers[name]
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
function removeButton (canvasState, layer) {
  return button({
    on: {
      click: () => {
        delete canvasState.layers[layer.id]
        canvasState.layerOrder = canvasState.layerOrder.filter(l => l.id !== layer.id)
        canvasState._render()
        pushToHistory(canvasState, {
          name: 'remove-layer',
          backwards: () => addLayer(canvasState, layer),
          forwards: () => removeLayer(canvasState, layer)
        })
      }
    }
  }, 'Remove')
}

// Takes the full app component, plus a single element
function copyButton (canvasState, layer) {
  return button({
    on: {
      click: () => {
        const newLayer = Layer(canvasState)
        const props = Object.assign({}, layer.props)
        const flags = Object.assign({}, layer.flags)
        newLayer.props = props
        newLayer.flags = flags
        pushToHistory(canvasState, {
          name: 'copy-layer',
          backwards: () => removeLayer(canvasState, newLayer),
          forwards: () => addLayer(canvasState, newLayer)
        })
        addLayer(canvasState, newLayer)
        console.log('backward actions', canvasState.backwardActions)
      }
    }
  }, 'Copy')
}

// Create a new shape
function newLayerButton (canvasState) {
  return button({
    on: {
      click: () => {
        // Create and append a new layer, saving undo/redo history actions for it
        const layer = Layer(canvasState)
        // For undo/redo actions
        pushToHistory(canvasState, {
          name: 'new-layer',
          backwards: () => removeLayer(canvasState, layer),
          forwards: () => addLayer(canvasState, layer)
        })
        addLayer(canvasState, layer)
        console.log('backward actions', canvasState.backwardActions)
      }
    }
  }, 'Add layer')
}

// Add new backwards and forwards actions to the canvas history
// This happens on any new action. It erases the forwardActions, if present.
function pushToHistory (canvasState, actions) {
  canvasState.backwardActions.push(actions)
  if (canvasState.forwardActions.length) {
    canvasState.forwardActions = []
  }
}

// Add a new layer to the canvas state
function addLayer (canvasState, layer) {
  canvasState.layers[layer.id] = layer
  canvasState.layerOrder.push(layer)
  canvasState._render()
}

// Remove an existing layer from the canvas state
function removeLayer (canvasState, layer) {
  canvasState.layerOrder = canvasState.layerOrder.filter(l => l.id !== layer.id)
  delete canvasState.layers[layer.id]
  canvasState._render()
}

function undoButton (canvasState) {
  return button({
    props: {
      disabled: !canvasState.backwardActions.length
    },
    on: {
      click: () => {
        console.log('backward actions', canvasState.backwardActions)
        const action = canvasState.backwardActions.pop()
        action.backwards()
        canvasState.forwardActions.push(action)
        canvasState._render()
      }
    }
  }, 'Undo')
}

function redoButton (canvasState) {
  return button({
    props: {
      disabled: !canvasState.forwardActions.length
    },
    on: {
      click: () => {
        const action = canvasState.forwardActions.pop()
        action.forwards()
        canvasState.backwardActions.push(action)
        canvasState._render()
      }
    }
  }, 'Redo')
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
  const layerOrder = canvasState.layerOrder.map(getElem)
  const json = JSON.stringify({
    w: canvasState.canvasWidth,
    h: canvasState.canvasHeight,
    fs: canvasState.fillStyle,
    es: layerOrder
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
  // - 'fs' is the fillStyle
  // - 'es' is the layerOrder
  // For each element, we have properties for:
  // - 'p' is props
  // - 'f' is flags
  // - 'n' is name
  const data = JSON.parse(json)
  canvasState.canvasWidth = data.w || data.canvasWidth
  canvasState.canvasHeight = data.h || data.canvasHeight
  canvasState.fillStyle = data.fs || 'white'
  canvasState.layers = {}
  canvasState.layerOrder = []
  // Falblacks provided for backwards compatibility
  const layers = data.es || data.elemOrder || data.layerOrder || []
  layers.forEach(elemData => {
    const elem = Layer(canvasState)
    const props = elemData.p || elemData.props || {}
    for (let propName in props) {
      elem.setProperty(propName, props[propName])
    }
    elem.flags = elemData.f || elemData.flags
    elem.name = elemData.n || elemData.name
    canvasState.layers[elem.name] = elem
    canvasState.layerOrder.push(elem)
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

// Track the mouse x/y coords globally
document.body.addEventListener('mousemove', ev => {
  document._mouseX = ev.clientX
  document._mouseY = ev.clientY
})

// Initialize the top-level component
const app = App()

// Load a canvas state from the url hash, if present
if (document.location.hash.length) {
  const compressed = document.location.hash.replace(/^#/, '')
  restoreCompressed(compressed, app.canvasState)
}

// Mount to the page
document.body.appendChild(app.view().elm)
