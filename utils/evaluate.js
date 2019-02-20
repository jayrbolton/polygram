module.exports = evaluate

// We use `with` and `eval` because it's easy and simple and the security 
// This has security concerns. Eg, if you load someone else's canvas, and they
// have malicious code in some field, this will just eval..
// TODO make secure..
function evaluate (str, vars) {
  let result
  with (vars) {
    try {
      result = eval(str)
    } catch (e) { }
  }
  return result
}

window.evaluate = evaluate
