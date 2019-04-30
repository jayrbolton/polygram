// A component representing a collection of constants
// These constants can be reused inside the layers
// They may represent speed, width, range, etc
// They are all numbers
const { Component, h } = require('uzu')

const button = require('./button')

// For assigning a unique name to new constants
let id = 0

// TODO error handling on duplicate constant names
// TODO validate for variable naming syntax errors (cannot be called 'const'!)

function Constants () {
  const initialConst = { name: 'c', value: 100 }
  return Component({
    // Array and object for keeping the order and hashtable of the constants
    obj: { [initialConst.name]: initialConst },
    arr: [initialConst],

    appendConstant () {
      const constant = { name: 'c_' + id++, value: 0 }
      this.arr.push(constant)
      this.obj[constant.name] = constant.value
      this._render()
    },

    setConstName (name, newName) {
      if (!(name in this.obj)) return
      const c = this.obj[name]
      c.name = newName
      this.obj[newName] = c
      delete this.obj[name]
      this._render()
    },

    setConstVal (name, newVal) {
      if (!(name in this.obj)) return
      const c = this.obj[name]
      c.value = newVal
      this._render()
    },

    view () {
      const inputs = this.arr.map(constant => {
        return h('div.flex', [
          h('input.w-100.code.f6.pa1', {
            props: {
              type: 'text',
              value: constant.name
            },
            on: {
              input: ev => {
                this.setConstName(constant.name, ev.currentTarget.value)
              }
            }
          }),
          h('input.w-100.code.f6.pa1', {
            props: {
              type: 'number',
              value: constant.value
            },
            on: {
              input: ev => {
                this.setConstVal(constant.name, ev.currentTarget.value)
              }
            }
          })
        ])
      })
      return h('div', [
        h('div.flex.justify-between.items-center', [
          h('span.code', 'constants'),
          button({
            on: {
              click: ev => {
                this.appendConstant()
              }
            }
          }, 'Add another')
        ]),
        h('div', inputs)
      ])
    }
  })
}

module.exports = { Constants }
