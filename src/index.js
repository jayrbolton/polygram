const { Component, h } = require('uzu')
const pako = require('pako') // for string compression

// Components and views
const { Modal } = require('./components/Modal')
const { Layer } = require('./components/Layer')
const { Constants } = require('./components/Constants')
const button = require('./components/button')
const fieldset = require('./components/fieldset')

const HELP_LINK = 'https://github.com/jayrbolton/polygram/blob/master/HELP.md'

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
  const constants = Constants() // Constant values that can be used inside layers
  const cs = Component({
    constants,
    canvasWidth: 800,
    canvasHeight: 800,
    sidebarWidth: 400,
    fillStyle: 'black',
    // Collections of shape elements, both accessed by key and ordered.
    layers: {},
    layerOrder: [],
    // Share/save and open dialogs
    shareModal: Modal(),
    openModal: Modal(),
    // Compressed state and all child layers -- populates on "Share"
    compressedState: { loading: false },
    // undo/redo actions
    // array of objects with keys for `forwards` and `backwards`
    // each is a function that moves the state forward or back
    backwardActions: [],
    forwardActions: [],

    // Add new backwards and forwards actions to the canvas history
    // This happens on any new action. It erases the forwardActions, if present.
    pushToHistory (actions) {
      this.backwardActions.push(actions)
      if (this.forwardActions.length) {
        this.forwardActions = []
      }
    },

    // Add a new layer to the canvas state
    addLayer (layer) {
      this.layers[layer.id] = layer
      this.layerOrder.push(layer)
      this._render()
    },

    // Remove an existing layer from the canvas state
    removeLayer (layer) {
      this.layerOrder = this.layerOrder.filter(l => l.id !== layer.id)
      delete this.layers[layer.id]
      this._render()
    },

    // Compress the canvas state and generate a share link
    shareState () {
      this.shareModal.open()
      this._render()
      const jsonState = stateToJson(this)
      const result = persistCompressed(jsonState)
      document.location.hash = result
      this.compressedState.content = window.location.href
      this._render()
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

    // Left sidepanel for controlling the state of the canvas
    view () {
      const layers = this.layerOrder.map(layer => layer.view())
      return h('div.pv2.pl2.pr3.relative', {
        style: { width: this.sidebarWidth + 'px' }
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
          button({ on: { click: () => this.openModal.open() } }, 'Open'),
          button({
            props: {
              href: HELP_LINK,
              target: '_blank'
            }
          }, 'Help!', 'a')
        ]),
        h('label.b.db.code', 'canvas'),
        h('div.flex.justify-between', [
          canvasOptionField(this.canvasWidth, 'width', 'number', w => this.changeCanvasWidth(w)),
          canvasOptionField(this.canvasHeight, 'height', 'number', h => this.changeCanvasHeight(h)),
          canvasOptionField(this.fillStyle, 'color', 'text', fs => this.changeFillStyle(fs))
        ]),
        h('div', [
          newLayerButton(this),
          undoButton(this),
          redoButton(this)
        ]),
        h('div', this.constants.view()),
        h('div', layers),
        // right-side pull bar
        h('div', {
          style: {
            position: 'absolute',
            height: '100%',
            width: '10px',
            background: 'black',
            borderRight: '4px solid gray',
            top: '0px',
            right: '0px',
            zIndex: '0',
            cursor: 'col-resize'
          },
          on: {
            mousedown: () => {
              const mousemove = ev => {
                const xPos = ev.clientX
                if (xPos > 200 && xPos < 1000) {
                  this.sidebarWidth = xPos
                  this.elm.style.left = this.sidebarWidth + 10 + 'px'
                  this._render()
                }
              }
              const mouseup = ev => {
                document.body.removeEventListener('mouseup', mouseup)
                document.body.removeEventListener('mousemove', mousemove)
              }
              document.body.addEventListener('mouseup', mouseup)
              document.body.addEventListener('mousemove', mousemove)
            }
          }
        })
      ])
    }
  })
  cs.addLayer(Layer(cs))
  return cs
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
          canvasState.openModal.close()
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

function Canvas (canvasState) {
  return Component({
    view () {
      return h('canvas.fixed.top-0', {
        style: {
          left: canvasState.sidebarWidth + 10 + 'px'
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
              for (let id in canvasState.layers) {
                let shape = canvasState.layers[id]
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

// Create a new shape
function newLayerButton (canvasState) {
  return button({
    on: {
      click: () => {
        // Create and append a new layer, saving undo/redo history actions for it
        const layer = Layer(canvasState)
        // For undo/redo actions
        canvasState.pushToHistory({
          name: 'new-layer',
          backwards: () => canvasState.removeLayer(layer),
          forwards: () => canvasState.addLayer(layer)
        })
        canvasState.addLayer(layer)
      }
    }
  }, 'Add layer')
}

function undoButton (canvasState) {
  return button({
    props: {
      disabled: !canvasState.backwardActions.length
    },
    on: {
      click: () => {
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
  // mini function to get the properties of one layer
  const getLayer = layer => {
    return {
      f: layer.flags,
      p: layer.props,
      n: layer.name
    }
  }
  const layerOrder = canvasState.layerOrder.map(getLayer)
  const constants = canvasState.constants.arr.map(name => {
    return [name, canvasState.constants.obj[name]]
  })
  const json = JSON.stringify({
    w: canvasState.canvasWidth,
    h: canvasState.canvasHeight,
    fs: canvasState.fillStyle,
    cs: constants,
    es: layerOrder
  })
  return json
}

function persistCompressed (json, cb) {
  const bin = pako.deflate(json)
  return Buffer.from(bin).toString('base64')
}

// Restore from a json string
function restoreJson (json, canvasState) {
  // The state will be minified where the keys are:
  // - 'h' is canvasHeight
  // - 'w' is canvasWidth
  // - 'fs' is the fillStyle
  // - 'es' is the layerOrder
  // - 'cs' are the constants in an array of pairs of [name, value]
  // For each layer, we have properties for:
  // - 'p' is props
  // - 'f' is flags
  // - 'n' is name
  const data = JSON.parse(json)
  canvasState.canvasWidth = data.w
  canvasState.canvasHeight = data.h
  canvasState.fillStyle = data.fs || 'white'
  canvasState.layers = {}
  canvasState.layerOrder = []
  const layers = data.es || []
  layers.forEach(layerData => {
    const layer = Layer(canvasState)
    const props = layerData.p
    for (let propName in props) {
      layer.setProperty(propName, props[propName])
    }
    layer.flags = layerData.f
    layer.name = layerData.n
    canvasState.layers[layer.id] = layer
    canvasState.layerOrder.push(layer)
    if (canvasState.elm) {
      canvasState.elm.width = canvasState.canvasWidth
      canvasState.elm.height = canvasState.canvasHeight
    }
  })
  // Restore constants
  canvasState.constants.obj = {}
  canvasState.constants.arr = []
  const constants = data.cs || []
  constants.forEach(([name, val]) => {
    canvasState.constants.arr.push(name)
    canvasState.constants.obj[name] = val
  })
  canvasState._render()
}

// Restore from a pako-compressed url hash
function restoreCompressed (compressed, canvasState) {
  const bytes = Buffer.from(compressed, 'base64')
  const result = pako.inflate(bytes, { to: 'string' })
  restoreJson(result, canvasState)
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
