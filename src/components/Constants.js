// A component representing a collection of constants
// These constants can be reused inside the layers
// They may represent speed, width, range, etc
// They are all numbers
const { Component, h } = require('uzu')

const button = require('./button')
const input = require('./input')
const icon = require('./icon')

// For assigning a unique name to new constants
let id = 0

function Constants (canvasState) {
  const initialConst = { name: 'c', value: 100 }
  return Component({
    canvasState,
    // Array and object for keeping the order and hashtable of the constants
    // keys are names and values are number values
    obj: { [initialConst.name]: initialConst.value },
    // Array of {name, value}
    arr: [initialConst.name],
    // The constants section is collapsible
    isOpen: true,
    // Any constants in an error state
    errors: {},

    appendConstant () {
      const name = 'c_' + id++
      const value = 0
      this.isOpen = true
      this.arr.push(name)
      this.obj[name] = value
      this._render()
    },

    setConstName (name, newName, idx) {
      if (!(name in this.obj)) return
      this.obj[newName] = this.obj[name]
      delete this.obj[name]
      this.arr[idx] = newName
      // Validate the name
      const isValid = isValidName(newName)
      if (!isValid) {
        this.errors[newName] = true
        console.error('Invalid name: ' + newName)
      } else {
        delete this.errors[newName]
      }
      this._render()
    },

    setConstVal (name, newVal) {
      if (!(name in this.obj)) return
      this.obj[name] = newVal
      this._render()
    },

    removeConstant (name) {
      const val = this.obj[name]
      const remove = () => {
        delete this.obj[name]
        this.arr = this.arr.filter(n => n !== name)
      }
      const readd = () => {
        this.obj[name] = val
        this.arr.push(name)
      }
      this.canvasState.pushToHistory({
        name: 'remove-constant',
        backwards: readd,
        forwards: remove
      })
      remove()
      this._render()
    },

    view () {
      const inputs = this.arr.map((name, idx) => {
        const value = this.obj[name]
        return h('div.flex.items-center.justify-between.w-100', [
          input({
            class: {
              'b--red': this.errors[name]
            },
            props: {
              type: 'text',
              value: name || ''
            },
            style: {
              width: '9rem'
            },
            on: {
              input: ev => {
                this.setConstName(name, ev.currentTarget.value, idx)
              }
            }
          }),
          input({
            props: {
              type: 'text',
              value: value || ''
            },
            style: {
              width: '7rem'
            },
            on: {
              input: ev => {
                this.setConstVal(name, ev.currentTarget.value)
              }
            }
          }),
          button('button', {
            on: { click: () => this.removeConstant(name) },
            class: {f7: true}
          }, [icon('trash-2')])
        ])
      })
      return h('div', [
        h('div.flex.justify-between.items-center', [
          h('span.b.pointer.sans-serif.white-90', {
            on: {
              click: () => {
                this.isOpen = !this.isOpen
                this._render()
              }
            }
          }, [
            h('span.mr1', this.isOpen ? '▲' : '▼'),
            'Constants'
          ]),
          button('button', {
            on: { click: ev => this.appendConstant() }
          }, [icon('plus'), ' Constant'])
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
