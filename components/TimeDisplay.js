const { Component, h } = require('uzu')

module.exports = { TimeDisplay }

function TimeDisplay () {
  const time = Component({
    value: () => Date.now(),
    view () {
      return h('div', [
        'time: ',
        Date.now()
      ])
    }
  })
  setInterval(() => time._render(), 1000)
  return time
}
