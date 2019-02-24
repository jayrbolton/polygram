const { h } = require('uzu')
const fieldset = require('./fieldset')

module.exports = field

function field (elem, prop, vars) {
  return fieldset([
    h('label', prop),
    h('input', {
      props: {
        type: 'text',
        value: elem.props[prop]
      },
      on: {
        input: ev => {
          const val = ev.currentTarget.value
          elem.props[prop] = val
        }
      }
    })
  ])
}
