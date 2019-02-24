const { h } = require('uzu')

module.exports = fieldset

function fieldset (children) {
  return h('fieldset', {
    css: {
      root: [
        'border: none',
        'padding: 0.2rem 0 0.2rem 0'
      ],
      ' > label': [
        'width: 6rem',
        'margin-right: 1rem',
        'display: inline-block'
      ],
      ' > input': [
        'width: 6rem'
      ]
    }
  }, children)
}
