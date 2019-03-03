const { Component, h } = require('uzu')

const fields = require('./field')
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
        fields(this, 'copies', ['copies'], vars),
        fields(this, 'width & height', ['width', 'height'], vars),
        fields(this, 'x, y', ['x', 'y'], vars),
        fields(this, 'fill RGBA', ['fillRed', 'fillGreen', 'fillBlue', 'fillAlpha'], vars),
        fields(this, 'stroke RGBA', ['strokeRed', 'strokeGreen', 'strokeBlue', 'strokeAlpha'], vars),
        fields(this, 'stroke width', ['strokeWidth'], vars),
        fields(this, 'radians', ['radians'], vars),
        fields(this, 'origin XY', ['rotateX', 'rotateY'], vars),
        fields(this, 'scale XY', ['scaleX', 'scaleY'], vars)
      ])
    }
  })
}
