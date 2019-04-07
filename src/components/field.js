const { h } = require('uzu')
const fieldset = require('./fieldset')

module.exports = function field ({ type = 'text', value, oninput, label }) {
  const inp = h('input.w-100.code.f6.pa1', {
    props: { type: 'text', value },
    on: { input: oninput }
  })
  return fieldset([
    h('label.code.dib.mb1', label),
    h('div', { css: { root: [ 'float: right' ] } }, inp)
  ])
}
