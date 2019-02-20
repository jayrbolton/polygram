const field = require('../utils/field')
const { Component, h } = require('uzu')

module.exports = { Transform }

let id = 0

function Transform (canvasState) {
  return Component({
    name: 'transform-' + id++,
    horizontalScale: () => 1,
    horizontalSkew: () => 0,
    horizontalMove: () => 0,
    verticalSkew: () => 0,
    verticalScale: () => 1,
    verticalMove: () => 0,
    radians: () => 0.1,
    formOpen: true,
    toggleFormOpen () {
      this.formOpen = !this.formOpen
      this._render()
    },
    draw (ctx) {
      ctx.setTransform(
        this.horizontalScale(),
        this.horizontalSkew(),
        this.verticalSkew(),
        this.verticalScale(),
        this.horizontalMove(),
        this.verticalMove()
      )
    },
    view () {
      /*
      let childViews = this.elemOrder.map(elem => {
        return h('div', [
          elem.view(),
          h('button', {
            on: {
              click: () => {
                delete this.elems[elem.name]
                this.elemOrder = this.elemOrder.filter(e => e.name !== elem.name)
                this._render()
              }
            }
          }, ['remove ', elem.name])
        ])
      })
      */
      return h('div', [
        field(this, 'horizontalScale', canvasState),
        field(this, 'horizontalSkew', canvasState),
        field(this, 'horizontalMove', canvasState),
        field(this, 'verticalSkew', canvasState),
        field(this, 'verticalScale', canvasState),
        field(this, 'verticalMove', canvasState)
      ])
    }
  })
}
