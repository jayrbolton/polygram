const { h } = require('uzu')
const fieldset = require('./fieldset')

module.exports = fields

function fields (elem, label, props, vars) {
  const inputs = props.map(p => {
    return h('input', {
      props: { type: 'text', value: elem.props[p] },
      on: {
        input: ev => {
          const val = ev.currentTarget.value
          elem.props[p] = val
        }
      }
    })
  })
  return fieldset([
    h('label', label),
    h('div', { css: { root: [ 'float: right' ] } }, inputs)
  ])
}
