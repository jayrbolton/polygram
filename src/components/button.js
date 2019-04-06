const { h } = require('uzu')

module.exports = function button (txt, onclick) {
  return h('button.bg-white.ba.b--black-10.f6.pointer.dib.code.ma1.pa1', {
    on: { click: onclick }
  }, txt)
}
