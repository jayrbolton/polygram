const field = require('../utils/field')
const { Component, h } = require('uzu')

module.exports = { Translation }

let id = 0

function Translation (canvasState) {
  return Component({
    x: () => 0,
    y: () => 0,
    name: 'translate-' + id++,
    formOpen: true,
    toggleFormOpen () {
      this.formOpen = !this.formOpen
      this._render()
    },
    draw (ctx) {
      ctx.translate(this.x(), this.y())
    },
    view () {
      return h('div', [
        field(this, 'x', canvasState),
        field(this, 'y', canvasState)
      ])
    }
  })
}
