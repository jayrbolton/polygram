const { Component, h } = require('uzu')

const field = require('./field')
const button = require('./button')

module.exports = { Layer }

let id = 0

const start = window.performance.now()
window.ts = () => window.performance.now() - start

// A layer of elements, to be drawn on the canvas at every frame.
function Layer (canvasState) {
  return Component({
    canvasState, // Save a reference to the parent canvasState
    name: 'layer-' + id++,
    id: String(window.performance.now()),
    // Is the form for this layer collapsed in the sidebar?
    formOpen: true,
    // Is the user currently renaming this layer?
    renaming: false,
    // Toggles for whole sections of fields
    flags: { hasFill: true, hasRotation: false, hasStroke: false },
    // Mark which fields are causing errors so we don't re-eval
    errors: {},
    // Parsed functions for each property
    funcs: {},
    // Input values for each field
    props: {
      copies: 1,
      x: 50,
      y: 50,
      width: 50,
      height: 50,
      fillRed: 0,
      fillGreen: 0,
      fillBlue: 100,
      fillAlpha: 0.5,
      strokeRed: 0,
      strokeGreen: 0,
      strokeBlue: 0,
      strokeAlpha: 1,
      strokeWidth: 2,
      radians: 0,
      rotateX: 0,
      rotateY: 0,
      scaleX: 1,
      scaleY: 1
    },

    // Open or close a section of the layer's form
    toggleFormOpen () {
      this.formOpen = !this.formOpen
      this._render()
    },

    // Toggle a flag, such as hasFill or hasStroke
    toggleFieldGroup (flag) {
      this.flags[flag] = !this.flags[flag]
      this._render()
    },

    // Draw all elements in the layer
    draw (ctx) {
      const copies = evaluate(this, 'copies', 0)
      for (let i = 0; i < copies; i++) {
        this.drawOne(ctx, i)
      }
    },

    // Draw a single element among many copies
    drawOne (ctx, idx) {
      let values = {}
      for (let propName in this.props) {
        values[propName] = evaluate(this, propName, idx)
      }
      const { x, y } = values
      ctx.translate(x, y)
      if (this.flags.hasRotation) {
        ctx.translate(values.rotateX, values.rotateY)
        ctx.rotate(values.radians)
        ctx.translate(-values.rotateX, -values.rotateY)
      }
      if (this.flags.hasFill) {
        ctx.fillStyle = 'rgba(' + values.fillRed + ', ' + values.fillGreen + ', ' + values.fillBlue + ', ' + values.fillAlpha + ')'
        ctx.fillRect(0, 0, values.width, values.height)
      }
      if (this.flags.hasStroke) {
        const strokeWidth = values.strokeWidth
        ctx.strokeStyle = 'rgba(' + values.strokeRed + ', ' + values.strokeGreen + ', ' + values.strokeBlue + ', ' + values.strokeAlpha + ')'
        ctx.lineWidth = strokeWidth
        ctx.strokeRect(0, 0, values.width, values.height)
      }
      ctx.resetTransform()
    },

    // Set a property (in `.props`) for this layer from some field input
    setProperty (propName, value) {
      this.props[propName] = value
      this.funcs[propName] = parseFunc(value, this, propName)
      window.funcs = this.funcs
    },

    view () {
      return h('div', { key: this.name }, [
        layerHeader(this),
        h('div', {
          class: { dn: !this.formOpen }
        }, layerFields(this))
      ])
    }
  })
}

function layerFields (layer) {
  return [
    layerField(layer, { name: 'copies' }),
    layerField(layer, { name: 'width' }),
    layerField(layer, { name: 'height' }),
    layerField(layer, { name: 'x' }),
    layerField(layer, { name: 'y' }),
    // Fill
    fieldGroup(layer, {
      flag: 'hasFill',
      name: 'fill',
      children: [
        layerField(layer, { name: 'fillRed', label: 'fill red' }),
        layerField(layer, { name: 'fillBlue', label: 'fill blue' }),
        layerField(layer, { name: 'fillGreen', label: 'fill green' }),
        layerField(layer, { name: 'fillAlpha', label: 'fill alpha' })
      ]
    }),

    // Stroke
    fieldGroup(layer, {
      flag: 'hasStroke',
      name: 'stroke',
      children: [
        layerField(layer, { name: 'strokeRed', label: 'stroke red' }),
        layerField(layer, { name: 'strokeRed', label: 'stroke green' }),
        layerField(layer, { name: 'strokeRed', label: 'stroke blue' }),
        layerField(layer, { name: 'strokeRed', label: 'stroke alpha' }),
        layerField(layer, { name: 'strokeRed', label: 'stroke width' })
      ]
    }),

    // Rotation
    fieldGroup(layer, {
      flag: 'hasRotation',
      name: 'rotation',
      children: [
        layerField(layer, { name: 'radians' }),
        layerField(layer, { name: 'rotateX', label: 'X origin' }),
        layerField(layer, { name: 'rotateY', label: 'Y origin' })
      ]
    })
  ]
}

