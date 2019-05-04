// A component representing a collection of constants
// These constants can be reused inside the layers
// They may represent speed, width, range, etc
// They are all numbers
const { Component, h } = require('uzu')

const button = require('./button')

// For assigning a unique name to new constants
let id = 0

function Constants () {
  const initialConst = { name: 'c', value: 100 }
  return Component({
    // Array and object for keeping the order and hashtable of the constants
    // keys are names and values are number values
    obj: { [initialConst.name]: initialConst.value },
    // Array of {name, value}
    arr: [initialConst.name],
    // The constants section is collapsible
    isOpen: true,

    appendConstant () {
      const name = 'c_' + id++
      const value = 0
      this.isOpen = true
      this.arr.push(name)
      this.obj[name] = value
      this._render()
    },

    setConstName (name, newName, idx) {
      newName = newName.trim()
      const isValid = isValidName(newName)
      if (!isValid) {
        this.errors[newName] = true
        console.error('Invalid name: ' + newName)
        return
      }
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

    removeConstant (name) {
      delete this.obj[name]
      this.arr = this.arr.filter(n => n !== name)
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
          }),
          button({
            on: { click: () => this.removeConstant(name) }
          }, 'X')
        ])
      })
      return h('div', [
        h('div.flex.justify-between.items-center', [
          h('span.code.b.pointer', {
            on: {
              click: () => {
                this.isOpen = !this.isOpen
                this._render()
              }
            }
          }, [
            h('span.mr1.black-60', this.isOpen ? '−' : '+'),
            'constants'
          ]),
          button({
            on: { click: ev => this.appendConstant() }
          }, '+ Constant')
        ]),
        h('div', {
          class: { dn: !this.isOpen }
        }, inputs)
      ])
    }
  })
}

function isValidName (name) {
  const regex = /^[A-Za-z_$][^\s]*$/
  if (!regex.test(name.trim())) return false
  const keywords = ['const', 'var', 'let', 'function', 'class', 'break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'finally', 'for', 'if', 'in', 'instanceof', 'new', 'return', 'switch', 'this', 'throw', 'try', 'typeof', 'void', 'while', 'with', 'true', 'false', 'export', 'extends', 'import', 'super', 'yield']
  if (keywords.indexOf(name) !== -1) return false
  return true
}

module.exports = { Constants }
