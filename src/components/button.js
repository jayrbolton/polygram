const { h } = require('uzu')

function button (txt, onclick) {
  return h('button.bg-white.ba.b--black-10.f6.pointer.dib.code', {
    on: { click: onclick }
  }, txt)
}

module.exports = button