function layerField (layer, { name, label }) {
  const setProp = (propName) => (ev) => {
    layer.setProperty(propName, ev.currentTarget.value)
  }
  return field({
    value: layer.props[name],
    classes: {
      'b--red': layer.errors[name]
    },
    label: label || name,
    oninput: setProp(name)
  })
}

function layerHeader (layer) {
  // Wrapper element for the header
  const div = cs => h('div.b.bb.b--black-20.mv1.code.pv1.flex.justify-between.items-center', cs)
  if (layer.renaming) {
    // Return an editable form if they are changing the layer name
    const content = [
      h('form', {
        on: {
          submit: ev => {
            ev.preventDefault()
            layer.renaming = false
            layer._render()
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
        }),
        button({ props: { type: 'submit' } }, 'Set')
      ])
    ]
    return div(content)
  }
  const canvasState = layer.canvasState
  return div([
    h('span.pointer.dib.truncate', {
      on: { click: () => layer.toggleFormOpen() }
    }, [
      h('span.mr1.black-60', layer.formOpen ? '−' : '+'),
      layer.name
    ]),
    h('div', [
      renameButton(canvasState, layer),
      copyButton(canvasState, layer),
      removeButton(canvasState, layer)
    ])
  ])
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
        canvasState.pushToHistory({
          name: 'copy-layer',
          backwards: () => canvasState.removeLayer(newLayer),
          forwards: () => canvasState.addLayer(newLayer)
        })
        canvasState.addLayer(newLayer)
      }
    }
  }, 'Copy')
}

// Takes the full app component, plus a single element
function removeButton (canvasState, layer) {
  return button({
    on: {
      click: () => {
        canvasState.pushToHistory({
          name: 'remove-layer',
          backwards: () => canvasState.addLayer(layer),
          forwards: () => canvasState.removeLayer(layer)
        })
        canvasState.removeLayer(layer)
        canvasState._render()
      }
    }
  }, 'Remove')
}

// Convert some expression in a field into a callable function object
function parseFunc (str, layer, propName) {
  try {
    // This is funky as heck
    const expr = 'with (constants) { return ' + str + '}'
    const func = new Function('i', 'constants', expr) // eslint-disable-line
    // Turn off the error flag, if present
    if (layer.errors[propName]) {
      layer.errors[propName] = false
      layer._render()
    }
    return func
  } catch (e) {
    layer.errors[propName] = true
    layer._render()
    return function () {}
  }
}

function evaluate (layer, propName, idx) {
  if (propName in layer.funcs) {
    // If this property already has an error, do not re-evaluate it
    if (layer.errors[propName]) {
      return null
    }
    try {
      // Apply the stored function object
      const result = layer.funcs[propName](idx, layer.canvasState.constants.obj)
      return result
    } catch (e) {
      layer.errors[propName] = true
      layer._render()
    }
  } else {
    // Not a function; just return the plain value
    return layer.props[propName]
  }
}

function fieldGroup (layer, opts) {
  const { flag, name, children } = opts
  const htmlID = 'field-flag-' + layer.id + '-' + flag
  const isOpen = layer.flags[flag]
  return h('div.bl.bw2.pl1.pb1.mb2', {
    class: {
      'b--black-20': !isOpen,
      'b--green': isOpen
    }
  }, [
    h('input', {
      props: { type: 'checkbox', checked: isOpen, id: htmlID },
      dataset: { name: layer.name },
      on: { change: () => layer.toggleFieldGroup(flag) }
    }),
    h('label.pointer.code.ml2.b.black-60', {
      props: { htmlFor: htmlID },
      style: { userSelect: 'none' }
    }, name),
    h('div.mt2', {
      props: { hidden: !isOpen }
    }, children)
  ])
}
