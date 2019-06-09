const { h } = require('uzu')

module.exports = function button (data, txt, tag = 'button') {
  if (!data.class) {
    data.class = {}
  }
  if (data.props && data.props.disabled) {
    data.class['gray'] = data.props && data.props.disabled
  } else {
    data.class['pointer'] = true
  }
  return h(tag + '.bg-white.ba.b--black-10.f6.dib.code.ma1.pa1.no-underline.black', data, txt)
}
