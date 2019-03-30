
// Show some virtual dom content only if the predicate is truthy

module.exports = showIf

function showIf (pred, fn) {
  if (pred) {
    return fn()
  } else {
    return ''
  }
}
