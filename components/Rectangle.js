const { Component, h } = require('uzu')

const field = require('./field')
const evaluate = require('../utils/evaluate')

module.exports = { Rectangle }

let id = 0

const start = window.performance.now()

function Rectangle (canvasState) {
  return Component({
    name: 'rect-' + id++,
    props: {
      ts: () => window.performance.now() - start,
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
      strokeWidth: 0,
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
      for (let name in this.props) {
        props[name] = evaluate(this.props[name], this.props)
      }
      this.props.i = i
      const strokeWidth = props.strokeWidth
      const x = props.x
      const y = props.y
      ctx.save()
      if (props.radians) {
        const rotx = x + props.rotateX
        const roty = y + props.rotateY
        ctx.translate(rotx, roty)
        ctx.rotate(props.radians)
        ctx.translate(-rotx, -roty)
      }
      ctx.scale(props.scaleX, props.scaleY)
      ctx.fillStyle = 'rgba(' + props.fillRed + ', ' + props.fillGreen + ', ' + props.fillBlue + ', ' + props.fillAlpha + ')'
      ctx.fillRect(x, y, props.width, props.height)
      if (strokeWidth) {
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
        field(this, 'fill red', ['fillRed'], vars),
        field(this, 'fill green', ['fillGreen'], vars),
        field(this, 'fill blue', ['fillBlue'], vars),
        field(this, 'fill alpha', ['fillAlpha'], vars),
        field(this, 'stroke red', ['fillAlpha'], vars),
        field(this, 'stroke green', ['fillAlpha'], vars),
        field(this, 'stroke blue', ['fillAlpha'], vars),
        field(this, 'stroke alpha', ['fillAlpha'], vars),
        field(this, 'stroke width', ['strokeWidth'], vars),
        field(this, 'radians', ['radians'], vars),
        field(this, 'origin X', ['originX'], vars),
        field(this, 'origin Y', ['originY'], vars)
      ])
    }
  })
}
