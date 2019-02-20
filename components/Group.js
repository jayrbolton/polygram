const { Component, h } = require('uzu')

const { Rectangle } = require('./Rectangle')
const { Rotation } = require('./Rotation')
const { Translation } = require('./Translation')

const newElemButton = require('../utils/newElemButton')

module.exports = { Group }

let id = 0

function Group (canvasState) {
  return Component({
    name: 'group-' + id++,
    formOpen: true,
    elems: {
      time: { value: () => Date.now() }
    },
    elemOrder: [],
    toggleFormOpen () {
      this.formOpen = !this.formOpen
      this._render()
    },
    draw (ctx) {
      ctx.save()
      this.elemOrder.forEach(cmp => cmp.draw(ctx))
      ctx.restore()
    },
    view () {
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
      return h('div', [
        h('div', childViews),
        newElemButton(this, Rectangle, 'rectangle'),
        newElemButton(this, Rotation, 'rotation'),
        newElemButton(this, Translation, 'translation')
      ])
    }
  })
}
