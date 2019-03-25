const { h } = require('uzu')

function button (txt, onclick) {
  return h('button.bg-white.ba.b--black-10.f6', {
    on: {click: onclick}
  }, txt)
}

module.exports = button
