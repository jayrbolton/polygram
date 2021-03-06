const { h } = require('uzu')
const input = require('./input')

module.exports = function field ({ type = 'text', classes = {}, value, oninput, label }) {
  const inp = input({
    class: classes,
    props: { type, value },
    on: { input: oninput }
  })
  return h('fieldset.bn.pa0.mv1.flex.items-center.justify-between', [
    h('label.sans-serif.white-60.db', { style: { userSelect: 'none' } }, label),
    h('div', { css: { root: ['float: right'] } }, inp)
  ])
}
