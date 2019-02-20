const { h } = require('uzu')
// const evaluate = require('./evaluate')

module.exports = field

function field (elem, prop, vars) {
  return h('fieldset', [
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
