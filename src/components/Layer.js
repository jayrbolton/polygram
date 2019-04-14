const { Component, h } = require('uzu')

const field = require('./field')

module.exports = { Layer }

let id = 0

const start = window.performance.now()
window.ts = () => window.performance.now() - start
window.floor = Math.floor

// A layer of elements, to be drawn on the canvas at every frame.
function Layer (canvasState) {
  return Component({
    name: 'layer-' + id++,
    id: String(window.performance.now()),
    formOpen: true,
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

    toggleFormOpen () {
      this.formOpen = !this.formOpen
      this._render()
    },

    toggleFieldGroup (flag) {
      // Toggle field group flag
      this.flags[flag] = !this.flags[flag]
      this._render()
    },

    // Draw all elements in the layer
    draw (ctx) {
      for (let i = 0; i < this.props.copies; i++) {
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
      if (this.flags.hasRotation) {
        const { rotateX, rotateY } = values
        ctx.translate(rotateX, rotateY)
        ctx.rotate(values.radians)
        ctx.translate(-rotateX, -rotateY)
      }
      if (this.flags.hasFill) {
        ctx.fillStyle = 'rgba(' + values.fillRed + ', ' + values.fillGreen + ', ' + values.fillBlue + ', ' + values.fillAlpha + ')'
        ctx.fillRect(x, y, values.width, values.height)
      }
      if (this.flags.hasStroke) {
        const strokeWidth = values.strokeWidth
        ctx.strokeStyle = 'rgba(' + values.strokeRed + ', ' + values.strokeGreen + ', ' + values.strokeBlue + ', ' + values.strokeAlpha + ')'
        ctx.lineWidth = strokeWidth
        ctx.strokeRect(x, y, values.width, values.height)
      }
    },

    setProperty (propName, value) {
      this.props[propName] = value
      this.errs[propName] = false
      this.funcs[propName] = parseFunc(value, this, propName)
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

function parseFunc (str, layer, propName) {
  try {
    return Function('i', 'return ' + str) // eslint-disable-line
  } catch (e) {
    return function () {}
  }
}

function evaluate (layer, propName, idx) {
  if (propName in layer.funcs) {
    if (layer.errs[propName]) {
      return null
    }
    try {
      return layer.funcs[propName](idx)
    } catch (e) {
      layer.errs[propName] = true
      console.error(e)
    }
  } else {
    return layer.props[propName]
  }
}

function fieldGroup (layer, opts) {
  const { flag, name, children } = opts
  const htmlID = 'field-flag-' + layer.name + '-' + flag
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
    h('label.pointer.code.ml2.b.black-60', { props: { htmlFor: htmlID } }, name),
    h('div.mt2', {
      props: { hidden: !isOpen }
    }, children)
  ])
}
