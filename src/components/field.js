const { h } = require('uzu')
const fieldset = require('./fieldset')

module.exports = function field (elem, label, prop, vars) {
  const inputs = h('input.w-100.code.f6.pa1', {
    props: { type: 'text', value: elem.props[prop] },
    on: {
      input: ev => {
        const val = ev.currentTarget.value
        elem.props[prop] = val
      }
    }
  })
  return fieldset([
    h('label.code.dib.mb1', label),
    h('div', { css: { root: [ 'float: right' ] } }, inputs)
  ])
}
