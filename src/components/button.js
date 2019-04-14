const { h } = require('uzu')

module.exports = function button (data, txt) {
  return h('button.bg-white.ba.b--black-10.f6.pointer.dib.code.ma1.pa1', data, txt)
}
