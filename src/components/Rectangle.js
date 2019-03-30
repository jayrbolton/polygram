const { Component, h } = require('uzu')

const field = require('./field')
const evaluate = require('../utils/evaluate')

module.exports = { Rectangle }

let id = 0

const start = window.performance.now()

function Rectangle (canvasState) {
  return Component({
    name: 'rect-' + id++,
    flags: {
      hasFill: true,
      hasRotation: false,
      hasStroke: false
    },
    utils: {
      sin: Math.sin,
      pi: Math.PI,
      mouseX: () => document._mouseX,
      mouseY: () => document._mouseY,
      ts: () => window.performance.now() - start,
      rand: (max) => Math.floor(Math.random() * Math.floor(max))
    },
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
    formOpen: true,
    toggleFormOpen () {
      this.formOpen = !this.formOpen
      this._render()
    },
    draw (ctx) {
      for (let i = 0; i < this.props.copies; i++) {
        this.drawOne(ctx, i)
      }
    },
    drawOne (ctx, i) {
      let props = {}
      const defs = Object.assign(this.utils, this.props)
      for (let name in this.props) {
        props[name] = evaluate(this.props[name], defs)
      }
      this.props.i = i
      const x = props.x
      const y = props.y
      ctx.save()
      // TODO: if (this.flags.hasRotation)
      if (this.flags.hasRotation) {
        const rotx = x + props.rotateX
        const roty = y + props.rotateY
        ctx.translate(rotx, roty)
        ctx.rotate(props.radians)
        ctx.translate(-rotx, -roty)
      }
      if (this.flags.hasFill) {
        ctx.fillStyle = 'rgba(' + props.fillRed + ', ' + props.fillGreen + ', ' + props.fillBlue + ', ' + props.fillAlpha + ')'
        ctx.fillRect(x, y, props.width, props.height)
      }
      if (this.flags.hasStroke) {
        const strokeWidth = props.strokeWidth
        ctx.strokeStyle = 'rgba(' + props.strokeRed + ', ' + props.strokeGreen + ', ' + props.strokeBlue + ', ' + props.strokeAlpha + ')'
        ctx.lineWidth = strokeWidth
        ctx.strokeRect(x, y, props.width, props.height)
      }
      ctx.restore()
    },
    view () {
      if (!this.formOpen) return h('div', '')
      const vars = this.props
      return h('div', [
        field(this, 'copies', ['copies'], vars),
        field(this, 'width', ['width'], vars),
        field(this, 'height', ['height'], vars),
        field(this, 'x', ['x'], vars),
        field(this, 'y', ['y'], vars),
        // Fill
        fieldGroup(this, {
          flag: 'hasFill',
          name: 'fill',
          children: [
            field(this, 'fill red', ['fillRed'], vars),
            field(this, 'fill green', ['fillGreen'], vars),
            field(this, 'fill blue', ['fillBlue'], vars),
            field(this, 'fill alpha', ['fillAlpha'], vars)
          ]
        }),

        fieldGroup(this, {
          flag: 'hasStroke',
          name: 'stroke',
          children: [
            field(this, 'stroke red', ['fillAlpha'], vars),
            field(this, 'stroke green', ['fillAlpha'], vars),
            field(this, 'stroke blue', ['fillAlpha'], vars),
            field(this, 'stroke alpha', ['fillAlpha'], vars),
            field(this, 'stroke width', ['strokeWidth'], vars)
          ]
        }),

        fieldGroup(this, {
          flag: 'hasRotation',
          name: 'rotation',
          children: [
            field(this, 'radians', ['radians'], vars),
            field(this, 'origin X', ['rotateX'], vars),
            field(this, 'origin Y', ['rotateY'], vars)
          ]
        })
      ])
    }
  })
}

function fieldGroup (shape, opts) {
  const { flag, name, children } = opts
  const htmlID = 'field-flag-' + name
  return h('div.bl.bw2.b--black-20.pl1.pb1.mb2', [
    h('input', {
      props: { type: 'checkbox', checked: shape.flags[flag], id: htmlID },
      on: {
        change: () => {
          // Toggle field group flag
          shape.flags[flag] = !shape.flags[flag]
          shape._render()
        }
      }
    }),
    h('label.pointer.code.ml2.b.black-60', { props: { htmlFor: htmlID } }, name),
    h('div.mt2', {
      props: {
        hidden: !shape.flags[flag]
      }
    }, children)
  ])
}
