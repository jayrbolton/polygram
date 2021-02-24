// Wraps all the animation state for the canvas, and all the UI in the left sidepanel.
const { Component, h } = require('uzu')
const pako = require('pako') // for string compression
const { Constants } = require('./Constants')
const { Modal } = require('./Modal')
const { Layer } = require('./Layer')
const button = require('./button')
const field = require('./field')
const icon = require('./icon')

const HELP_LINK = 'https://github.com/jayrbolton/polygram/blob/master/HELP.md'

module.exports = { CanvasState }

function CanvasState () {
  const cs = Component({
    canvasWidth: 800,
    canvasHeight: 800,
    sidebarWidth: 340,
    fillStyle: 'black',
    // Collections of shape elements, both accessed by key and ordered.
    layers: {},
    layerOrder: [],
    // Share/save and open dialogs
    shareModal: Modal(),
    openModal: Modal(),
    // Compressed state and all child layers -- populates on "Share"
    compressedState: { loading: false, content: null },
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
      this._render()
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

    // Restore canvas state (constants and layers) from a base64-encoded compressed json blob
    restoreCompressed (compressed) {
      const bytes = Buffer.from(compressed, 'base64')
      const result = pako.inflate(bytes, { to: 'string' })
      restoreJson(result, this)
    },

    // Left sidepanel for controlling the state of the canvas
    view () {
      const layers = this.layerOrder.map(layer => layer.view())
      return h('div.pv2.pl2.pr3.relative.bg-white-20.z-1', {
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
          undoButton(this),
          redoButton(this),
          button('button', { on: { click: () => this.shareState() } }, 'Save'),
          button('button', { on: { click: () => this.openModal.open() } }, 'Load'),
          button('button', {
            props: {
              href: HELP_LINK,
              target: '_blank'
            }
          }, 'Help', 'a')
        ]),
        // Canvas options section
        canvasLabelTitle('Size'),
        canvasOptionField(this.canvasWidth, 'Width', 'number', w => this.changeCanvasWidth(w)),
        canvasOptionField(this.canvasHeight, 'Height', 'number', h => this.changeCanvasHeight(h)),
        canvasLabelTitle('Background'),
        canvasOptionField(this.fillStyle, 'Red', 'text', fs => this.changeFillStyle(fs)),
        canvasOptionField(this.fillStyle, 'Green', 'text', fs => this.changeFillStyle(fs)),
        canvasOptionField(this.fillStyle, 'Blue', 'text', fs => this.changeFillStyle(fs)),
        // Constant values
        // this.constants ? h('div', this.constants.view()) : '',
        // Layers header
        h('div.flex.justify-between.items-center.mt2.pb2.mb1.bb.bw-2.b--black-20', [
          h('span.sans-serif.white-80', [
            layers.length + ' ' + (layers.length > 1 ? 'layers' : 'layer')
          ]),
          newLayerButton(this)
        ]),
        // All layer components
        h('div', layers)
      ])
    }
  })
  cs.addLayer(Layer(cs))
  cs.constants = Constants(cs) // Constant values that can be used inside layers
  return cs
}

function canvasLabelTitle (text) {
  return h('label.b.db.sans-serif.white-90.f5.mv2', text)
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

// Take a json blob from `stateToJson`, compress it with pako, then base64-encode it
function persistCompressed (json, cb) {
  const bin = pako.deflate(json)
  return Buffer.from(bin).toString('base64')
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
          canvasState.restoreCompressed(compressed)
          canvasState.openModal.close()
        }
      }
    }, [
      h('p', 'Paste a polygram link:'),
      h('textarea.w-100', { props: { rows: 4 } }),
      button('button', {}, 'Load')
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

function undoButton (canvasState) {
  return button('button', {
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
  return button('button', {
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

// Field element for canvas width, height, fill, etc
function canvasOptionField (value, label, type, onchange) {
  return field({
    label,
    value,
    type,
    oninput: ev => {
      const newval = ev.currentTarget.value
      onchange(newval)
    }
  })
}

// Create a new shape
function newLayerButton (canvasState) {
  return button('button', {
    on: {
      click: () => {
        // Create and append a new layer, saving undo/redo history actions for it
        const layer = Layer(canvasState)
        canvasState.addLayer(layer)
      }
    }
  }, [icon('plus'), ' Layer'])
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
    for (const propName in props) {
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
