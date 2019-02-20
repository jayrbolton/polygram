const { Component, h } = require('uzu')

const field = require('../utils/field')
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
      rotate: 0,
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
      this.props.i = i
      const strokeWidth = this.props.strokeWidth
      const rotate = evaluate(this.props.rotate, this.props)
      const x = evaluate(this.props.x, this.props)
      const y = evaluate(this.props.y, this.props)
      ctx.save()
      if (rotate) {
        const rotx = x + evaluate(this.props.rotateX, this.props)
        const roty = y + evaluate(this.props.rotateY, this.props)
        ctx.translate(rotx, roty)
        ctx.rotate(rotate)
        ctx.translate(-rotx, -roty)
      }
      const scaleX = evaluate(this.props.scaleX, this.props)
      const scaleY = evaluate(this.props.scaleY, this.props)
      ctx.scale(scaleX, scaleY)
      ctx.fillStyle = 'rgba(' + this.props.fillRed + ', ' + this.props.fillGreen + ', ' + this.props.fillBlue + ', ' + this.props.fillAlpha + ')'
      ctx.fillRect(x, y, this.props.width, this.props.height)
      if (strokeWidth) {
        ctx.strokeStyle = 'rgba(' + this.props.strokeRed + ', ' + this.props.strokeGreen + ', ' + this.props.strokeBlue + ', ' + this.props.strokeAlpha + ')'
        ctx.lineWidth = strokeWidth
        ctx.strokeRect(x, y, this.props.width, this.props.height)
      }
      ctx.restore()
    },
    view () {
      if (!this.formOpen) return h('div', '')
      const vars = this.props
      return h('div', [
        field(this, 'copies', vars),
        field(this, 'width', vars),
        field(this, 'height', vars),
        field(this, 'x', vars),
        field(this, 'y', vars),
        field(this, 'fillRed', vars),
        field(this, 'fillGreen', vars),
        field(this, 'fillBlue', vars),
        field(this, 'fillAlpha', vars),
        field(this, 'strokeRed', vars),
        field(this, 'strokeGreen', vars),
        field(this, 'strokeBlue', vars),
        field(this, 'strokeAlpha', vars),
        field(this, 'strokeWidth', vars),
        field(this, 'rotate', vars),
        field(this, 'rotateX', vars),
        field(this, 'rotateY', vars),
        field(this, 'scaleX', vars),
        field(this, 'scaleY', vars)
      ])
    }
  })
}
