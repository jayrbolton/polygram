const { Component, h } = require('uzu')

module.exports = Repeater

// Plan
// - every rectangle component gets a scoped vars obj with the canvasstate as the prototype
// - inside a repeater, the rectangle gets 'i' set to 0..limit
// - evaluate should check the vars in the component itself, not in canvasstate

function Repeater () {
  return Component({
    elems: [],
    draw (ctx) {
    },
    view () {
      return h('div', [
      ])
    }
  })
}
