const { Component, h } = require('uzu')
const pako = require('pako') // for string compression

// Components and views
const { Modal } = require('./components/Modal')
const { Layer } = require('./components/Layer')
const { Constants } = require('./components/Constants')
const button = require('./components/button')
const fieldset = require('./components/fieldset')

// TODO persist constants in the url

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
  return Component({
    constants,
    canvasWidth: 1000,
    canvasHeight: 1000,
    sidebarWidth: 400,
    fillStyle: 'white',
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
      const layers = this.layerOrder.map(layer => layerForm(this, layer))
      return h('div.bg-light-gray.pv2.pl2.pr3.relative', {
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
          button({ on: { click: () => this.openModal.open() } }, 'Open')
        ]),
        canvasOptionField(this.canvasWidth, 'canvas width', 'number', w => this.changeCanvasWidth(w)),
        canvasOptionField(this.canvasHeight, 'canvas height', 'number', h => this.changeCanvasHeight(h)),
        canvasOptionField(this.fillStyle, 'background color', 'text', fs => this.changeFillStyle(fs)),
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
            width: '6px',
            background: 'gray',
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
                  this.elm.style.left = this.sidebarWidth + 'px'
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
}

// Sidebar form for a single layer
function layerForm (canvasState, layer) {
  let content
  if (layer.renaming) {
    content = [
      h('form', {
        on: {
          submit: () => {
            layer.renaming = false
            layer._render()
            canvasState._render()
          }
        }
      }, [
        h('input', {
          props: { type: 'text', value: layer.name },
          on: {
            input: ev => {
              layer.name = ev.currentTarget.value
            }
          }
        })
      ]),
      h('div', [
        button({ props: { type: 'submit' } }, 'Set')
      ])
    ]
  } else {
    content = [
      h('span.pointer.dib.truncate', {
        on: { click: () => layer.toggleFormOpen() }
      }, layer.name),
      h('div.nowrap', [
        renameButton(canvasState, layer),
        copyButton(canvasState, layer),
        removeButton(canvasState, layer)
      ])
    ]
  }
  return h('div', { key: layer.name }, [
    h('div.b.bb.b--black-20.mv1.code.pv1.flex.justify-between.items-center', content),
    layer.view()
  ])
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

function Canvas (canvasState) {
  return Component({
    view () {
      return h('canvas.fixed.top-0', {
        style: {
          left: canvasState.sidebarWidth + 'px'
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

// Takes the full app component, plus a single element
function removeButton (canvasState, layer) {
  return button({
    on: {
      click: () => {
        pushToHistory(canvasState, {
          name: 'remove-layer',
          backwards: () => addLayer(canvasState, layer),
          forwards: () => removeLayer(canvasState, layer)
        })
        removeLayer(canvasState, layer)
        canvasState._render()
      }
    }
  }, 'Remove')
}

function renameButton (canvasState, layer) {
  return button({
    on: {
      click: () => {
        layer.renaming = true
        canvasState._render()
      }
    }
  }, 'Rename')
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
  const json = JSON.stringify({
    w: canvasState.canvasWidth,
    h: canvasState.canvasHeight,
    fs: canvasState.fillStyle,
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
  const layers = data.es
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
