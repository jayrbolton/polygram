const { h } = require('uzu')
const fieldset = require('./fieldset')
const input = require('./input')

module.exports = function field ({ type = 'text', classes = {}, value, oninput, label }) {
  const inp = input({
    class: classes,
    props: { type, value },
    on: { input: oninput }
  })
  return fieldset([
    h('label.sans-serif.dib.mb1.white-80', { style: { userSelect: 'none' } }, label),
    h('div', { css: { root: ['float: right'] } }, inp)
  ])
}
