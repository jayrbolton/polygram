const { h } = require('uzu')

module.exports = fieldset

function fieldset (children) {
  return h('fieldset.bn.pa0.mb2', {
    css: {
      root: [
        'overflow: auto',
        'border: none',
        'padding: 0.2rem 0 0.2rem 0'
      ],
      ' > label': [
        'display: inline-block'
      ],
      ' input': [
        'width: 90%',
        'margin-left: 0.5rem'
      ],
      ' > .inputs': [
      ]
    }
  }, children)
}
