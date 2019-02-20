const field = require('../utils/field')
const { Component, h } = require('uzu')

module.exports = { Rotation }

let id = 0

function Rotation (canvasState) {
  return Component({
    name: 'rot-' + id++,
    radians: () => 0.1,
    formOpen: true,
    elems: {},
    elemOrder: [],
    toggleFormOpen () {
      this.formOpen = !this.formOpen
      this._render()
    },
    draw (ctx) {
      ctx.rotate(this.radians())
    },
    view () {
      return h('div', [
        field(this, 'radians', canvasState)
      ])
    }
  })
}
