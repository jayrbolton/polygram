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
    // keys are names and values are number values
    obj: { [initialConst.name]: initialConst.value },
    // Array of {name, value}
    arr: [initialConst.name],

    appendConstant () {
      const name = 'c_' + id++
      const value = 0
      this.arr.push(name)
      this.obj[name] = value
      this._render()
    },

    setConstName (name, newName, idx) {
      // Add a 500ms delay for setting this
      const updater = () => {
        if (!(name in this.obj)) return
        this.obj[newName] = this.obj[name]
        delete this.obj[name]
        this.arr[idx] = newName
        this._render()
      }
      if (this.renameTimeout) {
        clearTimeout(this.renameTimeout)
      }
      this.renameTimeout = setTimeout(updater, 500)
    },

    setConstVal (name, newVal) {
      if (!(name in this.obj)) return
      this.obj[name] = newVal
      this._render()
    },

    view () {
      const inputs = this.arr.map((name, idx) => {
        const value = this.obj[name]
        return h('div.flex', [
          h('input.w-30.code.f6.pa1', {
            props: {
              type: 'text',
              value: name
            },
            on: {
              input: ev => {
                this.setConstName(name, ev.currentTarget.value, idx)
              }
            }
          }),
          h('input.w-70.code.f6.pa1', {
            props: {
              type: 'text',
              value: value
            },
            on: {
              input: ev => {
                this.setConstVal(name, ev.currentTarget.value)
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
