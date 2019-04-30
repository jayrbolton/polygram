const { Component, h } = require('uzu')

const field = require('./field')

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
    flags: {
      hasFill: true,
      hasRotation: false,
      hasStroke: false
    },
    // Mark which fields are causing errors so we don't re-eval
    errs: {},
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
        // ctx.translate(values.rotateX, values.rotateY)
        ctx.rotate(values.radians)
      }
      if (this.flags.hasFill) {
        ctx.fillStyle = 'rgba(' + values.fillRed + ', ' + values.fillGreen + ', ' + values.fillBlue + ', ' + values.fillAlpha + ')'
        ctx.fillRect(-values.rotateX || 0, -values.rotateY || 0, values.width, values.height)
      }
      if (this.flags.hasStroke) {
        const strokeWidth = values.strokeWidth
        ctx.strokeStyle = 'rgba(' + values.strokeRed + ', ' + values.strokeGreen + ', ' + values.strokeBlue + ', ' + values.strokeAlpha + ')'
        ctx.lineWidth = strokeWidth
        ctx.strokeRect(0, 0, values.width, values.height)
      }
      if (this.flags.hasRotation) {
        ctx.rotate(-values.radians)
        // ctx.translate(-values.rotateX, -values.rotateY)
      }
      ctx.translate(-x, -y)
    },

    // Set a property (in `.props`) for this layer from some field input
    setProperty (propName, value) {
      this.props[propName] = value
      this.errs[propName] = false
      this.funcs[propName] = parseFunc(value, this, propName)
      window.funcs = this.funcs
    },

    view () {
      if (!this.formOpen) return h('div', '')
      const setProp = (propName) => (ev) => {
        this.setProperty(propName, ev.currentTarget.value)
      }
      return h('div', [
        field({ value: this.props['copies'], label: 'copies', oninput: setProp('copies') }),
        field({ value: this.props['width'], label: 'width', oninput: setProp('width') }),
        field({ value: this.props['height'], label: 'height', oninput: setProp('height') }),
        field({ value: this.props['x'], label: 'x', oninput: setProp('x') }),
        field({ value: this.props['y'], label: 'y', oninput: setProp('y') }),
        // Fill
        fieldGroup(this, {
          flag: 'hasFill',
          name: 'fill',
          children: [
            field({ value: this.props['fillRed'], label: 'fill red', oninput: setProp('fillRed') }),
            field({ value: this.props['fillBlue'], label: 'fill blue', oninput: setProp('fillBlue') }),
            field({ value: this.props['fillGreen'], label: 'fill green', oninput: setProp('fillGreen') }),
            field({ value: this.props['fillAlpha'], label: 'fill alpha', oninput: setProp('fillAlpha') })
          ]
        }),

        // Stroke
        fieldGroup(this, {
          flag: 'hasStroke',
          name: 'stroke',
          children: [
            field({ value: this.props['strokeRed'], label: 'stroke red', oninput: setProp('strokeRed') }),
            field({ value: this.props['strokeGreen'], label: 'stroke green', oninput: setProp('strokeGreen') }),
            field({ value: this.props['strokeBlue'], label: 'stroke blue', oninput: setProp('strokeBlue') }),
            field({ value: this.props['strokeAlpha'], label: 'stroke alpha', oninput: setProp('strokeAlpha') }),
            field({ value: this.props['strokeWidth'], label: 'stroke width', oninput: setProp('strokeWidth') })
          ]
        }),

        // Rotation
        fieldGroup(this, {
          flag: 'hasRotation',
          name: 'rotation',
          children: [
            field({ value: this.props['radians'], label: 'radians', oninput: setProp('radians') }),
            field({ value: this.props['rotateX'], label: 'origin X', oninput: setProp('rotateX') }),
            field({ value: this.props['rotateY'], label: 'origin Y', oninput: setProp('rotateY') })
          ]
        })
      ])
    }
  })
}

// Convert some expression in a field into a callable function object
function parseFunc (str, layer, propName) {
  try {
    const args = layer.canvasState.constants.arr.map(({ name, value }) => name)
    args.unshift('i') // for 'index'
    args.push('return ' + str)
    const func = Function.apply(void 0, args)
    return func
  } catch (e) {
    return function () {}
  }
}

function evaluate (layer, propName, idx) {
  if (propName in layer.funcs) {
    // If this property already has an error, do not re-evaluate it
    if (layer.errs[propName]) {
      return null
    }
    try {
      // Apply the stored function object
      const args = layer.canvasState.constants.arr.map(({ name, value }) => value)
      args.unshift(idx)
      const result = layer.funcs[propName].apply(null, args)
      return result
    } catch (e) {
      console.error(e)
      layer.errs[propName] = true
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
