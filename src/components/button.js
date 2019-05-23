const { h } = require('uzu')

module.exports = function button (data, txt, tag = 'button') {
  return h(tag + '.bg-white.ba.b--black-10.f6.pointer.dib.code.ma1.pa1.no-underline.black', data, txt)
}
