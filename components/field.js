const { h } = require('uzu')
const fieldset = require('./fieldset')

module.exports = field

function field (elem, label, prop, vars) {
  const inputs = h('input', {
    props: { type: 'text', value: elem.props[prop] },
    on: {
      input: ev => {
        const val = ev.currentTarget.value
        elem.props[prop] = val
      }
    }
  })
  return fieldset([
    h('label', label),
    h('div', { css: { root: [ 'float: right' ] } }, inputs)
  ])
}
