(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  for (var i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":1,"ieee754":3}],3:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vnode_1 = require("./vnode");
var is = require("./is");
function addNS(data, children, sel) {
    data.ns = 'http://www.w3.org/2000/svg';
    if (sel !== 'foreignObject' && children !== undefined) {
        for (var i = 0; i < children.length; ++i) {
            var childData = children[i].data;
            if (childData !== undefined) {
                addNS(childData, children[i].children, children[i].sel);
            }
        }
    }
}
function h(sel, b, c) {
    var data = {}, children, text, i;
    if (c !== undefined) {
        data = b;
        if (is.array(c)) {
            children = c;
        }
        else if (is.primitive(c)) {
            text = c;
        }
        else if (c && c.sel) {
            children = [c];
        }
    }
    else if (b !== undefined) {
        if (is.array(b)) {
            children = b;
        }
        else if (is.primitive(b)) {
            text = b;
        }
        else if (b && b.sel) {
            children = [b];
        }
        else {
            data = b;
        }
    }
    if (children !== undefined) {
        for (i = 0; i < children.length; ++i) {
            if (is.primitive(children[i]))
                children[i] = vnode_1.vnode(undefined, undefined, undefined, children[i], undefined);
        }
    }
    if (sel[0] === 's' && sel[1] === 'v' && sel[2] === 'g' &&
        (sel.length === 3 || sel[3] === '.' || sel[3] === '#')) {
        addNS(data, children, sel);
    }
    return vnode_1.vnode(sel, data, children, text, undefined);
}
exports.h = h;
;
exports.default = h;

},{"./is":7,"./vnode":16}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function createElement(tagName) {
    return document.createElement(tagName);
}
function createElementNS(namespaceURI, qualifiedName) {
    return document.createElementNS(namespaceURI, qualifiedName);
}
function createTextNode(text) {
    return document.createTextNode(text);
}
function createComment(text) {
    return document.createComment(text);
}
function insertBefore(parentNode, newNode, referenceNode) {
    parentNode.insertBefore(newNode, referenceNode);
}
function removeChild(node, child) {
    node.removeChild(child);
}
function appendChild(node, child) {
    node.appendChild(child);
}
function parentNode(node) {
    return node.parentNode;
}
function nextSibling(node) {
    return node.nextSibling;
}
function tagName(elm) {
    return elm.tagName;
}
function setTextContent(node, text) {
    node.textContent = text;
}
function getTextContent(node) {
    return node.textContent;
}
function isElement(node) {
    return node.nodeType === 1;
}
function isText(node) {
    return node.nodeType === 3;
}
function isComment(node) {
    return node.nodeType === 8;
}
exports.htmlDomApi = {
    createElement: createElement,
    createElementNS: createElementNS,
    createTextNode: createTextNode,
    createComment: createComment,
    insertBefore: insertBefore,
    removeChild: removeChild,
    appendChild: appendChild,
    parentNode: parentNode,
    nextSibling: nextSibling,
    tagName: tagName,
    setTextContent: setTextContent,
    getTextContent: getTextContent,
    isElement: isElement,
    isText: isText,
    isComment: isComment,
};
exports.default = exports.htmlDomApi;

},{}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.array = Array.isArray;
function primitive(s) {
    return typeof s === 'string' || typeof s === 'number';
}
exports.primitive = primitive;

},{}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var xlinkNS = 'http://www.w3.org/1999/xlink';
var xmlNS = 'http://www.w3.org/XML/1998/namespace';
var colonChar = 58;
var xChar = 120;
function updateAttrs(oldVnode, vnode) {
    var key, elm = vnode.elm, oldAttrs = oldVnode.data.attrs, attrs = vnode.data.attrs;
    if (!oldAttrs && !attrs)
        return;
    if (oldAttrs === attrs)
        return;
    oldAttrs = oldAttrs || {};
    attrs = attrs || {};
    // update modified attributes, add new attributes
    for (key in attrs) {
        var cur = attrs[key];
        var old = oldAttrs[key];
        if (old !== cur) {
            if (cur === true) {
                elm.setAttribute(key, "");
            }
            else if (cur === false) {
                elm.removeAttribute(key);
            }
            else {
                if (key.charCodeAt(0) !== xChar) {
                    elm.setAttribute(key, cur);
                }
                else if (key.charCodeAt(3) === colonChar) {
                    // Assume xml namespace
                    elm.setAttributeNS(xmlNS, key, cur);
                }
                else if (key.charCodeAt(5) === colonChar) {
                    // Assume xlink namespace
                    elm.setAttributeNS(xlinkNS, key, cur);
                }
                else {
                    elm.setAttribute(key, cur);
                }
            }
        }
    }
    // remove removed attributes
    // use `in` operator since the previous `for` iteration uses it (.i.e. add even attributes with undefined value)
    // the other option is to remove all attributes with value == undefined
    for (key in oldAttrs) {
        if (!(key in attrs)) {
            elm.removeAttribute(key);
        }
    }
}
exports.attributesModule = { create: updateAttrs, update: updateAttrs };
exports.default = exports.attributesModule;

},{}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function updateClass(oldVnode, vnode) {
    var cur, name, elm = vnode.elm, oldClass = oldVnode.data.class, klass = vnode.data.class;
    if (!oldClass && !klass)
        return;
    if (oldClass === klass)
        return;
    oldClass = oldClass || {};
    klass = klass || {};
    for (name in oldClass) {
        if (!klass[name]) {
            elm.classList.remove(name);
        }
    }
    for (name in klass) {
        cur = klass[name];
        if (cur !== oldClass[name]) {
            elm.classList[cur ? 'add' : 'remove'](name);
        }
    }
}
exports.classModule = { create: updateClass, update: updateClass };
exports.default = exports.classModule;

},{}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var CAPS_REGEX = /[A-Z]/g;
function updateDataset(oldVnode, vnode) {
    var elm = vnode.elm, oldDataset = oldVnode.data.dataset, dataset = vnode.data.dataset, key;
    if (!oldDataset && !dataset)
        return;
    if (oldDataset === dataset)
        return;
    oldDataset = oldDataset || {};
    dataset = dataset || {};
    var d = elm.dataset;
    for (key in oldDataset) {
        if (!dataset[key]) {
            if (d) {
                if (key in d) {
                    delete d[key];
                }
            }
            else {
                elm.removeAttribute('data-' + key.replace(CAPS_REGEX, '-$&').toLowerCase());
            }
        }
    }
    for (key in dataset) {
        if (oldDataset[key] !== dataset[key]) {
            if (d) {
                d[key] = dataset[key];
            }
            else {
                elm.setAttribute('data-' + key.replace(CAPS_REGEX, '-$&').toLowerCase(), dataset[key]);
            }
        }
    }
}
exports.datasetModule = { create: updateDataset, update: updateDataset };
exports.default = exports.datasetModule;

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function invokeHandler(handler, vnode, event) {
    if (typeof handler === "function") {
        // call function handler
        handler.call(vnode, event, vnode);
    }
    else if (typeof handler === "object") {
        // call handler with arguments
        if (typeof handler[0] === "function") {
            // special case for single argument for performance
            if (handler.length === 2) {
                handler[0].call(vnode, handler[1], event, vnode);
            }
            else {
                var args = handler.slice(1);
                args.push(event);
                args.push(vnode);
                handler[0].apply(vnode, args);
            }
        }
        else {
            // call multiple handlers
            for (var i = 0; i < handler.length; i++) {
                invokeHandler(handler[i], vnode, event);
            }
        }
    }
}
function handleEvent(event, vnode) {
    var name = event.type, on = vnode.data.on;
    // call event handler(s) if exists
    if (on && on[name]) {
        invokeHandler(on[name], vnode, event);
    }
}
function createListener() {
    return function handler(event) {
        handleEvent(event, handler.vnode);
    };
}
function updateEventListeners(oldVnode, vnode) {
    var oldOn = oldVnode.data.on, oldListener = oldVnode.listener, oldElm = oldVnode.elm, on = vnode && vnode.data.on, elm = (vnode && vnode.elm), name;
    // optimization for reused immutable handlers
    if (oldOn === on) {
        return;
    }
    // remove existing listeners which no longer used
    if (oldOn && oldListener) {
        // if element changed or deleted we remove all existing listeners unconditionally
        if (!on) {
            for (name in oldOn) {
                // remove listener if element was changed or existing listeners removed
                oldElm.removeEventListener(name, oldListener, false);
            }
        }
        else {
            for (name in oldOn) {
                // remove listener if existing listener removed
                if (!on[name]) {
                    oldElm.removeEventListener(name, oldListener, false);
                }
            }
        }
    }
    // add new listeners which has not already attached
    if (on) {
        // reuse existing listener or create new
        var listener = vnode.listener = oldVnode.listener || createListener();
        // update vnode for listener
        listener.vnode = vnode;
        // if element changed or added we add all needed listeners unconditionally
        if (!oldOn) {
            for (name in on) {
                // add listener if element was changed or new listeners added
                elm.addEventListener(name, listener, false);
            }
        }
        else {
            for (name in on) {
                // add listener if new listener added
                if (!oldOn[name]) {
                    elm.addEventListener(name, listener, false);
                }
            }
        }
    }
}
exports.eventListenersModule = {
    create: updateEventListeners,
    update: updateEventListeners,
    destroy: updateEventListeners
};
exports.default = exports.eventListenersModule;

},{}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function updateProps(oldVnode, vnode) {
    var key, cur, old, elm = vnode.elm, oldProps = oldVnode.data.props, props = vnode.data.props;
    if (!oldProps && !props)
        return;
    if (oldProps === props)
        return;
    oldProps = oldProps || {};
    props = props || {};
    for (key in oldProps) {
        if (!props[key]) {
            delete elm[key];
        }
    }
    for (key in props) {
        cur = props[key];
        old = oldProps[key];
        if (old !== cur && (key !== 'value' || elm[key] !== cur)) {
            elm[key] = cur;
        }
    }
}
exports.propsModule = { create: updateProps, update: updateProps };
exports.default = exports.propsModule;

},{}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Bindig `requestAnimationFrame` like this fixes a bug in IE/Edge. See #360 and #409.
var raf = (typeof window !== 'undefined' && (window.requestAnimationFrame).bind(window)) || setTimeout;
var nextFrame = function (fn) { raf(function () { raf(fn); }); };
var reflowForced = false;
function setNextFrame(obj, prop, val) {
    nextFrame(function () { obj[prop] = val; });
}
function updateStyle(oldVnode, vnode) {
    var cur, name, elm = vnode.elm, oldStyle = oldVnode.data.style, style = vnode.data.style;
    if (!oldStyle && !style)
        return;
    if (oldStyle === style)
        return;
    oldStyle = oldStyle || {};
    style = style || {};
    var oldHasDel = 'delayed' in oldStyle;
    for (name in oldStyle) {
        if (!style[name]) {
            if (name[0] === '-' && name[1] === '-') {
                elm.style.removeProperty(name);
            }
            else {
                elm.style[name] = '';
            }
        }
    }
    for (name in style) {
        cur = style[name];
        if (name === 'delayed' && style.delayed) {
            for (var name2 in style.delayed) {
                cur = style.delayed[name2];
                if (!oldHasDel || cur !== oldStyle.delayed[name2]) {
                    setNextFrame(elm.style, name2, cur);
                }
            }
        }
        else if (name !== 'remove' && cur !== oldStyle[name]) {
            if (name[0] === '-' && name[1] === '-') {
                elm.style.setProperty(name, cur);
            }
            else {
                elm.style[name] = cur;
            }
        }
    }
}
function applyDestroyStyle(vnode) {
    var style, name, elm = vnode.elm, s = vnode.data.style;
    if (!s || !(style = s.destroy))
        return;
    for (name in style) {
        elm.style[name] = style[name];
    }
}
function applyRemoveStyle(vnode, rm) {
    var s = vnode.data.style;
    if (!s || !s.remove) {
        rm();
        return;
    }
    if (!reflowForced) {
        getComputedStyle(document.body).transform;
        reflowForced = true;
    }
    var name, elm = vnode.elm, i = 0, compStyle, style = s.remove, amount = 0, applied = [];
    for (name in style) {
        applied.push(name);
        elm.style[name] = style[name];
    }
    compStyle = getComputedStyle(elm);
    var props = compStyle['transition-property'].split(', ');
    for (; i < props.length; ++i) {
        if (applied.indexOf(props[i]) !== -1)
            amount++;
    }
    elm.addEventListener('transitionend', function (ev) {
        if (ev.target === elm)
            --amount;
        if (amount === 0)
            rm();
    });
}
function forceReflow() {
    reflowForced = false;
}
exports.styleModule = {
    pre: forceReflow,
    create: updateStyle,
    update: updateStyle,
    destroy: applyDestroyStyle,
    remove: applyRemoveStyle
};
exports.default = exports.styleModule;

},{}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vnode_1 = require("./vnode");
var is = require("./is");
var htmldomapi_1 = require("./htmldomapi");
function isUndef(s) { return s === undefined; }
function isDef(s) { return s !== undefined; }
var emptyNode = vnode_1.default('', {}, [], undefined, undefined);
function sameVnode(vnode1, vnode2) {
    return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel;
}
function isVnode(vnode) {
    return vnode.sel !== undefined;
}
function createKeyToOldIdx(children, beginIdx, endIdx) {
    var i, map = {}, key, ch;
    for (i = beginIdx; i <= endIdx; ++i) {
        ch = children[i];
        if (ch != null) {
            key = ch.key;
            if (key !== undefined)
                map[key] = i;
        }
    }
    return map;
}
var hooks = ['create', 'update', 'remove', 'destroy', 'pre', 'post'];
var h_1 = require("./h");
exports.h = h_1.h;
var thunk_1 = require("./thunk");
exports.thunk = thunk_1.thunk;
function init(modules, domApi) {
    var i, j, cbs = {};
    var api = domApi !== undefined ? domApi : htmldomapi_1.default;
    for (i = 0; i < hooks.length; ++i) {
        cbs[hooks[i]] = [];
        for (j = 0; j < modules.length; ++j) {
            var hook = modules[j][hooks[i]];
            if (hook !== undefined) {
                cbs[hooks[i]].push(hook);
            }
        }
    }
    function emptyNodeAt(elm) {
        var id = elm.id ? '#' + elm.id : '';
        var c = elm.className ? '.' + elm.className.split(' ').join('.') : '';
        return vnode_1.default(api.tagName(elm).toLowerCase() + id + c, {}, [], undefined, elm);
    }
    function createRmCb(childElm, listeners) {
        return function rmCb() {
            if (--listeners === 0) {
                var parent_1 = api.parentNode(childElm);
                api.removeChild(parent_1, childElm);
            }
        };
    }
    function createElm(vnode, insertedVnodeQueue) {
        var i, data = vnode.data;
        if (data !== undefined) {
            if (isDef(i = data.hook) && isDef(i = i.init)) {
                i(vnode);
                data = vnode.data;
            }
        }
        var children = vnode.children, sel = vnode.sel;
        if (sel === '!') {
            if (isUndef(vnode.text)) {
                vnode.text = '';
            }
            vnode.elm = api.createComment(vnode.text);
        }
        else if (sel !== undefined) {
            // Parse selector
            var hashIdx = sel.indexOf('#');
            var dotIdx = sel.indexOf('.', hashIdx);
            var hash = hashIdx > 0 ? hashIdx : sel.length;
            var dot = dotIdx > 0 ? dotIdx : sel.length;
            var tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel;
            var elm = vnode.elm = isDef(data) && isDef(i = data.ns) ? api.createElementNS(i, tag)
                : api.createElement(tag);
            if (hash < dot)
                elm.setAttribute('id', sel.slice(hash + 1, dot));
            if (dotIdx > 0)
                elm.setAttribute('class', sel.slice(dot + 1).replace(/\./g, ' '));
            for (i = 0; i < cbs.create.length; ++i)
                cbs.create[i](emptyNode, vnode);
            if (is.array(children)) {
                for (i = 0; i < children.length; ++i) {
                    var ch = children[i];
                    if (ch != null) {
                        api.appendChild(elm, createElm(ch, insertedVnodeQueue));
                    }
                }
            }
            else if (is.primitive(vnode.text)) {
                api.appendChild(elm, api.createTextNode(vnode.text));
            }
            i = vnode.data.hook; // Reuse variable
            if (isDef(i)) {
                if (i.create)
                    i.create(emptyNode, vnode);
                if (i.insert)
                    insertedVnodeQueue.push(vnode);
            }
        }
        else {
            vnode.elm = api.createTextNode(vnode.text);
        }
        return vnode.elm;
    }
    function addVnodes(parentElm, before, vnodes, startIdx, endIdx, insertedVnodeQueue) {
        for (; startIdx <= endIdx; ++startIdx) {
            var ch = vnodes[startIdx];
            if (ch != null) {
                api.insertBefore(parentElm, createElm(ch, insertedVnodeQueue), before);
            }
        }
    }
    function invokeDestroyHook(vnode) {
        var i, j, data = vnode.data;
        if (data !== undefined) {
            if (isDef(i = data.hook) && isDef(i = i.destroy))
                i(vnode);
            for (i = 0; i < cbs.destroy.length; ++i)
                cbs.destroy[i](vnode);
            if (vnode.children !== undefined) {
                for (j = 0; j < vnode.children.length; ++j) {
                    i = vnode.children[j];
                    if (i != null && typeof i !== "string") {
                        invokeDestroyHook(i);
                    }
                }
            }
        }
    }
    function removeVnodes(parentElm, vnodes, startIdx, endIdx) {
        for (; startIdx <= endIdx; ++startIdx) {
            var i_1 = void 0, listeners = void 0, rm = void 0, ch = vnodes[startIdx];
            if (ch != null) {
                if (isDef(ch.sel)) {
                    invokeDestroyHook(ch);
                    listeners = cbs.remove.length + 1;
                    rm = createRmCb(ch.elm, listeners);
                    for (i_1 = 0; i_1 < cbs.remove.length; ++i_1)
                        cbs.remove[i_1](ch, rm);
                    if (isDef(i_1 = ch.data) && isDef(i_1 = i_1.hook) && isDef(i_1 = i_1.remove)) {
                        i_1(ch, rm);
                    }
                    else {
                        rm();
                    }
                }
                else {
                    api.removeChild(parentElm, ch.elm);
                }
            }
        }
    }
    function updateChildren(parentElm, oldCh, newCh, insertedVnodeQueue) {
        var oldStartIdx = 0, newStartIdx = 0;
        var oldEndIdx = oldCh.length - 1;
        var oldStartVnode = oldCh[0];
        var oldEndVnode = oldCh[oldEndIdx];
        var newEndIdx = newCh.length - 1;
        var newStartVnode = newCh[0];
        var newEndVnode = newCh[newEndIdx];
        var oldKeyToIdx;
        var idxInOld;
        var elmToMove;
        var before;
        while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
            if (oldStartVnode == null) {
                oldStartVnode = oldCh[++oldStartIdx]; // Vnode might have been moved left
            }
            else if (oldEndVnode == null) {
                oldEndVnode = oldCh[--oldEndIdx];
            }
            else if (newStartVnode == null) {
                newStartVnode = newCh[++newStartIdx];
            }
            else if (newEndVnode == null) {
                newEndVnode = newCh[--newEndIdx];
            }
            else if (sameVnode(oldStartVnode, newStartVnode)) {
                patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue);
                oldStartVnode = oldCh[++oldStartIdx];
                newStartVnode = newCh[++newStartIdx];
            }
            else if (sameVnode(oldEndVnode, newEndVnode)) {
                patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue);
                oldEndVnode = oldCh[--oldEndIdx];
                newEndVnode = newCh[--newEndIdx];
            }
            else if (sameVnode(oldStartVnode, newEndVnode)) {
                patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue);
                api.insertBefore(parentElm, oldStartVnode.elm, api.nextSibling(oldEndVnode.elm));
                oldStartVnode = oldCh[++oldStartIdx];
                newEndVnode = newCh[--newEndIdx];
            }
            else if (sameVnode(oldEndVnode, newStartVnode)) {
                patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue);
                api.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
                oldEndVnode = oldCh[--oldEndIdx];
                newStartVnode = newCh[++newStartIdx];
            }
            else {
                if (oldKeyToIdx === undefined) {
                    oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
                }
                idxInOld = oldKeyToIdx[newStartVnode.key];
                if (isUndef(idxInOld)) {
                    api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
                    newStartVnode = newCh[++newStartIdx];
                }
                else {
                    elmToMove = oldCh[idxInOld];
                    if (elmToMove.sel !== newStartVnode.sel) {
                        api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm);
                    }
                    else {
                        patchVnode(elmToMove, newStartVnode, insertedVnodeQueue);
                        oldCh[idxInOld] = undefined;
                        api.insertBefore(parentElm, elmToMove.elm, oldStartVnode.elm);
                    }
                    newStartVnode = newCh[++newStartIdx];
                }
            }
        }
        if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
            if (oldStartIdx > oldEndIdx) {
                before = newCh[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].elm;
                addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue);
            }
            else {
                removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
            }
        }
    }
    function patchVnode(oldVnode, vnode, insertedVnodeQueue) {
        var i, hook;
        if (isDef(i = vnode.data) && isDef(hook = i.hook) && isDef(i = hook.prepatch)) {
            i(oldVnode, vnode);
        }
        var elm = vnode.elm = oldVnode.elm;
        var oldCh = oldVnode.children;
        var ch = vnode.children;
        if (oldVnode === vnode)
            return;
        if (vnode.data !== undefined) {
            for (i = 0; i < cbs.update.length; ++i)
                cbs.update[i](oldVnode, vnode);
            i = vnode.data.hook;
            if (isDef(i) && isDef(i = i.update))
                i(oldVnode, vnode);
        }
        if (isUndef(vnode.text)) {
            if (isDef(oldCh) && isDef(ch)) {
                if (oldCh !== ch)
                    updateChildren(elm, oldCh, ch, insertedVnodeQueue);
            }
            else if (isDef(ch)) {
                if (isDef(oldVnode.text))
                    api.setTextContent(elm, '');
                addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue);
            }
            else if (isDef(oldCh)) {
                removeVnodes(elm, oldCh, 0, oldCh.length - 1);
            }
            else if (isDef(oldVnode.text)) {
                api.setTextContent(elm, '');
            }
        }
        else if (oldVnode.text !== vnode.text) {
            if (isDef(oldCh)) {
                removeVnodes(elm, oldCh, 0, oldCh.length - 1);
            }
            api.setTextContent(elm, vnode.text);
        }
        if (isDef(hook) && isDef(i = hook.postpatch)) {
            i(oldVnode, vnode);
        }
    }
    return function patch(oldVnode, vnode) {
        var i, elm, parent;
        var insertedVnodeQueue = [];
        for (i = 0; i < cbs.pre.length; ++i)
            cbs.pre[i]();
        if (!isVnode(oldVnode)) {
            oldVnode = emptyNodeAt(oldVnode);
        }
        if (sameVnode(oldVnode, vnode)) {
            patchVnode(oldVnode, vnode, insertedVnodeQueue);
        }
        else {
            elm = oldVnode.elm;
            parent = api.parentNode(elm);
            createElm(vnode, insertedVnodeQueue);
            if (parent !== null) {
                api.insertBefore(parent, vnode.elm, api.nextSibling(elm));
                removeVnodes(parent, [oldVnode], 0, 0);
            }
        }
        for (i = 0; i < insertedVnodeQueue.length; ++i) {
            insertedVnodeQueue[i].data.hook.insert(insertedVnodeQueue[i]);
        }
        for (i = 0; i < cbs.post.length; ++i)
            cbs.post[i]();
        return vnode;
    };
}
exports.init = init;

},{"./h":5,"./htmldomapi":6,"./is":7,"./thunk":15,"./vnode":16}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var h_1 = require("./h");
function copyToThunk(vnode, thunk) {
    thunk.elm = vnode.elm;
    vnode.data.fn = thunk.data.fn;
    vnode.data.args = thunk.data.args;
    thunk.data = vnode.data;
    thunk.children = vnode.children;
    thunk.text = vnode.text;
    thunk.elm = vnode.elm;
}
function init(thunk) {
    var cur = thunk.data;
    var vnode = cur.fn.apply(undefined, cur.args);
    copyToThunk(vnode, thunk);
}
function prepatch(oldVnode, thunk) {
    var i, old = oldVnode.data, cur = thunk.data;
    var oldArgs = old.args, args = cur.args;
    if (old.fn !== cur.fn || oldArgs.length !== args.length) {
        copyToThunk(cur.fn.apply(undefined, args), thunk);
        return;
    }
    for (i = 0; i < args.length; ++i) {
        if (oldArgs[i] !== args[i]) {
            copyToThunk(cur.fn.apply(undefined, args), thunk);
            return;
        }
    }
    copyToThunk(oldVnode, thunk);
}
exports.thunk = function thunk(sel, key, fn, args) {
    if (args === undefined) {
        args = fn;
        fn = key;
        key = undefined;
    }
    return h_1.h(sel, {
        key: key,
        hook: { init: init, prepatch: prepatch },
        fn: fn,
        args: args
    });
};
exports.default = exports.thunk;

},{"./h":5}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function vnode(sel, data, children, text, elm) {
    var key = data === undefined ? undefined : data.key;
    return { sel: sel, data: data, children: children,
        text: text, elm: elm, key: key };
}
exports.vnode = vnode;
exports.default = vnode;

},{}],17:[function(require,module,exports){
(function (setImmediate,clearImmediate){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this,require("timers").setImmediate,require("timers").clearImmediate)
},{"process/browser.js":4,"timers":17}],18:[function(require,module,exports){
// Use all useful snabbdom modules
const patch = require('snabbdom').init([
  require('snabbdom/modules/props').default,
  require('snabbdom/modules/style').default,
  require('snabbdom/modules/class').default,
  require('snabbdom/modules/eventlisteners').default,
  require('snabbdom/modules/dataset').default,
  require('snabbdom/modules/attributes').default
])
const h = require('snabbdom/h').default

module.exports = { Component, h }

// Create a new UI component
function Component (obj) {
  const view = obj.view
  obj._viewArgs = []
  obj._vnode = patch(document.createElement('div'), h('div'))
  obj._render = function () {
    const newVnode = patch(obj._vnode, view.apply(obj, obj._viewArgs))
    // Do some efficient subtree patching
    // Update the existing vnode object, rather than using a new one, so it updates in-place
    for (let prop in newVnode) {
      obj._vnode[prop] = newVnode[prop]
    }
    return obj._vnode
  }
  obj.view = function () {
    obj._viewArgs = arguments
    return obj._render()
  }
  return obj
}

},{"snabbdom":14,"snabbdom/h":5,"snabbdom/modules/attributes":8,"snabbdom/modules/class":9,"snabbdom/modules/dataset":10,"snabbdom/modules/eventlisteners":11,"snabbdom/modules/props":12,"snabbdom/modules/style":13}],19:[function(require,module,exports){
const { Component, h } = require('uzu')

const field = require('./field')
const evaluate = require('../utils/evaluate')

module.exports = { Element }

let id = 0

const start = window.performance.now()

// A shape element, to be drawn on the canvas at every frame.
function Element (canvasState) {
  return Component({
    name: 'rect-' + id++,
    flags: {
      hasFill: true,
      hasRotation: false,
      hasStroke: false
    },
    utils: {
      sin: Math.sin,
      pi: Math.PI,
      floor: Math.floor,
      mouseX: () => document._mouseX,
      mouseY: () => document._mouseY,
      ts: () => window.performance.now() - start,
      rand: (max) => Math.floor(Math.random() * Math.floor(max))
    },
    props: {
      copies: 1,
      x: 50,
      y: 50,
      width: 50,
      height: 50,
      fillRed: 0,
      fillGreen: 0,
      fillBlue: 100,
      fillAlpha: 0.5,
      strokeRed: 0,
      strokeGreen: 0,
      strokeBlue: 0,
      strokeAlpha: 1,
      strokeWidth: 2,
      radians: 0,
      rotateX: 0,
      rotateY: 0,
      scaleX: 1,
      scaleY: 1
    },
    formOpen: true,

    toggleFormOpen () {
      this.formOpen = !this.formOpen
      this._render()
    },

    toggleFieldGroup (flag) {
      console.log('toggling', this)
      // Toggle field group flag
      this.flags[flag] = !this.flags[flag]
      this._render()
    },

    draw (ctx) {
      for (let i = 0; i < this.props.copies; i++) {
        this.drawOne(ctx, i)
      }
    },

    drawOne (ctx, i) {
      let props = {}
      const defs = Object.assign(this.utils, this.props)
      for (let name in this.props) {
        props[name] = evaluate(this.props[name], defs)
      }
      this.props.i = i
      const x = props.x
      const y = props.y
      ctx.save()
      // TODO: if (this.flags.hasRotation)
      if (this.flags.hasRotation) {
        const rotx = x + props.rotateX
        const roty = y + props.rotateY
        ctx.translate(rotx, roty)
        ctx.rotate(props.radians)
        ctx.translate(-rotx, -roty)
      }
      if (this.flags.hasFill) {
        ctx.fillStyle = 'rgba(' + props.fillRed + ', ' + props.fillGreen + ', ' + props.fillBlue + ', ' + props.fillAlpha + ')'
        ctx.fillRect(x, y, props.width, props.height)
      }
      if (this.flags.hasStroke) {
        const strokeWidth = props.strokeWidth
        ctx.strokeStyle = 'rgba(' + props.strokeRed + ', ' + props.strokeGreen + ', ' + props.strokeBlue + ', ' + props.strokeAlpha + ')'
        ctx.lineWidth = strokeWidth
        ctx.strokeRect(x, y, props.width, props.height)
      }
      ctx.restore()
    },

    view () {
      if (!this.formOpen) return h('div', '')
      const vars = this.props
      return h('div', [
        field(this, 'copies', ['copies'], vars),
        field(this, 'width', ['width'], vars),
        field(this, 'height', ['height'], vars),
        field(this, 'x', ['x'], vars),
        field(this, 'y', ['y'], vars),
        // Fill
        fieldGroup(this, {
          flag: 'hasFill',
          name: 'fill',
          children: [
            field(this, 'fill red', ['fillRed'], vars),
            field(this, 'fill green', ['fillGreen'], vars),
            field(this, 'fill blue', ['fillBlue'], vars),
            field(this, 'fill alpha', ['fillAlpha'], vars)
          ]
        }),

        fieldGroup(this, {
          flag: 'hasStroke',
          name: 'stroke',
          children: [
            field(this, 'stroke red', ['fillAlpha'], vars),
            field(this, 'stroke green', ['fillAlpha'], vars),
            field(this, 'stroke blue', ['fillAlpha'], vars),
            field(this, 'stroke alpha', ['fillAlpha'], vars),
            field(this, 'stroke width', ['strokeWidth'], vars)
          ]
        }),

        fieldGroup(this, {
          flag: 'hasRotation',
          name: 'rotation',
          children: [
            field(this, 'radians', ['radians'], vars),
            field(this, 'origin X', ['rotateX'], vars),
            field(this, 'origin Y', ['rotateY'], vars)
          ]
        })
      ])
    }
  })
}

function fieldGroup (elem, opts) {
  const { flag, name, children } = opts
  const htmlID = 'field-flag-' + elem.name
  const isOpen = elem.flags[flag]
  return h('div.bl.bw2.pl1.pb1.mb2', {
    class: {
      'b--black-20': !isOpen,
      'b--green': isOpen
    }
  }, [
    h('input', {
      props: { type: 'checkbox', checked: isOpen, id: htmlID },
      dataset: { name: elem.name },
      on: { change: () => elem.toggleFieldGroup(flag) }
    }),
    h('label.pointer.code.ml2.b.black-60', { props: { htmlFor: htmlID } }, name),
    h('div.mt2', {
      props: { hidden: !isOpen }
    }, children)
  ])
}

},{"../utils/evaluate":25,"./field":22,"uzu":18}],20:[function(require,module,exports){
// simple modal component
const { Component, h } = require('uzu')

const button = require('./button')

module.exports = { Modal }

function Modal () {
  return Component({
    isOpen: false,
    open () {
      this.isOpen = true
      this._render()
    },
    close () {
      this.isOpen = false
      this._render()
    },
    view ({ title, content }) {
      return h('div.code', [
        // Backdrop
        h('div.fixed.w-100.h-100.top-0.left-0.o-20.bg-black.z-1', {
          class: {
            dn: !this.isOpen
          },
          style: {
          },
          on: {
            click: () => this.close()
          }
        }),
        // Modal
        h('div.fixed.top-1.shadow-3.bg-white.z-2', {
          style: {
            left: '50%',
            width: '32rem',
            marginLeft: '-16rem'
          },
          class: {
            dn: !this.isOpen
          }
        }, [
          h('div.flex.justify-between.bb.b--black-20.pa3', [
            h('h1.f4.ma0', [
              title
            ]),
            button('Close', () => this.close())
          ]),
          h('div.pa3', [
            content
          ])
        ])
      ])
    }
  })
}

},{"./button":21,"uzu":18}],21:[function(require,module,exports){
const { h } = require('uzu')

module.exports = function button (txt, onclick) {
  return h('button.bg-white.ba.b--black-10.f6.pointer.dib.code.ma1.pa1', {
    on: { click: onclick }
  }, txt)
}

},{"uzu":18}],22:[function(require,module,exports){
const { h } = require('uzu')
const fieldset = require('./fieldset')

module.exports = function field (elem, label, prop, vars) {
  const inputs = h('input.w-100.code.f6.pa1', {
    props: { type: 'text', value: elem.props[prop] },
    on: {
      input: ev => {
        const val = ev.currentTarget.value
        elem.props[prop] = val
      }
    }
  })
  return fieldset([
    h('label.code.dib.mb1', label),
    h('div', { css: { root: [ 'float: right' ] } }, inputs)
  ])
}

},{"./fieldset":23,"uzu":18}],23:[function(require,module,exports){
const { h } = require('uzu')

module.exports = function fieldset (children) {
  return h('fieldset.bn.pa0.mb2', children)
}

},{"uzu":18}],24:[function(require,module,exports){
(function (Buffer){
const { Component, h } = require('uzu')

// Because lzma is not well setup for browserify/webpack, we inject it into our codebase to make it work.
const lzma = require('./vendor/lzma').LZMA()

// Components and views
const { Modal } = require('./components/Modal')
const { Element } = require('./components/Element')
const button = require('./components/button')
const fieldset = require('./components/fieldset')

function App () {
  // State of the drawing, including all the sidebar option fields.
  const canvasState = CanvasState()
  // The actual canvas element, which wraps the draw() function
  const canvas = Canvas(canvasState)
  return Component({
    canvasState,
    canvas,
    view () {
      return h('div', [
        this.canvasState.view(),
        this.canvas.view()
      ])
    }
  })
}

function CanvasState () {
  return Component({
    canvasWidth: 1000,
    canvasHeight: 1000,
    fillStyle: 'white',
    // Shape elements
    elems: {},
    elemOrder: [],
    // Share/save and open dialogs
    shareModal: Modal(),
    openModal: Modal(),
    // Compressed state of the canvas state and its elements
    compressedState: { loading: false },

    // Compress the canvas state with lzma and generate a share link
    shareState () {
      this.shareModal.open()
      this.compressedState.loading = true
      this._render()
      const jsonState = stateToJson(this)
      persistCompressed(jsonState, result => {
        this.compressedState.loading = false
        document.location.hash = result
        this.compressedState.content = window.location.href
        this._render()
      })
    },

    changeCanvasHeight (height) {
      this.canvasHeight = height
      this.elm.height = height
    },

    changeCanvasWidth (width) {
      this.canvasWidth = width
      this.elm.width = width
    },

    changeFillStyle (s) {
      // Will update on next frame
      this.fillStyle = s
    },

    view () {
      const elems = this.elemOrder.map(elem => {
        return h('div', { key: elem.name }, [
          h('div.b.bb.b--black-20.mv1.code.pv1.flex.justify-between.items-center', [
            h('span.pointer.dib', {
              on: { click: () => elem.toggleFormOpen() }
            }, elem.name),
            h('div', [
              copyButton(this, elem),
              removeButton(this, elem)
            ])
          ]),
          elem.view()
        ])
      })
      return h('div.bg-light-gray.pa2', {
        style: { width: '20rem' }
      }, [
        this.openModal.view({
          title: 'Open',
          content: openModalContent(this)
        }),
        this.shareModal.view({
          title: 'Save Polygram',
          content: shareModalContent(this)
        }),
        h('div.flex.justify-end', [
          shareButton(this),
          openButton(this)
        ]),
        canvasOptionField(this.canvasWidth, 'canvas width', 'number', w => this.changeCanvasWidth(w)),
        canvasOptionField(this.canvasHeight, 'canvas height', 'number', h => this.changeCanvasHeight(h)),
        canvasOptionField(this.fillStyle, 'background color', 'text', fs => this.changeFillStyle(fs)),
        h('div', [
          // newElemButton(this, Value, 'value'),
          newElemButton(this, Element, 'shape')
        ]),
        h('div', elems)
      ])
    }
  })
}

function canvasOptionField (val, label, inputType, onchange) {
  return fieldset([
    h('label.code', { css: { root: ['font-family: mono'] } }, label),
    h('input.code.f6.pa1.w-100', {
      props: { type: inputType, value: val },
      on: {
        input: ev => {
          const newval = ev.currentTarget.value
          onchange(newval)
        }
      }
    })
  ])
}

function openModalContent (canvasState) {
  return h('div', [
    h('form', {
      on: {
        submit: ev => {
          ev.preventDefault()
          const link = ev.currentTarget.querySelector('textarea').value
          const compressed = link.match(/#(.+)$/)[1]
          restoreCompressed(compressed, canvasState)
        }
      }
    }, [
      h('p', 'Paste a polygram link:'),
      h('textarea.w-100', { props: { rows: 4 } }),
      button('Load')
    ])
  ])
}

function shareModalContent (canvasState) {
  if (canvasState.compressedState.loading) {
    return h('div', [h('p', 'Loading...')])
  }
  return h('div', [
    h('p', 'Saved!'),
    h('p', 'Link for this polygram:'),
    h('textarea.w-100', {
      props: {
        value: canvasState.compressedState.content,
        rows: 6
      }
    })
  ])
}

/*
let id = 0
// TODO
function Value (canvasState) {
  return Component({
    name: 'val-' + id++,
    value: () => 0,
    formOpen: true,
    toggleFormOpen () {
      this.formOpen = !this.formOpen
      this._render()
    },
    view () {
      if (!this.formOpen) return h('div', '')
      return h('div', [
        field(this, 'value', canvasState)
      ])
    }
  })
}
*/

function Canvas (canvasState) {
  return Component({
    view () {
      return h('canvas.fixed.top-0', {
        style: {
          left: '20rem'
        },
        props: {
          id: 'tutorial'
        },
        hook: {
          insert: (vnode) => {
            const elm = vnode.elm
            canvasState.elm = elm
            elm.width = canvasState.canvasWidth
            elm.height = canvasState.canvasHeight
            const ctx = elm.getContext('2d')
            ctx.globalCompositeOperation = 'source-over'
            ctx.save()
            function draw (ts) {
              document._ts = ts
              ctx.fillStyle = canvasState.fillStyle || 'white'
              ctx.fillRect(0, 0, canvasState.canvasWidth, canvasState.canvasHeight)
              for (let name in canvasState.elems) {
                let shape = canvasState.elems[name]
                if (shape.draw) shape.draw(ctx)
              }
              window.requestAnimationFrame(draw)
            }
            draw()
          }
        }
      })
    }
  })
}

// Takes the full app component, plus a single element
function removeButton (canvasState, elem) {
  return button('Remove', () => {
    delete canvasState.elems[elem.name]
    canvasState.elemOrder = canvasState.elemOrder.filter(e => e.name !== elem.name)
    canvasState._render()
  })
}

// Takes the full app component, plus a single element
function copyButton (canvasState, elem) {
  return button('Copy', () => {
    const newElem = Element(canvasState)
    const props = Object.assign({}, elem.props)
    const flags = Object.assign({}, elem.flags)
    newElem.props = props
    newElem.flags = flags
    canvasState.elems[newElem.name] = newElem
    canvasState.elemOrder.push(newElem)
    canvasState._render()
  })
}

// Create a new shape
function newElemButton (canvasState, constructor, name) {
  return button('Add ' + name, () => {
    const cmp = constructor(canvasState)
    canvasState.elems[cmp.name] = cmp
    canvasState.elemOrder.push(cmp)
    canvasState._render()
  })
}

// Save the state of the drawing
function shareButton (canvasState) {
  return button('Share/save', () => canvasState.shareState())
}

// Open a new drawing
function openButton (canvasState) {
  return button('Open', () => {
    canvasState.openModal.open()
  })
}

// Convert the canvas state to json text
function stateToJson (canvasState) {
  // mini function to get the properties of one "shape" element
  const getElem = elem => {
    return {
      f: elem.flags,
      p: elem.props,
      n: elem.name
    }
  }
  const elemOrder = canvasState.elemOrder.map(getElem)
  const json = JSON.stringify({
    w: canvasState.canvasWidth,
    h: canvasState.canvasHeight,
    fs: canvasState.fillStyle,
    es: elemOrder
  })
  return json
}

function persistCompressed (json, cb) {
  lzma.compress(json, 2, result => {
    const str = Buffer.from(result).toString('base64')
    cb(str)
  })
}

// Restore from a json string
function restoreJson (json, canvasState) {
  // The state will be minified where the keys are:
  // - 'h' is canvasHeight
  // - 'w' is canvasWidth
  // - 'fs' is the fillStyle
  // - 'es' is the elemOrder
  // For each element, we have properties for:
  // - 'p' is props
  // - 'f' is flags
  // - 'n' is name
  const data = JSON.parse(json)
  canvasState.canvasWidth = data.w || data.canvasWidth
  canvasState.canvasHeight = data.h || data.canvasHeight
  canvasState.fillStyle = data.fs || 'white'
  canvasState.elems = {}
  canvasState.elemOrder = []
  const elems = data.es || data.elemOrder
  elems.forEach(elemData => {
    const elem = Element(canvasState)
    elem.props = elemData.p || elemData.props
    elem.flags = elemData.f || elemData.flags
    elem.name = elemData.n || elemData.name
    canvasState.elems[elem.name] = elem
    canvasState.elemOrder.push(elem)
  })
  canvasState._render()
}

// Restore from a lzma-compressed url hash
function restoreCompressed (compressed, canvasState) {
  const bytes = Buffer.from(compressed, 'base64')
  lzma.decompress(bytes, result => {
    restoreJson(result, canvasState)
  })
}

// Track the mouse x/y coords globally
document.body.addEventListener('mousemove', ev => {
  document._mouseX = ev.clientX
  document._mouseY = ev.clientY
})

// Initialize the top-level component
const app = App()

// Load a canvas state from the url hash, if present
if (document.location.hash.length) {
  const compressed = document.location.hash.replace(/^#/, '')
  restoreCompressed(compressed, app.canvasState)
}

// Mount to the page
document.body.appendChild(app.view().elm)

}).call(this,require("buffer").Buffer)
},{"./components/Element":19,"./components/Modal":20,"./components/button":21,"./components/fieldset":23,"./vendor/lzma":26,"buffer":2,"uzu":18}],25:[function(require,module,exports){
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

},{}],26:[function(require,module,exports){
//! © 2015 Nathan Rugg <nmrugg@gmail.com> | MIT

var lzma;

function load_lzma()
{
    return require('./src/lzma_worker.js').LZMA_WORKER;
    // return require(require("path").join(__dirname, "src" ,"lzma_worker.js")).LZMA_WORKER;
}

lzma = load_lzma();

///NOTE: This function is for backwards compatibility's sake.
module.exports.LZMA = function LZMA()
{
    return lzma;
}

module.exports.compress   = lzma.compress;
module.exports.decompress = lzma.decompress;

},{"./src/lzma_worker.js":27}],27:[function(require,module,exports){
(function (setImmediate){
/// © 2015 Nathan Rugg <nmrugg@gmail.com> | MIT
/// See LICENSE for more details.

/* jshint noarg:true, boss:true, unused:strict, strict:true, undef:true, noarg: true, forin:true, evil:true, newcap:false, -W041, -W021, worker:true, browser:true, node:true */

/* global setImmediate, setTimeout, window, onmessage */

/** xs */
///NOTE: This is the master file that is used to generate lzma-c.js and lzma-d.js.
///      Comments are used to determine which parts are to be removed.
///
/// cs-ce (compression start-end)
/// ds-de (decompression start-end)
/// xs-xe (only in this file start-end)
/// co    (compression only)
/// do    (decompression only)
/** xe */

var LZMA = (function () {
    
    "use strict";
    
    var /** cs */
        action_compress   = 1,
        /** ce */
        /** ds */
        action_decompress = 2,
        /** de */
        action_progress   = 3,
        wait = typeof setImmediate == "function" ? setImmediate : setTimeout,
        __4294967296 = 4294967296,
        N1_longLit = [4294967295, -__4294967296],
        /** cs */
        MIN_VALUE = [0, -9223372036854775808],
        /** ce */
        P0_longLit = [0, 0],
        P1_longLit = [1, 0];
    
    function update_progress(percent, cbn) {
        postMessage({
            action: action_progress,
            cbn: cbn,
            result: percent
        });
    }
    
    function initDim(len) {
        ///NOTE: This is MUCH faster than "new Array(len)" in newer versions of v8 (starting with Node.js 0.11.15, which uses v8 3.28.73).
        var a = [];
        a[len - 1] = undefined;
        return a;
    }
    
    function add(a, b) {
        return create(a[0] + b[0], a[1] + b[1]);
    }
    
    /** cs */
    function and(a, b) {
        return makeFromBits(~~Math.max(Math.min(a[1] / __4294967296, 2147483647), -2147483648) & ~~Math.max(Math.min(b[1] / __4294967296, 2147483647), -2147483648), lowBits_0(a) & lowBits_0(b));
    }
    /** ce */
    
    function compare(a, b) {
        var nega, negb;
        if (a[0] == b[0] && a[1] == b[1]) {
            return 0;
        }
        nega = a[1] < 0;
        negb = b[1] < 0;
        if (nega && !negb) {
            return -1;
        }
        if (!nega && negb) {
            return 1;
        }
        if (sub(a, b)[1] < 0) {
            return -1;
        }
        return 1;
    }
    
    function create(valueLow, valueHigh) {
        var diffHigh, diffLow;
        valueHigh %= 1.8446744073709552E19;
        valueLow %= 1.8446744073709552E19;
        diffHigh = valueHigh % __4294967296;
        diffLow = Math.floor(valueLow / __4294967296) * __4294967296;
        valueHigh = valueHigh - diffHigh + diffLow;
        valueLow = valueLow - diffLow + diffHigh;
        while (valueLow < 0) {
            valueLow += __4294967296;
            valueHigh -= __4294967296;
        }
        while (valueLow > 4294967295) {
            valueLow -= __4294967296;
            valueHigh += __4294967296;
        }
        valueHigh = valueHigh % 1.8446744073709552E19;
        while (valueHigh > 9223372032559808512) {
            valueHigh -= 1.8446744073709552E19;
        }
        while (valueHigh < -9223372036854775808) {
            valueHigh += 1.8446744073709552E19;
        }
        return [valueLow, valueHigh];
    }
    
    /** cs */
    function eq(a, b) {
        return a[0] == b[0] && a[1] == b[1];
    }
    /** ce */
    function fromInt(value) {
        if (value >= 0) {
            return [value, 0];
        } else {
            return [value + __4294967296, -__4294967296];
        }
    }
    
    function lowBits_0(a) {
        if (a[0] >= 2147483648) {
            return ~~Math.max(Math.min(a[0] - __4294967296, 2147483647), -2147483648);
        } else {
            return ~~Math.max(Math.min(a[0], 2147483647), -2147483648);
        }
    }
    /** cs */
    function makeFromBits(highBits, lowBits) {
        var high, low;
        high = highBits * __4294967296;
        low = lowBits;
        if (lowBits < 0) {
            low += __4294967296;
        }
        return [low, high];
    }
    
    function pwrAsDouble(n) {
        if (n <= 30) {
            return 1 << n;
        } else {
            return pwrAsDouble(30) * pwrAsDouble(n - 30);
        }
    }
    
    function shl(a, n) {
        var diff, newHigh, newLow, twoToN;
        n &= 63;
        if (eq(a, MIN_VALUE)) {
            if (!n) {
                return a;
            }
            return P0_longLit;
        }
        if (a[1] < 0) {
            throw new Error("Neg");
        }
        twoToN = pwrAsDouble(n);
        newHigh = a[1] * twoToN % 1.8446744073709552E19;
        newLow = a[0] * twoToN;
        diff = newLow - newLow % __4294967296;
        newHigh += diff;
        newLow -= diff;
        if (newHigh >= 9223372036854775807) {
            newHigh -= 1.8446744073709552E19;
        }
        return [newLow, newHigh];
    }
    
    function shr(a, n) {
        var shiftFact;
        n &= 63;
        shiftFact = pwrAsDouble(n);
        return create(Math.floor(a[0] / shiftFact), a[1] / shiftFact);
    }
    
    function shru(a, n) {
        var sr;
        n &= 63;
        sr = shr(a, n);
        if (a[1] < 0) {
            sr = add(sr, shl([2, 0], 63 - n));
        }
        return sr;
    }
    
    /** ce */
    
    function sub(a, b) {
        return create(a[0] - b[0], a[1] - b[1]);
    }
    
    function $ByteArrayInputStream(this$static, buf) {
        this$static.buf = buf;
        this$static.pos = 0;
        this$static.count = buf.length;
        return this$static;
    }
    
    /** ds */
    function $read(this$static) {
        if (this$static.pos >= this$static.count)
            return -1;
        return this$static.buf[this$static.pos++] & 255;
    }
    /** de */
    /** cs */
    function $read_0(this$static, buf, off, len) {
        if (this$static.pos >= this$static.count)
            return -1;
        len = Math.min(len, this$static.count - this$static.pos);
        arraycopy(this$static.buf, this$static.pos, buf, off, len);
        this$static.pos += len;
        return len;
    }
    /** ce */
    
    function $ByteArrayOutputStream(this$static) {
        this$static.buf = initDim(32);
        this$static.count = 0;
        return this$static;
    }
    
    function $toByteArray(this$static) {
        var data = this$static.buf;
        data.length = this$static.count;
        return data;
    }
    
    /** cs */
    function $write(this$static, b) {
        this$static.buf[this$static.count++] = b << 24 >> 24;
    }
    /** ce */
    
    function $write_0(this$static, buf, off, len) {
        arraycopy(buf, off, this$static.buf, this$static.count, len);
        this$static.count += len;
    }
    
    /** cs */
    function $getChars(this$static, srcBegin, srcEnd, dst, dstBegin) {
        var srcIdx;
        for (srcIdx = srcBegin; srcIdx < srcEnd; ++srcIdx) {
            dst[dstBegin++] = this$static.charCodeAt(srcIdx);
        }
    }
    /** ce */
    
    function arraycopy(src, srcOfs, dest, destOfs, len) {
        for (var i = 0; i < len; ++i) {
            dest[destOfs + i] = src[srcOfs + i];
        }
    }
    
    /** cs */
    function $configure(this$static, encoder) {
        $SetDictionarySize_0(encoder, 1 << this$static.s);
        encoder._numFastBytes = this$static.f;
        $SetMatchFinder(encoder, this$static.m);
        
        /// lc is always 3
        /// lp is always 0
        /// pb is always 2
        encoder._numLiteralPosStateBits = 0;
        encoder._numLiteralContextBits = 3;
        encoder._posStateBits = 2;
        ///this$static._posStateMask = (1 << pb) - 1;
        encoder._posStateMask = 3;
    }
    
    function $init(this$static, input, output, length_0, mode) {
        var encoder, i;
        if (compare(length_0, N1_longLit) < 0)
            throw new Error("invalid length " + length_0);
        this$static.length_0 = length_0;
        encoder = $Encoder({});
        $configure(mode, encoder);
        encoder._writeEndMark = typeof LZMA.disableEndMark == "undefined";
        $WriteCoderProperties(encoder, output);
        for (i = 0; i < 64; i += 8)
            $write(output, lowBits_0(shr(length_0, i)) & 255);
        this$static.chunker = (encoder._needReleaseMFStream = 0 , (encoder._inStream = input , encoder._finished = 0 , $Create_2(encoder) , encoder._rangeEncoder.Stream = output , $Init_4(encoder) , $FillDistancesPrices(encoder) , $FillAlignPrices(encoder) , encoder._lenEncoder._tableSize = encoder._numFastBytes + 1 - 2 , $UpdateTables(encoder._lenEncoder, 1 << encoder._posStateBits) , encoder._repMatchLenEncoder._tableSize = encoder._numFastBytes + 1 - 2 , $UpdateTables(encoder._repMatchLenEncoder, 1 << encoder._posStateBits) , encoder.nowPos64 = P0_longLit , undefined) , $Chunker_0({}, encoder));
    }
    
    function $LZMAByteArrayCompressor(this$static, data, mode) {
        this$static.output = $ByteArrayOutputStream({});
        $init(this$static, $ByteArrayInputStream({}, data), this$static.output, fromInt(data.length), mode);
        return this$static;
    }
    /** ce */
    
    /** ds */
    function $init_0(this$static, input, output) {
        var decoder,
            hex_length = "",
            i,
            properties = [],
            r,
            tmp_length;
        
        for (i = 0; i < 5; ++i) {
            r = $read(input);
            if (r == -1)
                throw new Error("truncated input");
            properties[i] = r << 24 >> 24;
        }
        
        decoder = $Decoder({});
        if (!$SetDecoderProperties(decoder, properties)) {
            throw new Error("corrupted input");
        }
        for (i = 0; i < 64; i += 8) {
            r = $read(input);
            if (r == -1)
                throw new Error("truncated input");
            r = r.toString(16);
            if (r.length == 1) r = "0" + r;
            hex_length = r + "" + hex_length;
        }
        
        /// Was the length set in the header (if it was compressed from a stream, the length is all f"s).
        if (/^0+$|^f+$/i.test(hex_length)) {
            /// The length is unknown, so set to -1.
            this$static.length_0 = N1_longLit;
        } else {
            ///NOTE: If there is a problem with the decoder because of the length, you can always set the length to -1 (N1_longLit) which means unknown.
            tmp_length = parseInt(hex_length, 16);
            /// If the length is too long to handle, just set it to unknown.
            if (tmp_length > 4294967295) {
                this$static.length_0 = N1_longLit;
            } else {
                this$static.length_0 = fromInt(tmp_length);
            }
        }
        
        this$static.chunker = $CodeInChunks(decoder, input, output, this$static.length_0);
    }
    
    function $LZMAByteArrayDecompressor(this$static, data) {
        this$static.output = $ByteArrayOutputStream({});
        $init_0(this$static, $ByteArrayInputStream({}, data), this$static.output);
        return this$static;
    }
    /** de */
    /** cs */
    function $Create_4(this$static, keepSizeBefore, keepSizeAfter, keepSizeReserv) {
        var blockSize;
        this$static._keepSizeBefore = keepSizeBefore;
        this$static._keepSizeAfter = keepSizeAfter;
        blockSize = keepSizeBefore + keepSizeAfter + keepSizeReserv;
        if (this$static._bufferBase == null || this$static._blockSize != blockSize) {
            this$static._bufferBase = null;
            this$static._blockSize = blockSize;
            this$static._bufferBase = initDim(this$static._blockSize);
        }
        this$static._pointerToLastSafePosition = this$static._blockSize - keepSizeAfter;
    }
    
    function $GetIndexByte(this$static, index) {
        return this$static._bufferBase[this$static._bufferOffset + this$static._pos + index];
    }
    
    function $GetMatchLen(this$static, index, distance, limit) {
        var i, pby;
        if (this$static._streamEndWasReached) {
            if (this$static._pos + index + limit > this$static._streamPos) {
                limit = this$static._streamPos - (this$static._pos + index);
            }
        }
        ++distance;
        pby = this$static._bufferOffset + this$static._pos + index;
        for (i = 0; i < limit && this$static._bufferBase[pby + i] == this$static._bufferBase[pby + i - distance]; ++i) {
        }
        return i;
    }
    
    function $GetNumAvailableBytes(this$static) {
        return this$static._streamPos - this$static._pos;
    }
    
    function $MoveBlock(this$static) {
        var i, numBytes, offset;
        offset = this$static._bufferOffset + this$static._pos - this$static._keepSizeBefore;
        if (offset > 0) {
            --offset;
        }
        numBytes = this$static._bufferOffset + this$static._streamPos - offset;
        for (i = 0; i < numBytes; ++i) {
            this$static._bufferBase[i] = this$static._bufferBase[offset + i];
        }
        this$static._bufferOffset -= offset;
    }
    
    function $MovePos_1(this$static) {
        var pointerToPostion;
        ++this$static._pos;
        if (this$static._pos > this$static._posLimit) {
            pointerToPostion = this$static._bufferOffset + this$static._pos;
            if (pointerToPostion > this$static._pointerToLastSafePosition) {
                $MoveBlock(this$static);
            }
            $ReadBlock(this$static);
        }
    }
    
    function $ReadBlock(this$static) {
        var numReadBytes, pointerToPostion, size;
        if (this$static._streamEndWasReached)
            return;
        while (1) {
            size = -this$static._bufferOffset + this$static._blockSize - this$static._streamPos;
            if (!size)
                return;
            numReadBytes = $read_0(this$static._stream, this$static._bufferBase, this$static._bufferOffset + this$static._streamPos, size);
            if (numReadBytes == -1) {
                this$static._posLimit = this$static._streamPos;
                pointerToPostion = this$static._bufferOffset + this$static._posLimit;
                if (pointerToPostion > this$static._pointerToLastSafePosition) {
                    this$static._posLimit = this$static._pointerToLastSafePosition - this$static._bufferOffset;
                }
                this$static._streamEndWasReached = 1;
                return;
            }
            this$static._streamPos += numReadBytes;
            if (this$static._streamPos >= this$static._pos + this$static._keepSizeAfter) {
                this$static._posLimit = this$static._streamPos - this$static._keepSizeAfter;
            }
        }
    }
    
    function $ReduceOffsets(this$static, subValue) {
        this$static._bufferOffset += subValue;
        this$static._posLimit -= subValue;
        this$static._pos -= subValue;
        this$static._streamPos -= subValue;
    }
    
    var CrcTable = (function () {
        var i, j, r, CrcTable = [];
        for (i = 0; i < 256; ++i) {
            r = i;
            for (j = 0; j < 8; ++j)
            if ((r & 1) != 0) {
                r = r >>> 1 ^ -306674912;
            } else {
                r >>>= 1;
            }
            CrcTable[i] = r;
        }
        return CrcTable;
    }());
    
    function $Create_3(this$static, historySize, keepAddBufferBefore, matchMaxLen, keepAddBufferAfter) {
        var cyclicBufferSize, hs, windowReservSize;
        if (historySize < 1073741567) {
            this$static._cutValue = 16 + (matchMaxLen >> 1);
            windowReservSize = ~~((historySize + keepAddBufferBefore + matchMaxLen + keepAddBufferAfter) / 2) + 256;
            $Create_4(this$static, historySize + keepAddBufferBefore, matchMaxLen + keepAddBufferAfter, windowReservSize);
            this$static._matchMaxLen = matchMaxLen;
            cyclicBufferSize = historySize + 1;
            if (this$static._cyclicBufferSize != cyclicBufferSize) {
                this$static._son = initDim((this$static._cyclicBufferSize = cyclicBufferSize) * 2);
            }
    
            hs = 65536;
            if (this$static.HASH_ARRAY) {
                hs = historySize - 1;
                hs |= hs >> 1;
                hs |= hs >> 2;
                hs |= hs >> 4;
                hs |= hs >> 8;
                hs >>= 1;
                hs |= 65535;
                if (hs > 16777216)
                hs >>= 1;
                this$static._hashMask = hs;
                ++hs;
                hs += this$static.kFixHashSize;
            }
            
            if (hs != this$static._hashSizeSum) {
                this$static._hash = initDim(this$static._hashSizeSum = hs);
            }
        }
    }
    
    function $GetMatches(this$static, distances) {
        var count, cur, curMatch, curMatch2, curMatch3, cyclicPos, delta, hash2Value, hash3Value, hashValue, len, len0, len1, lenLimit, matchMinPos, maxLen, offset, pby1, ptr0, ptr1, temp;
        if (this$static._pos + this$static._matchMaxLen <= this$static._streamPos) {
            lenLimit = this$static._matchMaxLen;
        } else {
            lenLimit = this$static._streamPos - this$static._pos;
            if (lenLimit < this$static.kMinMatchCheck) {
                $MovePos_0(this$static);
                return 0;
            }
        }
        offset = 0;
        matchMinPos = this$static._pos > this$static._cyclicBufferSize?this$static._pos - this$static._cyclicBufferSize:0;
        cur = this$static._bufferOffset + this$static._pos;
        maxLen = 1;
        hash2Value = 0;
        hash3Value = 0;
        if (this$static.HASH_ARRAY) {
            temp = CrcTable[this$static._bufferBase[cur] & 255] ^ this$static._bufferBase[cur + 1] & 255;
            hash2Value = temp & 1023;
            temp ^= (this$static._bufferBase[cur + 2] & 255) << 8;
            hash3Value = temp & 65535;
            hashValue = (temp ^ CrcTable[this$static._bufferBase[cur + 3] & 255] << 5) & this$static._hashMask;
        } else {
            hashValue = this$static._bufferBase[cur] & 255 ^ (this$static._bufferBase[cur + 1] & 255) << 8;
        }

        curMatch = this$static._hash[this$static.kFixHashSize + hashValue] || 0;
        if (this$static.HASH_ARRAY) {
            curMatch2 = this$static._hash[hash2Value] || 0;
            curMatch3 = this$static._hash[1024 + hash3Value] || 0;
            this$static._hash[hash2Value] = this$static._pos;
            this$static._hash[1024 + hash3Value] = this$static._pos;
            if (curMatch2 > matchMinPos) {
                if (this$static._bufferBase[this$static._bufferOffset + curMatch2] == this$static._bufferBase[cur]) {
                    distances[offset++] = maxLen = 2;
                    distances[offset++] = this$static._pos - curMatch2 - 1;
                }
            }
            if (curMatch3 > matchMinPos) {
                if (this$static._bufferBase[this$static._bufferOffset + curMatch3] == this$static._bufferBase[cur]) {
                    if (curMatch3 == curMatch2) {
                        offset -= 2;
                    }
                    distances[offset++] = maxLen = 3;
                    distances[offset++] = this$static._pos - curMatch3 - 1;
                    curMatch2 = curMatch3;
                }
            }
            if (offset != 0 && curMatch2 == curMatch) {
                offset -= 2;
                maxLen = 1;
            }
        }
        this$static._hash[this$static.kFixHashSize + hashValue] = this$static._pos;
        ptr0 = (this$static._cyclicBufferPos << 1) + 1;
        ptr1 = this$static._cyclicBufferPos << 1;
        len0 = len1 = this$static.kNumHashDirectBytes;
        if (this$static.kNumHashDirectBytes != 0) {
            if (curMatch > matchMinPos) {
                if (this$static._bufferBase[this$static._bufferOffset + curMatch + this$static.kNumHashDirectBytes] != this$static._bufferBase[cur + this$static.kNumHashDirectBytes]) {
                    distances[offset++] = maxLen = this$static.kNumHashDirectBytes;
                    distances[offset++] = this$static._pos - curMatch - 1;
                }
            }
        }
        count = this$static._cutValue;
        while (1) {
            if (curMatch <= matchMinPos || count-- == 0) {
                this$static._son[ptr0] = this$static._son[ptr1] = 0;
                break;
            }
            delta = this$static._pos - curMatch;
            cyclicPos = (delta <= this$static._cyclicBufferPos?this$static._cyclicBufferPos - delta:this$static._cyclicBufferPos - delta + this$static._cyclicBufferSize) << 1;
            pby1 = this$static._bufferOffset + curMatch;
            len = len0 < len1?len0:len1;
            if (this$static._bufferBase[pby1 + len] == this$static._bufferBase[cur + len]) {
                while (++len != lenLimit) {
                    if (this$static._bufferBase[pby1 + len] != this$static._bufferBase[cur + len]) {
                        break;
                    }
                }
                if (maxLen < len) {
                    distances[offset++] = maxLen = len;
                    distances[offset++] = delta - 1;
                    if (len == lenLimit) {
                    this$static._son[ptr1] = this$static._son[cyclicPos];
                    this$static._son[ptr0] = this$static._son[cyclicPos + 1];
                    break;
                    }
                }
            }
            if ((this$static._bufferBase[pby1 + len] & 255) < (this$static._bufferBase[cur + len] & 255)) {
                this$static._son[ptr1] = curMatch;
                ptr1 = cyclicPos + 1;
                curMatch = this$static._son[ptr1];
                len1 = len;
            } else {
                this$static._son[ptr0] = curMatch;
                ptr0 = cyclicPos;
                curMatch = this$static._son[ptr0];
                len0 = len;
            }
        }
        $MovePos_0(this$static);
        return offset;
    }
    
    function $Init_5(this$static) {
        this$static._bufferOffset = 0;
        this$static._pos = 0;
        this$static._streamPos = 0;
        this$static._streamEndWasReached = 0;
        $ReadBlock(this$static);
        this$static._cyclicBufferPos = 0;
        $ReduceOffsets(this$static, -1);
    }
    
    function $MovePos_0(this$static) {
        var subValue;
        if (++this$static._cyclicBufferPos >= this$static._cyclicBufferSize) {
            this$static._cyclicBufferPos = 0;
        }
        $MovePos_1(this$static);
        if (this$static._pos == 1073741823) {
            subValue = this$static._pos - this$static._cyclicBufferSize;
            $NormalizeLinks(this$static._son, this$static._cyclicBufferSize * 2, subValue);
            $NormalizeLinks(this$static._hash, this$static._hashSizeSum, subValue);
            $ReduceOffsets(this$static, subValue);
        }
    }
    
    ///NOTE: This is only called after reading one whole gigabyte.
    function $NormalizeLinks(items, numItems, subValue) {
        var i, value;
        for (i = 0; i < numItems; ++i) {
            value = items[i] || 0;
            if (value <= subValue) {
                value = 0;
            } else {
                value -= subValue;
            }
            items[i] = value;
        }
    }
    
    function $SetType(this$static, numHashBytes) {
        this$static.HASH_ARRAY = numHashBytes > 2;
        if (this$static.HASH_ARRAY) {
            this$static.kNumHashDirectBytes = 0;
            this$static.kMinMatchCheck = 4;
            this$static.kFixHashSize = 66560;
        } else {
            this$static.kNumHashDirectBytes = 2;
            this$static.kMinMatchCheck = 3;
            this$static.kFixHashSize = 0;
        }
    }
    
    function $Skip(this$static, num) {
        var count, cur, curMatch, cyclicPos, delta, hash2Value, hash3Value, hashValue, len, len0, len1, lenLimit, matchMinPos, pby1, ptr0, ptr1, temp;
        do {
            if (this$static._pos + this$static._matchMaxLen <= this$static._streamPos) {
                lenLimit = this$static._matchMaxLen;
            } else {
                lenLimit = this$static._streamPos - this$static._pos;
                if (lenLimit < this$static.kMinMatchCheck) {
                    $MovePos_0(this$static);
                    continue;
                }
            }
            matchMinPos = this$static._pos > this$static._cyclicBufferSize?this$static._pos - this$static._cyclicBufferSize:0;
            cur = this$static._bufferOffset + this$static._pos;
            if (this$static.HASH_ARRAY) {
                temp = CrcTable[this$static._bufferBase[cur] & 255] ^ this$static._bufferBase[cur + 1] & 255;
                hash2Value = temp & 1023;
                this$static._hash[hash2Value] = this$static._pos;
                temp ^= (this$static._bufferBase[cur + 2] & 255) << 8;
                hash3Value = temp & 65535;
                this$static._hash[1024 + hash3Value] = this$static._pos;
                hashValue = (temp ^ CrcTable[this$static._bufferBase[cur + 3] & 255] << 5) & this$static._hashMask;
            } else {
                hashValue = this$static._bufferBase[cur] & 255 ^ (this$static._bufferBase[cur + 1] & 255) << 8;
            }
            curMatch = this$static._hash[this$static.kFixHashSize + hashValue];
            this$static._hash[this$static.kFixHashSize + hashValue] = this$static._pos;
            ptr0 = (this$static._cyclicBufferPos << 1) + 1;
            ptr1 = this$static._cyclicBufferPos << 1;
            len0 = len1 = this$static.kNumHashDirectBytes;
            count = this$static._cutValue;
            while (1) {
                if (curMatch <= matchMinPos || count-- == 0) {
                    this$static._son[ptr0] = this$static._son[ptr1] = 0;
                    break;
                }
                delta = this$static._pos - curMatch;
                cyclicPos = (delta <= this$static._cyclicBufferPos?this$static._cyclicBufferPos - delta:this$static._cyclicBufferPos - delta + this$static._cyclicBufferSize) << 1;
                pby1 = this$static._bufferOffset + curMatch;
                len = len0 < len1?len0:len1;
                if (this$static._bufferBase[pby1 + len] == this$static._bufferBase[cur + len]) {
                    while (++len != lenLimit) {
                        if (this$static._bufferBase[pby1 + len] != this$static._bufferBase[cur + len]) {
                            break;
                        }
                    }
                    if (len == lenLimit) {
                        this$static._son[ptr1] = this$static._son[cyclicPos];
                        this$static._son[ptr0] = this$static._son[cyclicPos + 1];
                        break;
                    }
                }
                if ((this$static._bufferBase[pby1 + len] & 255) < (this$static._bufferBase[cur + len] & 255)) {
                    this$static._son[ptr1] = curMatch;
                    ptr1 = cyclicPos + 1;
                    curMatch = this$static._son[ptr1];
                    len1 = len;
                } else {
                    this$static._son[ptr0] = curMatch;
                    ptr0 = cyclicPos;
                    curMatch = this$static._son[ptr0];
                    len0 = len;
                }
            }
            $MovePos_0(this$static);
        }
        while (--num != 0);
    }
    
    /** ce */
    /** ds */
    function $CopyBlock(this$static, distance, len) {
        var pos = this$static._pos - distance - 1;
        if (pos < 0) {
            pos += this$static._windowSize;
        }
        for (; len != 0; --len) {
            if (pos >= this$static._windowSize) {
                pos = 0;
            }
            this$static._buffer[this$static._pos++] = this$static._buffer[pos++];
            if (this$static._pos >= this$static._windowSize) {
                $Flush_0(this$static);
            }
        }
    }
    
    function $Create_5(this$static, windowSize) {
        if (this$static._buffer == null || this$static._windowSize != windowSize) {
            this$static._buffer = initDim(windowSize);
        }
        this$static._windowSize = windowSize;
        this$static._pos = 0;
        this$static._streamPos = 0;
    }
    
    function $Flush_0(this$static) {
        var size = this$static._pos - this$static._streamPos;
        if (!size) {
            return;
        }
        $write_0(this$static._stream, this$static._buffer, this$static._streamPos, size);
        if (this$static._pos >= this$static._windowSize) {
            this$static._pos = 0;
        }
        this$static._streamPos = this$static._pos;
    }
    
    function $GetByte(this$static, distance) {
        var pos = this$static._pos - distance - 1;
        if (pos < 0) {
            pos += this$static._windowSize;
        }
        return this$static._buffer[pos];
    }
    
    function $PutByte(this$static, b) {
        this$static._buffer[this$static._pos++] = b;
        if (this$static._pos >= this$static._windowSize) {
            $Flush_0(this$static);
        }
    }
    
    function $ReleaseStream(this$static) {
        $Flush_0(this$static);
        this$static._stream = null;
    }
    /** de */
    
    function GetLenToPosState(len) {
        len -= 2;
        if (len < 4) {
            return len;
        }
        return 3;
    }
    
    function StateUpdateChar(index) {
        if (index < 4) {
            return 0;
        }
        if (index < 10) {
            return index - 3;
        }
        return index - 6;
    }
    
    /** cs */
    function $Chunker_0(this$static, encoder) {
        this$static.encoder = encoder;
        this$static.decoder = null;
        this$static.alive = 1;
        return this$static;
    }
    /** ce */
    /** ds */
    function $Chunker(this$static, decoder) {
        this$static.decoder = decoder;
        this$static.encoder = null;
        this$static.alive = 1;
        return this$static;
    }
    /** de */
    
    function $processChunk(this$static) {
        if (!this$static.alive) {
            throw new Error("bad state");
        }
        
        if (this$static.encoder) {
            /// do:throw new Error("No encoding");
            /** cs */
            $processEncoderChunk(this$static);
            /** ce */
        } else {
            /// co:throw new Error("No decoding");
            /** ds */
            $processDecoderChunk(this$static);
            /** de */
        }
        return this$static.alive;
    }
    
    /** ds */
    function $processDecoderChunk(this$static) {
        var result = $CodeOneChunk(this$static.decoder);
        if (result == -1) {
            throw new Error("corrupted input");
        }
        this$static.inBytesProcessed = N1_longLit;
        this$static.outBytesProcessed = this$static.decoder.nowPos64;
        if (result || compare(this$static.decoder.outSize, P0_longLit) >= 0 && compare(this$static.decoder.nowPos64, this$static.decoder.outSize) >= 0) {
            $Flush_0(this$static.decoder.m_OutWindow);
            $ReleaseStream(this$static.decoder.m_OutWindow);
            this$static.decoder.m_RangeDecoder.Stream = null;
            this$static.alive = 0;
        }
    }
    /** de */
    /** cs */
    function $processEncoderChunk(this$static) {
        $CodeOneBlock(this$static.encoder, this$static.encoder.processedInSize, this$static.encoder.processedOutSize, this$static.encoder.finished);
        this$static.inBytesProcessed = this$static.encoder.processedInSize[0];
        if (this$static.encoder.finished[0]) {
            $ReleaseStreams(this$static.encoder);
            this$static.alive = 0;
        }
    }
    /** ce */
    
    /** ds */
    function $CodeInChunks(this$static, inStream, outStream, outSize) {
        this$static.m_RangeDecoder.Stream = inStream;
        $ReleaseStream(this$static.m_OutWindow);
        this$static.m_OutWindow._stream = outStream;
        $Init_1(this$static);
        this$static.state = 0;
        this$static.rep0 = 0;
        this$static.rep1 = 0;
        this$static.rep2 = 0;
        this$static.rep3 = 0;
        this$static.outSize = outSize;
        this$static.nowPos64 = P0_longLit;
        this$static.prevByte = 0;
        return $Chunker({}, this$static);
    }
    
    function $CodeOneChunk(this$static) {
        var decoder2, distance, len, numDirectBits, posSlot, posState;
        posState = lowBits_0(this$static.nowPos64) & this$static.m_PosStateMask;
        if (!$DecodeBit(this$static.m_RangeDecoder, this$static.m_IsMatchDecoders, (this$static.state << 4) + posState)) {
            decoder2 = $GetDecoder(this$static.m_LiteralDecoder, lowBits_0(this$static.nowPos64), this$static.prevByte);
            if (this$static.state < 7) {
                this$static.prevByte = $DecodeNormal(decoder2, this$static.m_RangeDecoder);
            } else {
                this$static.prevByte = $DecodeWithMatchByte(decoder2, this$static.m_RangeDecoder, $GetByte(this$static.m_OutWindow, this$static.rep0));
            }
            $PutByte(this$static.m_OutWindow, this$static.prevByte);
            this$static.state = StateUpdateChar(this$static.state);
            this$static.nowPos64 = add(this$static.nowPos64, P1_longLit);
        } else {
            if ($DecodeBit(this$static.m_RangeDecoder, this$static.m_IsRepDecoders, this$static.state)) {
                len = 0;
                if (!$DecodeBit(this$static.m_RangeDecoder, this$static.m_IsRepG0Decoders, this$static.state)) {
                    if (!$DecodeBit(this$static.m_RangeDecoder, this$static.m_IsRep0LongDecoders, (this$static.state << 4) + posState)) {
                        this$static.state = this$static.state < 7?9:11;
                        len = 1;
                    }
                } else {
                    if (!$DecodeBit(this$static.m_RangeDecoder, this$static.m_IsRepG1Decoders, this$static.state)) {
                        distance = this$static.rep1;
                    } else {
                        if (!$DecodeBit(this$static.m_RangeDecoder, this$static.m_IsRepG2Decoders, this$static.state)) {
                            distance = this$static.rep2;
                        } else {
                            distance = this$static.rep3;
                            this$static.rep3 = this$static.rep2;
                        }
                        this$static.rep2 = this$static.rep1;
                    }
                    this$static.rep1 = this$static.rep0;
                    this$static.rep0 = distance;
                }
                if (!len) {
                    len = $Decode(this$static.m_RepLenDecoder, this$static.m_RangeDecoder, posState) + 2;
                    this$static.state = this$static.state < 7?8:11;
                }
            } else {
                this$static.rep3 = this$static.rep2;
                this$static.rep2 = this$static.rep1;
                this$static.rep1 = this$static.rep0;
                len = 2 + $Decode(this$static.m_LenDecoder, this$static.m_RangeDecoder, posState);
                this$static.state = this$static.state < 7?7:10;
                posSlot = $Decode_0(this$static.m_PosSlotDecoder[GetLenToPosState(len)], this$static.m_RangeDecoder);
                if (posSlot >= 4) {
                    numDirectBits = (posSlot >> 1) - 1;
                    this$static.rep0 = (2 | posSlot & 1) << numDirectBits;
                    if (posSlot < 14) {
                        this$static.rep0 += ReverseDecode(this$static.m_PosDecoders, this$static.rep0 - posSlot - 1, this$static.m_RangeDecoder, numDirectBits);
                    } else {
                        this$static.rep0 += $DecodeDirectBits(this$static.m_RangeDecoder, numDirectBits - 4) << 4;
                        this$static.rep0 += $ReverseDecode(this$static.m_PosAlignDecoder, this$static.m_RangeDecoder);
                        if (this$static.rep0 < 0) {
                            if (this$static.rep0 == -1) {
                                return 1;
                            }
                            return -1;
                        }
                    }
                } else 
                    this$static.rep0 = posSlot;
            }
            if (compare(fromInt(this$static.rep0), this$static.nowPos64) >= 0 || this$static.rep0 >= this$static.m_DictionarySizeCheck) {
                return -1;
            }
            $CopyBlock(this$static.m_OutWindow, this$static.rep0, len);
            this$static.nowPos64 = add(this$static.nowPos64, fromInt(len));
            this$static.prevByte = $GetByte(this$static.m_OutWindow, 0);
        }
        return 0;
    }
    
    function $Decoder(this$static) {
        this$static.m_OutWindow = {};
        this$static.m_RangeDecoder = {};
        this$static.m_IsMatchDecoders = initDim(192);
        this$static.m_IsRepDecoders = initDim(12);
        this$static.m_IsRepG0Decoders = initDim(12);
        this$static.m_IsRepG1Decoders = initDim(12);
        this$static.m_IsRepG2Decoders = initDim(12);
        this$static.m_IsRep0LongDecoders = initDim(192);
        this$static.m_PosSlotDecoder = initDim(4);
        this$static.m_PosDecoders = initDim(114);
        this$static.m_PosAlignDecoder = $BitTreeDecoder({}, 4);
        this$static.m_LenDecoder = $Decoder$LenDecoder({});
        this$static.m_RepLenDecoder = $Decoder$LenDecoder({});
        this$static.m_LiteralDecoder = {};
        for (var i = 0; i < 4; ++i) {
            this$static.m_PosSlotDecoder[i] = $BitTreeDecoder({}, 6);
        }
        return this$static;
    }
    
    function $Init_1(this$static) {
        this$static.m_OutWindow._streamPos = 0;
        this$static.m_OutWindow._pos = 0;
        InitBitModels(this$static.m_IsMatchDecoders);
        InitBitModels(this$static.m_IsRep0LongDecoders);
        InitBitModels(this$static.m_IsRepDecoders);
        InitBitModels(this$static.m_IsRepG0Decoders);
        InitBitModels(this$static.m_IsRepG1Decoders);
        InitBitModels(this$static.m_IsRepG2Decoders);
        InitBitModels(this$static.m_PosDecoders);
        $Init_0(this$static.m_LiteralDecoder);
        for (var i = 0; i < 4; ++i) {
            InitBitModels(this$static.m_PosSlotDecoder[i].Models);
        }
        $Init(this$static.m_LenDecoder);
        $Init(this$static.m_RepLenDecoder);
        InitBitModels(this$static.m_PosAlignDecoder.Models);
        $Init_8(this$static.m_RangeDecoder);
    }
    
    function $SetDecoderProperties(this$static, properties) {
        var dictionarySize, i, lc, lp, pb, remainder, val;
        if (properties.length < 5)
            return 0;
        val = properties[0] & 255;
        lc = val % 9;
        remainder = ~~(val / 9);
        lp = remainder % 5;
        pb = ~~(remainder / 5);
        dictionarySize = 0;
        for (i = 0; i < 4; ++i) {
            dictionarySize += (properties[1 + i] & 255) << i * 8;
        }
        ///NOTE: If the input is bad, it might call for an insanely large dictionary size, which would crash the script.
        if (dictionarySize > 99999999 || !$SetLcLpPb(this$static, lc, lp, pb)) {
            return 0;
        }
        return $SetDictionarySize(this$static, dictionarySize);
    }
    
    function $SetDictionarySize(this$static, dictionarySize) {
        if (dictionarySize < 0) {
            return 0;
        }
        if (this$static.m_DictionarySize != dictionarySize) {
            this$static.m_DictionarySize = dictionarySize;
            this$static.m_DictionarySizeCheck = Math.max(this$static.m_DictionarySize, 1);
            $Create_5(this$static.m_OutWindow, Math.max(this$static.m_DictionarySizeCheck, 4096));
        }
        return 1;
    }
    
    function $SetLcLpPb(this$static, lc, lp, pb) {
        if (lc > 8 || lp > 4 || pb > 4) {
            return 0;
        }
        $Create_0(this$static.m_LiteralDecoder, lp, lc);
        var numPosStates = 1 << pb;
        $Create(this$static.m_LenDecoder, numPosStates);
        $Create(this$static.m_RepLenDecoder, numPosStates);
        this$static.m_PosStateMask = numPosStates - 1;
        return 1;
    }
    
    function $Create(this$static, numPosStates) {
        for (; this$static.m_NumPosStates < numPosStates; ++this$static.m_NumPosStates) {
            this$static.m_LowCoder[this$static.m_NumPosStates] = $BitTreeDecoder({}, 3);
            this$static.m_MidCoder[this$static.m_NumPosStates] = $BitTreeDecoder({}, 3);
        }
    }
    
    function $Decode(this$static, rangeDecoder, posState) {
        if (!$DecodeBit(rangeDecoder, this$static.m_Choice, 0)) {
            return $Decode_0(this$static.m_LowCoder[posState], rangeDecoder);
        }
        var symbol = 8;
        if (!$DecodeBit(rangeDecoder, this$static.m_Choice, 1)) {
            symbol += $Decode_0(this$static.m_MidCoder[posState], rangeDecoder);
        } else {
            symbol += 8 + $Decode_0(this$static.m_HighCoder, rangeDecoder);
        }
        return symbol;
    }
    
    function $Decoder$LenDecoder(this$static) {
        this$static.m_Choice = initDim(2);
        this$static.m_LowCoder = initDim(16);
        this$static.m_MidCoder = initDim(16);
        this$static.m_HighCoder = $BitTreeDecoder({}, 8);
        this$static.m_NumPosStates = 0;
        return this$static;
    }
    
    function $Init(this$static) {
        InitBitModels(this$static.m_Choice);
        for (var posState = 0; posState < this$static.m_NumPosStates; ++posState) {
            InitBitModels(this$static.m_LowCoder[posState].Models);
            InitBitModels(this$static.m_MidCoder[posState].Models);
        }
        InitBitModels(this$static.m_HighCoder.Models);
    }
    
    
    function $Create_0(this$static, numPosBits, numPrevBits) {
        var i, numStates;
        if (this$static.m_Coders != null && this$static.m_NumPrevBits == numPrevBits && this$static.m_NumPosBits == numPosBits)
            return;
        this$static.m_NumPosBits = numPosBits;
        this$static.m_PosMask = (1 << numPosBits) - 1;
        this$static.m_NumPrevBits = numPrevBits;
        numStates = 1 << this$static.m_NumPrevBits + this$static.m_NumPosBits;
        this$static.m_Coders = initDim(numStates);
        for (i = 0; i < numStates; ++i)
            this$static.m_Coders[i] = $Decoder$LiteralDecoder$Decoder2({});
    }
    
    function $GetDecoder(this$static, pos, prevByte) {
        return this$static.m_Coders[((pos & this$static.m_PosMask) << this$static.m_NumPrevBits) + ((prevByte & 255) >>> 8 - this$static.m_NumPrevBits)];
    }
    
    function $Init_0(this$static) {
        var i, numStates;
        numStates = 1 << this$static.m_NumPrevBits + this$static.m_NumPosBits;
        for (i = 0; i < numStates; ++i) {
            InitBitModels(this$static.m_Coders[i].m_Decoders);
        }
    }
    
    
    function $DecodeNormal(this$static, rangeDecoder) {
        var symbol = 1;
        do {
            symbol = symbol << 1 | $DecodeBit(rangeDecoder, this$static.m_Decoders, symbol);
        } while (symbol < 256);
        return symbol << 24 >> 24;
    }
    
    function $DecodeWithMatchByte(this$static, rangeDecoder, matchByte) {
        var bit, matchBit, symbol = 1;
        do {
            matchBit = matchByte >> 7 & 1;
            matchByte <<= 1;
            bit = $DecodeBit(rangeDecoder, this$static.m_Decoders, (1 + matchBit << 8) + symbol);
            symbol = symbol << 1 | bit;
            if (matchBit != bit) {
                while (symbol < 256) {
                    symbol = symbol << 1 | $DecodeBit(rangeDecoder, this$static.m_Decoders, symbol);
                }
            break;
            }
        } while (symbol < 256);
        return symbol << 24 >> 24;
    }
    
    function $Decoder$LiteralDecoder$Decoder2(this$static) {
        this$static.m_Decoders = initDim(768);
        return this$static;
    }
    
    /** de */
    /** cs */
    var g_FastPos = (function () {
        var j, k, slotFast, c = 2, g_FastPos = [0, 1];
        for (slotFast = 2; slotFast < 22; ++slotFast) {
            k = 1 << (slotFast >> 1) - 1;
            for (j = 0; j < k; ++j , ++c)
                g_FastPos[c] = slotFast << 24 >> 24;
        }
        return g_FastPos;
    }());
    
    function $Backward(this$static, cur) {
        var backCur, backMem, posMem, posPrev;
        this$static._optimumEndIndex = cur;
        posMem = this$static._optimum[cur].PosPrev;
        backMem = this$static._optimum[cur].BackPrev;
        do {
            if (this$static._optimum[cur].Prev1IsChar) {
                $MakeAsChar(this$static._optimum[posMem]);
                this$static._optimum[posMem].PosPrev = posMem - 1;
                if (this$static._optimum[cur].Prev2) {
                    this$static._optimum[posMem - 1].Prev1IsChar = 0;
                    this$static._optimum[posMem - 1].PosPrev = this$static._optimum[cur].PosPrev2;
                    this$static._optimum[posMem - 1].BackPrev = this$static._optimum[cur].BackPrev2;
                }
            }
            posPrev = posMem;
            backCur = backMem;
            backMem = this$static._optimum[posPrev].BackPrev;
            posMem = this$static._optimum[posPrev].PosPrev;
            this$static._optimum[posPrev].BackPrev = backCur;
            this$static._optimum[posPrev].PosPrev = cur;
            cur = posPrev;
        } while (cur > 0);
        this$static.backRes = this$static._optimum[0].BackPrev;
        this$static._optimumCurrentIndex = this$static._optimum[0].PosPrev;
        return this$static._optimumCurrentIndex;
    }
    
    function $BaseInit(this$static) {
        this$static._state = 0;
        this$static._previousByte = 0;
        for (var i = 0; i < 4; ++i) {
            this$static._repDistances[i] = 0;
        }
    }
    
    function $CodeOneBlock(this$static, inSize, outSize, finished) {
        var baseVal, complexState, curByte, distance, footerBits, i, len, lenToPosState, matchByte, pos, posReduced, posSlot, posState, progressPosValuePrev, subCoder;
        inSize[0] = P0_longLit;
        outSize[0] = P0_longLit;
        finished[0] = 1;
        if (this$static._inStream) {
            this$static._matchFinder._stream = this$static._inStream;
            $Init_5(this$static._matchFinder);
            this$static._needReleaseMFStream = 1;
            this$static._inStream = null;
        }
        if (this$static._finished) {
            return;
        }
        this$static._finished = 1;
        progressPosValuePrev = this$static.nowPos64;
        if (eq(this$static.nowPos64, P0_longLit)) {
            if (!$GetNumAvailableBytes(this$static._matchFinder)) {
                $Flush(this$static, lowBits_0(this$static.nowPos64));
                return;
            }
            $ReadMatchDistances(this$static);
            posState = lowBits_0(this$static.nowPos64) & this$static._posStateMask;
            $Encode_3(this$static._rangeEncoder, this$static._isMatch, (this$static._state << 4) + posState, 0);
            this$static._state = StateUpdateChar(this$static._state);
            curByte = $GetIndexByte(this$static._matchFinder, -this$static._additionalOffset);
            $Encode_1($GetSubCoder(this$static._literalEncoder, lowBits_0(this$static.nowPos64), this$static._previousByte), this$static._rangeEncoder, curByte);
            this$static._previousByte = curByte;
            --this$static._additionalOffset;
            this$static.nowPos64 = add(this$static.nowPos64, P1_longLit);
        }
        if (!$GetNumAvailableBytes(this$static._matchFinder)) {
            $Flush(this$static, lowBits_0(this$static.nowPos64));
            return;
        }
        while (1) {
            len = $GetOptimum(this$static, lowBits_0(this$static.nowPos64));
            pos = this$static.backRes;
            posState = lowBits_0(this$static.nowPos64) & this$static._posStateMask;
            complexState = (this$static._state << 4) + posState;
            if (len == 1 && pos == -1) {
                $Encode_3(this$static._rangeEncoder, this$static._isMatch, complexState, 0);
                curByte = $GetIndexByte(this$static._matchFinder, -this$static._additionalOffset);
                subCoder = $GetSubCoder(this$static._literalEncoder, lowBits_0(this$static.nowPos64), this$static._previousByte);
                if (this$static._state < 7) {
                    $Encode_1(subCoder, this$static._rangeEncoder, curByte);
                } else {
                    matchByte = $GetIndexByte(this$static._matchFinder, -this$static._repDistances[0] - 1 - this$static._additionalOffset);
                    $EncodeMatched(subCoder, this$static._rangeEncoder, matchByte, curByte);
                }
                this$static._previousByte = curByte;
                this$static._state = StateUpdateChar(this$static._state);
            } else {
                $Encode_3(this$static._rangeEncoder, this$static._isMatch, complexState, 1);
                if (pos < 4) {
                    $Encode_3(this$static._rangeEncoder, this$static._isRep, this$static._state, 1);
                    if (!pos) {
                        $Encode_3(this$static._rangeEncoder, this$static._isRepG0, this$static._state, 0);
                        if (len == 1) {
                            $Encode_3(this$static._rangeEncoder, this$static._isRep0Long, complexState, 0);
                        } else {
                            $Encode_3(this$static._rangeEncoder, this$static._isRep0Long, complexState, 1);
                        }
                    } else {
                        $Encode_3(this$static._rangeEncoder, this$static._isRepG0, this$static._state, 1);
                        if (pos == 1) {
                            $Encode_3(this$static._rangeEncoder, this$static._isRepG1, this$static._state, 0);
                        } else {
                            $Encode_3(this$static._rangeEncoder, this$static._isRepG1, this$static._state, 1);
                            $Encode_3(this$static._rangeEncoder, this$static._isRepG2, this$static._state, pos - 2);
                        }
                    }
                    if (len == 1) {
                        this$static._state = this$static._state < 7?9:11;
                    } else {
                        $Encode_0(this$static._repMatchLenEncoder, this$static._rangeEncoder, len - 2, posState);
                        this$static._state = this$static._state < 7?8:11;
                    }
                    distance = this$static._repDistances[pos];
                    if (pos != 0) {
                        for (i = pos; i >= 1; --i) {
                            this$static._repDistances[i] = this$static._repDistances[i - 1];
                        }
                        this$static._repDistances[0] = distance;
                    }
                } else {
                    $Encode_3(this$static._rangeEncoder, this$static._isRep, this$static._state, 0);
                    this$static._state = this$static._state < 7?7:10;
                    $Encode_0(this$static._lenEncoder, this$static._rangeEncoder, len - 2, posState);
                    pos -= 4;
                    posSlot = GetPosSlot(pos);
                    lenToPosState = GetLenToPosState(len);
                    $Encode_2(this$static._posSlotEncoder[lenToPosState], this$static._rangeEncoder, posSlot);
                    if (posSlot >= 4) {
                        footerBits = (posSlot >> 1) - 1;
                        baseVal = (2 | posSlot & 1) << footerBits;
                        posReduced = pos - baseVal;
                        if (posSlot < 14) {
                            ReverseEncode(this$static._posEncoders, baseVal - posSlot - 1, this$static._rangeEncoder, footerBits, posReduced);
                        } else {
                            $EncodeDirectBits(this$static._rangeEncoder, posReduced >> 4, footerBits - 4);
                            $ReverseEncode(this$static._posAlignEncoder, this$static._rangeEncoder, posReduced & 15);
                            ++this$static._alignPriceCount;
                        }
                    }
                    distance = pos;
                    for (i = 3; i >= 1; --i) {
                        this$static._repDistances[i] = this$static._repDistances[i - 1];
                    }
                    this$static._repDistances[0] = distance;
                    ++this$static._matchPriceCount;
                }
                this$static._previousByte = $GetIndexByte(this$static._matchFinder, len - 1 - this$static._additionalOffset);
            }
            this$static._additionalOffset -= len;
            this$static.nowPos64 = add(this$static.nowPos64, fromInt(len));
            if (!this$static._additionalOffset) {
                if (this$static._matchPriceCount >= 128) {
                    $FillDistancesPrices(this$static);
                }
                if (this$static._alignPriceCount >= 16) {
                    $FillAlignPrices(this$static);
                }
                inSize[0] = this$static.nowPos64;
                outSize[0] = $GetProcessedSizeAdd(this$static._rangeEncoder);
                if (!$GetNumAvailableBytes(this$static._matchFinder)) {
                    $Flush(this$static, lowBits_0(this$static.nowPos64));
                    return;
                }
                if (compare(sub(this$static.nowPos64, progressPosValuePrev), [4096, 0]) >= 0) {
                    this$static._finished = 0;
                    finished[0] = 0;
                    return;
                }
            }
        }
    }
    
    function $Create_2(this$static) {
        var bt, numHashBytes;
        if (!this$static._matchFinder) {
            bt = {};
            numHashBytes = 4;
            if (!this$static._matchFinderType) {
                numHashBytes = 2;
            }
            $SetType(bt, numHashBytes);
            this$static._matchFinder = bt;
        }
        $Create_1(this$static._literalEncoder, this$static._numLiteralPosStateBits, this$static._numLiteralContextBits);
        if (this$static._dictionarySize == this$static._dictionarySizePrev && this$static._numFastBytesPrev == this$static._numFastBytes) {
            return;
        }
        $Create_3(this$static._matchFinder, this$static._dictionarySize, 4096, this$static._numFastBytes, 274);
        this$static._dictionarySizePrev = this$static._dictionarySize;
        this$static._numFastBytesPrev = this$static._numFastBytes;
    }
    
    function $Encoder(this$static) {
        var i;
        this$static._repDistances = initDim(4);
        this$static._optimum = [];
        this$static._rangeEncoder = {};
        this$static._isMatch = initDim(192);
        this$static._isRep = initDim(12);
        this$static._isRepG0 = initDim(12);
        this$static._isRepG1 = initDim(12);
        this$static._isRepG2 = initDim(12);
        this$static._isRep0Long = initDim(192);
        this$static._posSlotEncoder = [];
        this$static._posEncoders = initDim(114);
        this$static._posAlignEncoder = $BitTreeEncoder({}, 4);
        this$static._lenEncoder = $Encoder$LenPriceTableEncoder({});
        this$static._repMatchLenEncoder = $Encoder$LenPriceTableEncoder({});
        this$static._literalEncoder = {};
        this$static._matchDistances = [];
        this$static._posSlotPrices = [];
        this$static._distancesPrices = [];
        this$static._alignPrices = initDim(16);
        this$static.reps = initDim(4);
        this$static.repLens = initDim(4);
        this$static.processedInSize = [P0_longLit];
        this$static.processedOutSize = [P0_longLit];
        this$static.finished = [0];
        this$static.properties = initDim(5);
        this$static.tempPrices = initDim(128);
        this$static._longestMatchLength = 0;
        this$static._matchFinderType = 1;
        this$static._numDistancePairs = 0;
        this$static._numFastBytesPrev = -1;
        this$static.backRes = 0;
        for (i = 0; i < 4096; ++i) {
            this$static._optimum[i] = {};
        }
        for (i = 0; i < 4; ++i) {
            this$static._posSlotEncoder[i] = $BitTreeEncoder({}, 6);
        }
        return this$static;
    }
    
    function $FillAlignPrices(this$static) {
        for (var i = 0; i < 16; ++i) {
            this$static._alignPrices[i] = $ReverseGetPrice(this$static._posAlignEncoder, i);
        }
        this$static._alignPriceCount = 0;
    }
    
    function $FillDistancesPrices(this$static) {
        var baseVal, encoder, footerBits, i, lenToPosState, posSlot, st, st2;
        for (i = 4; i < 128; ++i) {
            posSlot = GetPosSlot(i);
            footerBits = (posSlot >> 1) - 1;
            baseVal = (2 | posSlot & 1) << footerBits;
            this$static.tempPrices[i] = ReverseGetPrice(this$static._posEncoders, baseVal - posSlot - 1, footerBits, i - baseVal);
        }
        for (lenToPosState = 0; lenToPosState < 4; ++lenToPosState) {
            encoder = this$static._posSlotEncoder[lenToPosState];
            st = lenToPosState << 6;
            for (posSlot = 0; posSlot < this$static._distTableSize; ++posSlot) {
                this$static._posSlotPrices[st + posSlot] = $GetPrice_1(encoder, posSlot);
            }
            for (posSlot = 14; posSlot < this$static._distTableSize; ++posSlot) {
                this$static._posSlotPrices[st + posSlot] += (posSlot >> 1) - 1 - 4 << 6;
            }
            st2 = lenToPosState * 128;
            for (i = 0; i < 4; ++i) {
                this$static._distancesPrices[st2 + i] = this$static._posSlotPrices[st + i];
            }
            for (; i < 128; ++i) {
                this$static._distancesPrices[st2 + i] = this$static._posSlotPrices[st + GetPosSlot(i)] + this$static.tempPrices[i];
            }
        }
        this$static._matchPriceCount = 0;
    }
    
    function $Flush(this$static, nowPos) {
        $ReleaseMFStream(this$static);
        $WriteEndMarker(this$static, nowPos & this$static._posStateMask);
        for (var i = 0; i < 5; ++i) {
            $ShiftLow(this$static._rangeEncoder);
        }
    }
    
    function $GetOptimum(this$static, position) {
        var cur, curAnd1Price, curAndLenCharPrice, curAndLenPrice, curBack, curPrice, currentByte, distance, i, len, lenEnd, lenMain, lenRes, lenTest, lenTest2, lenTestTemp, matchByte, matchPrice, newLen, nextIsChar, nextMatchPrice, nextOptimum, nextRepMatchPrice, normalMatchPrice, numAvailableBytes, numAvailableBytesFull, numDistancePairs, offs, offset, opt, optimum, pos, posPrev, posState, posStateNext, price_4, repIndex, repLen, repMatchPrice, repMaxIndex, shortRepPrice, startLen, state, state2, t, price, price_0, price_1, price_2, price_3;
        if (this$static._optimumEndIndex != this$static._optimumCurrentIndex) {
            lenRes = this$static._optimum[this$static._optimumCurrentIndex].PosPrev - this$static._optimumCurrentIndex;
            this$static.backRes = this$static._optimum[this$static._optimumCurrentIndex].BackPrev;
            this$static._optimumCurrentIndex = this$static._optimum[this$static._optimumCurrentIndex].PosPrev;
            return lenRes;
        }
        this$static._optimumCurrentIndex = this$static._optimumEndIndex = 0;
        if (this$static._longestMatchWasFound) {
            lenMain = this$static._longestMatchLength;
            this$static._longestMatchWasFound = 0;
        } else {
            lenMain = $ReadMatchDistances(this$static);
        }
        numDistancePairs = this$static._numDistancePairs;
        numAvailableBytes = $GetNumAvailableBytes(this$static._matchFinder) + 1;
        if (numAvailableBytes < 2) {
            this$static.backRes = -1;
            return 1;
        }
        if (numAvailableBytes > 273) {
            numAvailableBytes = 273;
        }
        repMaxIndex = 0;
        for (i = 0; i < 4; ++i) {
            this$static.reps[i] = this$static._repDistances[i];
            this$static.repLens[i] = $GetMatchLen(this$static._matchFinder, -1, this$static.reps[i], 273);
            if (this$static.repLens[i] > this$static.repLens[repMaxIndex]) {
                repMaxIndex = i;
            }
        }
        if (this$static.repLens[repMaxIndex] >= this$static._numFastBytes) {
            this$static.backRes = repMaxIndex;
            lenRes = this$static.repLens[repMaxIndex];
            $MovePos(this$static, lenRes - 1);
            return lenRes;
        }
        if (lenMain >= this$static._numFastBytes) {
            this$static.backRes = this$static._matchDistances[numDistancePairs - 1] + 4;
            $MovePos(this$static, lenMain - 1);
            return lenMain;
        }
        currentByte = $GetIndexByte(this$static._matchFinder, -1);
        matchByte = $GetIndexByte(this$static._matchFinder, -this$static._repDistances[0] - 1 - 1);
        if (lenMain < 2 && currentByte != matchByte && this$static.repLens[repMaxIndex] < 2) {
            this$static.backRes = -1;
            return 1;
        }
        this$static._optimum[0].State = this$static._state;
        posState = position & this$static._posStateMask;
        this$static._optimum[1].Price = ProbPrices[this$static._isMatch[(this$static._state << 4) + posState] >>> 2] + $GetPrice_0($GetSubCoder(this$static._literalEncoder, position, this$static._previousByte), this$static._state >= 7, matchByte, currentByte);
        $MakeAsChar(this$static._optimum[1]);
        matchPrice = ProbPrices[2048 - this$static._isMatch[(this$static._state << 4) + posState] >>> 2];
        repMatchPrice = matchPrice + ProbPrices[2048 - this$static._isRep[this$static._state] >>> 2];
        if (matchByte == currentByte) {
            shortRepPrice = repMatchPrice + $GetRepLen1Price(this$static, this$static._state, posState);
            if (shortRepPrice < this$static._optimum[1].Price) {
                this$static._optimum[1].Price = shortRepPrice;
                $MakeAsShortRep(this$static._optimum[1]);
            }
        }
        lenEnd = lenMain >= this$static.repLens[repMaxIndex]?lenMain:this$static.repLens[repMaxIndex];
        if (lenEnd < 2) {
            this$static.backRes = this$static._optimum[1].BackPrev;
            return 1;
        }
        this$static._optimum[1].PosPrev = 0;
        this$static._optimum[0].Backs0 = this$static.reps[0];
        this$static._optimum[0].Backs1 = this$static.reps[1];
        this$static._optimum[0].Backs2 = this$static.reps[2];
        this$static._optimum[0].Backs3 = this$static.reps[3];
        len = lenEnd;
        do {
            this$static._optimum[len--].Price = 268435455;
        } while (len >= 2);
        for (i = 0; i < 4; ++i) {
            repLen = this$static.repLens[i];
            if (repLen < 2) {
                continue;
            }
            price_4 = repMatchPrice + $GetPureRepPrice(this$static, i, this$static._state, posState);
            do {
                curAndLenPrice = price_4 + $GetPrice(this$static._repMatchLenEncoder, repLen - 2, posState);
                optimum = this$static._optimum[repLen];
                if (curAndLenPrice < optimum.Price) {
                    optimum.Price = curAndLenPrice;
                    optimum.PosPrev = 0;
                    optimum.BackPrev = i;
                    optimum.Prev1IsChar = 0;
                }
            } while (--repLen >= 2);
        }
        normalMatchPrice = matchPrice + ProbPrices[this$static._isRep[this$static._state] >>> 2];
        len = this$static.repLens[0] >= 2?this$static.repLens[0] + 1:2;
        if (len <= lenMain) {
            offs = 0;
            while (len > this$static._matchDistances[offs]) {
                offs += 2;
            }
            for (;; ++len) {
                distance = this$static._matchDistances[offs + 1];
                curAndLenPrice = normalMatchPrice + $GetPosLenPrice(this$static, distance, len, posState);
                optimum = this$static._optimum[len];
                if (curAndLenPrice < optimum.Price) {
                    optimum.Price = curAndLenPrice;
                    optimum.PosPrev = 0;
                    optimum.BackPrev = distance + 4;
                    optimum.Prev1IsChar = 0;
                }
                if (len == this$static._matchDistances[offs]) {
                    offs += 2;
                    if (offs == numDistancePairs) {
                        break;
                    }
                }
            }
        }
        cur = 0;
        while (1) {
            ++cur;
            if (cur == lenEnd) {
                return $Backward(this$static, cur);
            }
            newLen = $ReadMatchDistances(this$static);
            numDistancePairs = this$static._numDistancePairs;
            if (newLen >= this$static._numFastBytes) {
                this$static._longestMatchLength = newLen;
                this$static._longestMatchWasFound = 1;
                return $Backward(this$static, cur);
            }
            ++position;
            posPrev = this$static._optimum[cur].PosPrev;
            if (this$static._optimum[cur].Prev1IsChar) {
                --posPrev;
                if (this$static._optimum[cur].Prev2) {
                    state = this$static._optimum[this$static._optimum[cur].PosPrev2].State;
                    if (this$static._optimum[cur].BackPrev2 < 4) {
                        state = (state < 7) ? 8 : 11;
                    } else {
                        state = (state < 7) ? 7 : 10;
                    }
                } else {
                    state = this$static._optimum[posPrev].State;
                }
                state = StateUpdateChar(state);
            } else {
                state = this$static._optimum[posPrev].State;
            }
            if (posPrev == cur - 1) {
                if (!this$static._optimum[cur].BackPrev) {
                    state = state < 7?9:11;
                } else {
                    state = StateUpdateChar(state);
                }
            } else {
                if (this$static._optimum[cur].Prev1IsChar && this$static._optimum[cur].Prev2) {
                    posPrev = this$static._optimum[cur].PosPrev2;
                    pos = this$static._optimum[cur].BackPrev2;
                    state = state < 7?8:11;
                } else {
                    pos = this$static._optimum[cur].BackPrev;
                    if (pos < 4) {
                        state = state < 7?8:11;
                    } else {
                        state = state < 7?7:10;
                    }
                }
                opt = this$static._optimum[posPrev];
                if (pos < 4) {
                    if (!pos) {
                        this$static.reps[0] = opt.Backs0;
                        this$static.reps[1] = opt.Backs1;
                        this$static.reps[2] = opt.Backs2;
                        this$static.reps[3] = opt.Backs3;
                    } else if (pos == 1) {
                        this$static.reps[0] = opt.Backs1;
                        this$static.reps[1] = opt.Backs0;
                        this$static.reps[2] = opt.Backs2;
                        this$static.reps[3] = opt.Backs3;
                    } else if (pos == 2) {
                        this$static.reps[0] = opt.Backs2;
                        this$static.reps[1] = opt.Backs0;
                        this$static.reps[2] = opt.Backs1;
                        this$static.reps[3] = opt.Backs3;
                    } else {
                        this$static.reps[0] = opt.Backs3;
                        this$static.reps[1] = opt.Backs0;
                        this$static.reps[2] = opt.Backs1;
                        this$static.reps[3] = opt.Backs2;
                    }
                } else {
                    this$static.reps[0] = pos - 4;
                    this$static.reps[1] = opt.Backs0;
                    this$static.reps[2] = opt.Backs1;
                    this$static.reps[3] = opt.Backs2;
                }
            }
            this$static._optimum[cur].State = state;
            this$static._optimum[cur].Backs0 = this$static.reps[0];
            this$static._optimum[cur].Backs1 = this$static.reps[1];
            this$static._optimum[cur].Backs2 = this$static.reps[2];
            this$static._optimum[cur].Backs3 = this$static.reps[3];
            curPrice = this$static._optimum[cur].Price;
            currentByte = $GetIndexByte(this$static._matchFinder, -1);
            matchByte = $GetIndexByte(this$static._matchFinder, -this$static.reps[0] - 1 - 1);
            posState = position & this$static._posStateMask;
            curAnd1Price = curPrice + ProbPrices[this$static._isMatch[(state << 4) + posState] >>> 2] + $GetPrice_0($GetSubCoder(this$static._literalEncoder, position, $GetIndexByte(this$static._matchFinder, -2)), state >= 7, matchByte, currentByte);
            nextOptimum = this$static._optimum[cur + 1];
            nextIsChar = 0;
            if (curAnd1Price < nextOptimum.Price) {
                nextOptimum.Price = curAnd1Price;
                nextOptimum.PosPrev = cur;
                nextOptimum.BackPrev = -1;
                nextOptimum.Prev1IsChar = 0;
                nextIsChar = 1;
            }
            matchPrice = curPrice + ProbPrices[2048 - this$static._isMatch[(state << 4) + posState] >>> 2];
            repMatchPrice = matchPrice + ProbPrices[2048 - this$static._isRep[state] >>> 2];
            if (matchByte == currentByte && !(nextOptimum.PosPrev < cur && !nextOptimum.BackPrev)) {
                shortRepPrice = repMatchPrice + (ProbPrices[this$static._isRepG0[state] >>> 2] + ProbPrices[this$static._isRep0Long[(state << 4) + posState] >>> 2]);
                if (shortRepPrice <= nextOptimum.Price) {
                    nextOptimum.Price = shortRepPrice;
                    nextOptimum.PosPrev = cur;
                    nextOptimum.BackPrev = 0;
                    nextOptimum.Prev1IsChar = 0;
                    nextIsChar = 1;
                }
            }
            numAvailableBytesFull = $GetNumAvailableBytes(this$static._matchFinder) + 1;
            numAvailableBytesFull = 4095 - cur < numAvailableBytesFull?4095 - cur:numAvailableBytesFull;
            numAvailableBytes = numAvailableBytesFull;
            if (numAvailableBytes < 2) {
                continue;
            }
            if (numAvailableBytes > this$static._numFastBytes) {
                numAvailableBytes = this$static._numFastBytes;
            }
            if (!nextIsChar && matchByte != currentByte) {
                t = Math.min(numAvailableBytesFull - 1, this$static._numFastBytes);
                lenTest2 = $GetMatchLen(this$static._matchFinder, 0, this$static.reps[0], t);
                if (lenTest2 >= 2) {
                    state2 = StateUpdateChar(state);
                    posStateNext = position + 1 & this$static._posStateMask;
                    nextRepMatchPrice = curAnd1Price + ProbPrices[2048 - this$static._isMatch[(state2 << 4) + posStateNext] >>> 2] + ProbPrices[2048 - this$static._isRep[state2] >>> 2];
                    offset = cur + 1 + lenTest2;
                    while (lenEnd < offset) {
                        this$static._optimum[++lenEnd].Price = 268435455;
                    }
                    curAndLenPrice = nextRepMatchPrice + (price = $GetPrice(this$static._repMatchLenEncoder, lenTest2 - 2, posStateNext) , price + $GetPureRepPrice(this$static, 0, state2, posStateNext));
                    optimum = this$static._optimum[offset];
                    if (curAndLenPrice < optimum.Price) {
                        optimum.Price = curAndLenPrice;
                        optimum.PosPrev = cur + 1;
                        optimum.BackPrev = 0;
                        optimum.Prev1IsChar = 1;
                        optimum.Prev2 = 0;
                    }
                }
            }
            startLen = 2;
            for (repIndex = 0; repIndex < 4; ++repIndex) {
                lenTest = $GetMatchLen(this$static._matchFinder, -1, this$static.reps[repIndex], numAvailableBytes);
                if (lenTest < 2) {
                    continue;
                }
                lenTestTemp = lenTest;
                do {
                    while (lenEnd < cur + lenTest) {
                        this$static._optimum[++lenEnd].Price = 268435455;
                    }
                    curAndLenPrice = repMatchPrice + (price_0 = $GetPrice(this$static._repMatchLenEncoder, lenTest - 2, posState) , price_0 + $GetPureRepPrice(this$static, repIndex, state, posState));
                    optimum = this$static._optimum[cur + lenTest];
                    if (curAndLenPrice < optimum.Price) {
                        optimum.Price = curAndLenPrice;
                        optimum.PosPrev = cur;
                        optimum.BackPrev = repIndex;
                        optimum.Prev1IsChar = 0;
                    }
                } while (--lenTest >= 2);
                lenTest = lenTestTemp;
                if (!repIndex) {
                    startLen = lenTest + 1;
                }
                if (lenTest < numAvailableBytesFull) {
                    t = Math.min(numAvailableBytesFull - 1 - lenTest, this$static._numFastBytes);
                    lenTest2 = $GetMatchLen(this$static._matchFinder, lenTest, this$static.reps[repIndex], t);
                    if (lenTest2 >= 2) {
                        state2 = state < 7?8:11;
                        posStateNext = position + lenTest & this$static._posStateMask;
                        curAndLenCharPrice = repMatchPrice + (price_1 = $GetPrice(this$static._repMatchLenEncoder, lenTest - 2, posState) , price_1 + $GetPureRepPrice(this$static, repIndex, state, posState)) + ProbPrices[this$static._isMatch[(state2 << 4) + posStateNext] >>> 2] + $GetPrice_0($GetSubCoder(this$static._literalEncoder, position + lenTest, $GetIndexByte(this$static._matchFinder, lenTest - 1 - 1)), 1, $GetIndexByte(this$static._matchFinder, lenTest - 1 - (this$static.reps[repIndex] + 1)), $GetIndexByte(this$static._matchFinder, lenTest - 1));
                        state2 = StateUpdateChar(state2);
                        posStateNext = position + lenTest + 1 & this$static._posStateMask;
                        nextMatchPrice = curAndLenCharPrice + ProbPrices[2048 - this$static._isMatch[(state2 << 4) + posStateNext] >>> 2];
                        nextRepMatchPrice = nextMatchPrice + ProbPrices[2048 - this$static._isRep[state2] >>> 2];
                        offset = lenTest + 1 + lenTest2;
                        while (lenEnd < cur + offset) {
                            this$static._optimum[++lenEnd].Price = 268435455;
                        }
                        curAndLenPrice = nextRepMatchPrice + (price_2 = $GetPrice(this$static._repMatchLenEncoder, lenTest2 - 2, posStateNext) , price_2 + $GetPureRepPrice(this$static, 0, state2, posStateNext));
                        optimum = this$static._optimum[cur + offset];
                        if (curAndLenPrice < optimum.Price) {
                            optimum.Price = curAndLenPrice;
                            optimum.PosPrev = cur + lenTest + 1;
                            optimum.BackPrev = 0;
                            optimum.Prev1IsChar = 1;
                            optimum.Prev2 = 1;
                            optimum.PosPrev2 = cur;
                            optimum.BackPrev2 = repIndex;
                        }
                    }
                }
            }
            if (newLen > numAvailableBytes) {
                newLen = numAvailableBytes;
                for (numDistancePairs = 0; newLen > this$static._matchDistances[numDistancePairs]; numDistancePairs += 2) {}
                this$static._matchDistances[numDistancePairs] = newLen;
                numDistancePairs += 2;
            }
            if (newLen >= startLen) {
            normalMatchPrice = matchPrice + ProbPrices[this$static._isRep[state] >>> 2];
            while (lenEnd < cur + newLen) {
                this$static._optimum[++lenEnd].Price = 268435455;
            }
            offs = 0;
            while (startLen > this$static._matchDistances[offs]) {
                offs += 2;
            }
            for (lenTest = startLen;; ++lenTest) {
                curBack = this$static._matchDistances[offs + 1];
                curAndLenPrice = normalMatchPrice + $GetPosLenPrice(this$static, curBack, lenTest, posState);
                optimum = this$static._optimum[cur + lenTest];
                if (curAndLenPrice < optimum.Price) {
                    optimum.Price = curAndLenPrice;
                    optimum.PosPrev = cur;
                    optimum.BackPrev = curBack + 4;
                    optimum.Prev1IsChar = 0;
                }
                if (lenTest == this$static._matchDistances[offs]) {
                    if (lenTest < numAvailableBytesFull) {
                        t = Math.min(numAvailableBytesFull - 1 - lenTest, this$static._numFastBytes);
                        lenTest2 = $GetMatchLen(this$static._matchFinder, lenTest, curBack, t);
                        if (lenTest2 >= 2) {
                            state2 = state < 7?7:10;
                            posStateNext = position + lenTest & this$static._posStateMask;
                            curAndLenCharPrice = curAndLenPrice + ProbPrices[this$static._isMatch[(state2 << 4) + posStateNext] >>> 2] + $GetPrice_0($GetSubCoder(this$static._literalEncoder, position + lenTest, $GetIndexByte(this$static._matchFinder, lenTest - 1 - 1)), 1, $GetIndexByte(this$static._matchFinder, lenTest - (curBack + 1) - 1), $GetIndexByte(this$static._matchFinder, lenTest - 1));
                            state2 = StateUpdateChar(state2);
                            posStateNext = position + lenTest + 1 & this$static._posStateMask;
                            nextMatchPrice = curAndLenCharPrice + ProbPrices[2048 - this$static._isMatch[(state2 << 4) + posStateNext] >>> 2];
                            nextRepMatchPrice = nextMatchPrice + ProbPrices[2048 - this$static._isRep[state2] >>> 2];
                            offset = lenTest + 1 + lenTest2;
                            while (lenEnd < cur + offset) {
                                this$static._optimum[++lenEnd].Price = 268435455;
                            }
                            curAndLenPrice = nextRepMatchPrice + (price_3 = $GetPrice(this$static._repMatchLenEncoder, lenTest2 - 2, posStateNext) , price_3 + $GetPureRepPrice(this$static, 0, state2, posStateNext));
                            optimum = this$static._optimum[cur + offset];
                            if (curAndLenPrice < optimum.Price) {
                                optimum.Price = curAndLenPrice;
                                optimum.PosPrev = cur + lenTest + 1;
                                optimum.BackPrev = 0;
                                optimum.Prev1IsChar = 1;
                                optimum.Prev2 = 1;
                                optimum.PosPrev2 = cur;
                                optimum.BackPrev2 = curBack + 4;
                            }
                        }
                    }
                    offs += 2;
                    if (offs == numDistancePairs)
                        break;
                    }
                }
            }
        }
    }
    
    function $GetPosLenPrice(this$static, pos, len, posState) {
        var price, lenToPosState = GetLenToPosState(len);
        if (pos < 128) {
            price = this$static._distancesPrices[lenToPosState * 128 + pos];
        } else {
            price = this$static._posSlotPrices[(lenToPosState << 6) + GetPosSlot2(pos)] + this$static._alignPrices[pos & 15];
        }
        return price + $GetPrice(this$static._lenEncoder, len - 2, posState);
    }
    
    function $GetPureRepPrice(this$static, repIndex, state, posState) {
        var price;
        if (!repIndex) {
            price = ProbPrices[this$static._isRepG0[state] >>> 2];
            price += ProbPrices[2048 - this$static._isRep0Long[(state << 4) + posState] >>> 2];
        } else {
            price = ProbPrices[2048 - this$static._isRepG0[state] >>> 2];
            if (repIndex == 1) {
                price += ProbPrices[this$static._isRepG1[state] >>> 2];
            } else {
                price += ProbPrices[2048 - this$static._isRepG1[state] >>> 2];
                price += GetPrice(this$static._isRepG2[state], repIndex - 2);
            }
        }
        return price;
    }
    
    function $GetRepLen1Price(this$static, state, posState) {
        return ProbPrices[this$static._isRepG0[state] >>> 2] + ProbPrices[this$static._isRep0Long[(state << 4) + posState] >>> 2];
    }
    
    function $Init_4(this$static) {
        $BaseInit(this$static);
        $Init_9(this$static._rangeEncoder);
        InitBitModels(this$static._isMatch);
        InitBitModels(this$static._isRep0Long);
        InitBitModels(this$static._isRep);
        InitBitModels(this$static._isRepG0);
        InitBitModels(this$static._isRepG1);
        InitBitModels(this$static._isRepG2);
        InitBitModels(this$static._posEncoders);
        $Init_3(this$static._literalEncoder);
        for (var i = 0; i < 4; ++i) {
            InitBitModels(this$static._posSlotEncoder[i].Models);
        }
        $Init_2(this$static._lenEncoder, 1 << this$static._posStateBits);
        $Init_2(this$static._repMatchLenEncoder, 1 << this$static._posStateBits);
        InitBitModels(this$static._posAlignEncoder.Models);
        this$static._longestMatchWasFound = 0;
        this$static._optimumEndIndex = 0;
        this$static._optimumCurrentIndex = 0;
        this$static._additionalOffset = 0;
    }
    
    function $MovePos(this$static, num) {
        if (num > 0) {
            $Skip(this$static._matchFinder, num);
            this$static._additionalOffset += num;
        }
    }
    
    function $ReadMatchDistances(this$static) {
        var lenRes = 0;
        this$static._numDistancePairs = $GetMatches(this$static._matchFinder, this$static._matchDistances);
        if (this$static._numDistancePairs > 0) {
            lenRes = this$static._matchDistances[this$static._numDistancePairs - 2];
            if (lenRes == this$static._numFastBytes)
            lenRes += $GetMatchLen(this$static._matchFinder, lenRes - 1, this$static._matchDistances[this$static._numDistancePairs - 1], 273 - lenRes);
        }
        ++this$static._additionalOffset;
        return lenRes;
    }
    
    function $ReleaseMFStream(this$static) {
        if (this$static._matchFinder && this$static._needReleaseMFStream) {
            this$static._matchFinder._stream = null;
            this$static._needReleaseMFStream = 0;
        }
    }
    
    function $ReleaseStreams(this$static) {
        $ReleaseMFStream(this$static);
        this$static._rangeEncoder.Stream = null;
    }
    
    function $SetDictionarySize_0(this$static, dictionarySize) {
        this$static._dictionarySize = dictionarySize;
        for (var dicLogSize = 0; dictionarySize > 1 << dicLogSize; ++dicLogSize) {}
        this$static._distTableSize = dicLogSize * 2;
    }
    
    function $SetMatchFinder(this$static, matchFinderIndex) {
        var matchFinderIndexPrev = this$static._matchFinderType;
        this$static._matchFinderType = matchFinderIndex;
        if (this$static._matchFinder && matchFinderIndexPrev != this$static._matchFinderType) {
            this$static._dictionarySizePrev = -1;
            this$static._matchFinder = null;
        }
    }
    
    function $WriteCoderProperties(this$static, outStream) {
        this$static.properties[0] = (this$static._posStateBits * 5 + this$static._numLiteralPosStateBits) * 9 + this$static._numLiteralContextBits << 24 >> 24;
        for (var i = 0; i < 4; ++i) {
            this$static.properties[1 + i] = this$static._dictionarySize >> 8 * i << 24 >> 24;
        }
        $write_0(outStream, this$static.properties, 0, 5);
    }
    
    function $WriteEndMarker(this$static, posState) {
        if (!this$static._writeEndMark) {
            return;
        }
        $Encode_3(this$static._rangeEncoder, this$static._isMatch, (this$static._state << 4) + posState, 1);
        $Encode_3(this$static._rangeEncoder, this$static._isRep, this$static._state, 0);
        this$static._state = this$static._state < 7?7:10;
        $Encode_0(this$static._lenEncoder, this$static._rangeEncoder, 0, posState);
        var lenToPosState = GetLenToPosState(2);
        $Encode_2(this$static._posSlotEncoder[lenToPosState], this$static._rangeEncoder, 63);
        $EncodeDirectBits(this$static._rangeEncoder, 67108863, 26);
        $ReverseEncode(this$static._posAlignEncoder, this$static._rangeEncoder, 15);
    }
    
    function GetPosSlot(pos) {
        if (pos < 2048) {
            return g_FastPos[pos];
        }
        if (pos < 2097152) {
            return g_FastPos[pos >> 10] + 20;
        }
        return g_FastPos[pos >> 20] + 40;
    }
    
    function GetPosSlot2(pos) {
        if (pos < 131072) {
            return g_FastPos[pos >> 6] + 12;
        }
        if (pos < 134217728) {
            return g_FastPos[pos >> 16] + 32;
        }
        return g_FastPos[pos >> 26] + 52;
    }
    
    function $Encode(this$static, rangeEncoder, symbol, posState) {
        if (symbol < 8) {
            $Encode_3(rangeEncoder, this$static._choice, 0, 0);
            $Encode_2(this$static._lowCoder[posState], rangeEncoder, symbol);
        } else {
            symbol -= 8;
            $Encode_3(rangeEncoder, this$static._choice, 0, 1);
            if (symbol < 8) {
                $Encode_3(rangeEncoder, this$static._choice, 1, 0);
                $Encode_2(this$static._midCoder[posState], rangeEncoder, symbol);
            } else {
                $Encode_3(rangeEncoder, this$static._choice, 1, 1);
                $Encode_2(this$static._highCoder, rangeEncoder, symbol - 8);
            }
        }
    }
    
    function $Encoder$LenEncoder(this$static) {
        this$static._choice = initDim(2);
        this$static._lowCoder = initDim(16);
        this$static._midCoder = initDim(16);
        this$static._highCoder = $BitTreeEncoder({}, 8);
        for (var posState = 0; posState < 16; ++posState) {
            this$static._lowCoder[posState] = $BitTreeEncoder({}, 3);
            this$static._midCoder[posState] = $BitTreeEncoder({}, 3);
        }
        return this$static;
    }
    
    function $Init_2(this$static, numPosStates) {
        InitBitModels(this$static._choice);
        for (var posState = 0; posState < numPosStates; ++posState) {
            InitBitModels(this$static._lowCoder[posState].Models);
            InitBitModels(this$static._midCoder[posState].Models);
        }
        InitBitModels(this$static._highCoder.Models);
    }
    
    function $SetPrices(this$static, posState, numSymbols, prices, st) {
        var a0, a1, b0, b1, i;
        a0 = ProbPrices[this$static._choice[0] >>> 2];
        a1 = ProbPrices[2048 - this$static._choice[0] >>> 2];
        b0 = a1 + ProbPrices[this$static._choice[1] >>> 2];
        b1 = a1 + ProbPrices[2048 - this$static._choice[1] >>> 2];
        i = 0;
        for (i = 0; i < 8; ++i) {
            if (i >= numSymbols)
            return;
            prices[st + i] = a0 + $GetPrice_1(this$static._lowCoder[posState], i);
        }
        for (; i < 16; ++i) {
            if (i >= numSymbols)
            return;
            prices[st + i] = b0 + $GetPrice_1(this$static._midCoder[posState], i - 8);
        }
        for (; i < numSymbols; ++i) {
            prices[st + i] = b1 + $GetPrice_1(this$static._highCoder, i - 8 - 8);
        }
    }
    
    function $Encode_0(this$static, rangeEncoder, symbol, posState) {
        $Encode(this$static, rangeEncoder, symbol, posState);
        if (--this$static._counters[posState] == 0) {
            $SetPrices(this$static, posState, this$static._tableSize, this$static._prices, posState * 272);
            this$static._counters[posState] = this$static._tableSize;
        }
    }
    
    function $Encoder$LenPriceTableEncoder(this$static) {
        $Encoder$LenEncoder(this$static);
        this$static._prices = [];
        this$static._counters = [];
        return this$static;
    }
    
    function $GetPrice(this$static, symbol, posState) {
        return this$static._prices[posState * 272 + symbol];
    }
    
    function $UpdateTables(this$static, numPosStates) {
        for (var posState = 0; posState < numPosStates; ++posState) {
            $SetPrices(this$static, posState, this$static._tableSize, this$static._prices, posState * 272);
            this$static._counters[posState] = this$static._tableSize;
        }
    }
    
    function $Create_1(this$static, numPosBits, numPrevBits) {
        var i, numStates;
        if (this$static.m_Coders != null && this$static.m_NumPrevBits == numPrevBits && this$static.m_NumPosBits == numPosBits) {
            return;
        }
        this$static.m_NumPosBits = numPosBits;
        this$static.m_PosMask = (1 << numPosBits) - 1;
        this$static.m_NumPrevBits = numPrevBits;
        numStates = 1 << this$static.m_NumPrevBits + this$static.m_NumPosBits;
        this$static.m_Coders = initDim(numStates);
        for (i = 0; i < numStates; ++i) {
            this$static.m_Coders[i] = $Encoder$LiteralEncoder$Encoder2({});
        }
    }
    
    function $GetSubCoder(this$static, pos, prevByte) {
        return this$static.m_Coders[((pos & this$static.m_PosMask) << this$static.m_NumPrevBits) + ((prevByte & 255) >>> 8 - this$static.m_NumPrevBits)];
    }
    
    function $Init_3(this$static) {
        var i, numStates = 1 << this$static.m_NumPrevBits + this$static.m_NumPosBits;
        for (i = 0; i < numStates; ++i) {
            InitBitModels(this$static.m_Coders[i].m_Encoders);
        }
    }
    
    function $Encode_1(this$static, rangeEncoder, symbol) {
        var bit, i, context = 1;
        for (i = 7; i >= 0; --i) {
            bit = symbol >> i & 1;
            $Encode_3(rangeEncoder, this$static.m_Encoders, context, bit);
            context = context << 1 | bit;
        }
    }
    
    function $EncodeMatched(this$static, rangeEncoder, matchByte, symbol) {
        var bit, i, matchBit, state, same = 1, context = 1;
        for (i = 7; i >= 0; --i) {
            bit = symbol >> i & 1;
            state = context;
            if (same) {
                matchBit = matchByte >> i & 1;
                state += 1 + matchBit << 8;
                same = matchBit == bit;
            }
            $Encode_3(rangeEncoder, this$static.m_Encoders, state, bit);
            context = context << 1 | bit;
        }
    }
    
    function $Encoder$LiteralEncoder$Encoder2(this$static) {
        this$static.m_Encoders = initDim(768);
        return this$static;
    }
    
    function $GetPrice_0(this$static, matchMode, matchByte, symbol) {
        var bit, context = 1, i = 7, matchBit, price = 0;
        if (matchMode) {
            for (; i >= 0; --i) {
                matchBit = matchByte >> i & 1;
                bit = symbol >> i & 1;
                price += GetPrice(this$static.m_Encoders[(1 + matchBit << 8) + context], bit);
                context = context << 1 | bit;
                if (matchBit != bit) {
                    --i;
                    break;
                }
            }
        }
        for (; i >= 0; --i) {
            bit = symbol >> i & 1;
            price += GetPrice(this$static.m_Encoders[context], bit);
            context = context << 1 | bit;
        }
        return price;
    }
    
    function $MakeAsChar(this$static) {
        this$static.BackPrev = -1;
        this$static.Prev1IsChar = 0;
    }
    
    function $MakeAsShortRep(this$static) {
        this$static.BackPrev = 0;
        this$static.Prev1IsChar = 0;
    }
    /** ce */
    /** ds */
    function $BitTreeDecoder(this$static, numBitLevels) {
        this$static.NumBitLevels = numBitLevels;
        this$static.Models = initDim(1 << numBitLevels);
        return this$static;
    }
    
    function $Decode_0(this$static, rangeDecoder) {
        var bitIndex, m = 1;
        for (bitIndex = this$static.NumBitLevels; bitIndex != 0; --bitIndex) {
            m = (m << 1) + $DecodeBit(rangeDecoder, this$static.Models, m);
        }
        return m - (1 << this$static.NumBitLevels);
    }
    
    function $ReverseDecode(this$static, rangeDecoder) {
        var bit, bitIndex, m = 1, symbol = 0;
        for (bitIndex = 0; bitIndex < this$static.NumBitLevels; ++bitIndex) {
            bit = $DecodeBit(rangeDecoder, this$static.Models, m);
            m <<= 1;
            m += bit;
            symbol |= bit << bitIndex;
        }
        return symbol;
    }
    
    function ReverseDecode(Models, startIndex, rangeDecoder, NumBitLevels) {
        var bit, bitIndex, m = 1, symbol = 0;
        for (bitIndex = 0; bitIndex < NumBitLevels; ++bitIndex) {
            bit = $DecodeBit(rangeDecoder, Models, startIndex + m);
            m <<= 1;
            m += bit;
            symbol |= bit << bitIndex;
        }
        return symbol;
    }
    /** de */
    /** cs */
    function $BitTreeEncoder(this$static, numBitLevels) {
        this$static.NumBitLevels = numBitLevels;
        this$static.Models = initDim(1 << numBitLevels);
        return this$static;
    }
    
    function $Encode_2(this$static, rangeEncoder, symbol) {
        var bit, bitIndex, m = 1;
        for (bitIndex = this$static.NumBitLevels; bitIndex != 0;) {
            --bitIndex;
            bit = symbol >>> bitIndex & 1;
            $Encode_3(rangeEncoder, this$static.Models, m, bit);
            m = m << 1 | bit;
        }
    }
    
    function $GetPrice_1(this$static, symbol) {
        var bit, bitIndex, m = 1, price = 0;
        for (bitIndex = this$static.NumBitLevels; bitIndex != 0;) {
            --bitIndex;
            bit = symbol >>> bitIndex & 1;
            price += GetPrice(this$static.Models[m], bit);
            m = (m << 1) + bit;
        }
        return price;
    }
    
    function $ReverseEncode(this$static, rangeEncoder, symbol) {
        var bit, i, m = 1;
        for (i = 0; i < this$static.NumBitLevels; ++i) {
            bit = symbol & 1;
            $Encode_3(rangeEncoder, this$static.Models, m, bit);
            m = m << 1 | bit;
            symbol >>= 1;
        }
    }
    
    function $ReverseGetPrice(this$static, symbol) {
        var bit, i, m = 1, price = 0;
        for (i = this$static.NumBitLevels; i != 0; --i) {
            bit = symbol & 1;
            symbol >>>= 1;
            price += GetPrice(this$static.Models[m], bit);
            m = m << 1 | bit;
        }
        return price;
    }
    
    function ReverseEncode(Models, startIndex, rangeEncoder, NumBitLevels, symbol) {
        var bit, i, m = 1;
        for (i = 0; i < NumBitLevels; ++i) {
            bit = symbol & 1;
            $Encode_3(rangeEncoder, Models, startIndex + m, bit);
            m = m << 1 | bit;
            symbol >>= 1;
        }
    }
    
    function ReverseGetPrice(Models, startIndex, NumBitLevels, symbol) {
        var bit, i, m = 1, price = 0;
        for (i = NumBitLevels; i != 0; --i) {
            bit = symbol & 1;
            symbol >>>= 1;
            price += ProbPrices[((Models[startIndex + m] - bit ^ -bit) & 2047) >>> 2];
            m = m << 1 | bit;
        }
        return price;
    }
    /** ce */
    /** ds */
    function $DecodeBit(this$static, probs, index) {
        var newBound, prob = probs[index];
        newBound = (this$static.Range >>> 11) * prob;
        if ((this$static.Code ^ -2147483648) < (newBound ^ -2147483648)) {
            this$static.Range = newBound;
            probs[index] = prob + (2048 - prob >>> 5) << 16 >> 16;
            if (!(this$static.Range & -16777216)) {
                this$static.Code = this$static.Code << 8 | $read(this$static.Stream);
                this$static.Range <<= 8;
            }
            return 0;
        } else {
            this$static.Range -= newBound;
            this$static.Code -= newBound;
            probs[index] = prob - (prob >>> 5) << 16 >> 16;
            if (!(this$static.Range & -16777216)) {
                this$static.Code = this$static.Code << 8 | $read(this$static.Stream);
                this$static.Range <<= 8;
            }
            return 1;
        }
    }
    
    function $DecodeDirectBits(this$static, numTotalBits) {
        var i, t, result = 0;
        for (i = numTotalBits; i != 0; --i) {
            this$static.Range >>>= 1;
            t = this$static.Code - this$static.Range >>> 31;
            this$static.Code -= this$static.Range & t - 1;
            result = result << 1 | 1 - t;
            if (!(this$static.Range & -16777216)) {
                this$static.Code = this$static.Code << 8 | $read(this$static.Stream);
                this$static.Range <<= 8;
            }
        }
        return result;
    }
    
    function $Init_8(this$static) {
        this$static.Code = 0;
        this$static.Range = -1;
        for (var i = 0; i < 5; ++i) {
            this$static.Code = this$static.Code << 8 | $read(this$static.Stream);
        }
    }
    /** de */
    
    function InitBitModels(probs) {
        for (var i = probs.length - 1; i >= 0; --i) {
            probs[i] = 1024;
        }
    }
    /** cs */
    var ProbPrices = (function () {
        var end, i, j, start, ProbPrices = [];
        for (i = 8; i >= 0; --i) {
            start = 1 << 9 - i - 1;
            end = 1 << 9 - i;
            for (j = start; j < end; ++j) {
                ProbPrices[j] = (i << 6) + (end - j << 6 >>> 9 - i - 1);
            }
        }
        return ProbPrices;
    }());
    
    function $Encode_3(this$static, probs, index, symbol) {
        var newBound, prob = probs[index];
        newBound = (this$static.Range >>> 11) * prob;
        if (!symbol) {
            this$static.Range = newBound;
            probs[index] = prob + (2048 - prob >>> 5) << 16 >> 16;
        } else {
            this$static.Low = add(this$static.Low, and(fromInt(newBound), [4294967295, 0]));
            this$static.Range -= newBound;
            probs[index] = prob - (prob >>> 5) << 16 >> 16;
        }
        if (!(this$static.Range & -16777216)) {
            this$static.Range <<= 8;
            $ShiftLow(this$static);
        }
    }
    
    function $EncodeDirectBits(this$static, v, numTotalBits) {
        for (var i = numTotalBits - 1; i >= 0; --i) {
            this$static.Range >>>= 1;
            if ((v >>> i & 1) == 1) {
                this$static.Low = add(this$static.Low, fromInt(this$static.Range));
            }
            if (!(this$static.Range & -16777216)) {
                this$static.Range <<= 8;
                $ShiftLow(this$static);
            }
        }
    }
    
    function $GetProcessedSizeAdd(this$static) {
        return add(add(fromInt(this$static._cacheSize), this$static._position), [4, 0]);
    }
    
    function $Init_9(this$static) {
        this$static._position = P0_longLit;
        this$static.Low = P0_longLit;
        this$static.Range = -1;
        this$static._cacheSize = 1;
        this$static._cache = 0;
    }
    
    function $ShiftLow(this$static) {
        var temp, LowHi = lowBits_0(shru(this$static.Low, 32));
        if (LowHi != 0 || compare(this$static.Low, [4278190080, 0]) < 0) {
            this$static._position = add(this$static._position, fromInt(this$static._cacheSize));
            temp = this$static._cache;
            do {
                $write(this$static.Stream, temp + LowHi);
                temp = 255;
            } while (--this$static._cacheSize != 0);
            this$static._cache = lowBits_0(this$static.Low) >>> 24;
        }
        ++this$static._cacheSize;
        this$static.Low = shl(and(this$static.Low, [16777215, 0]), 8);
    }
    
    function GetPrice(Prob, symbol) {
        return ProbPrices[((Prob - symbol ^ -symbol) & 2047) >>> 2];
    }
    
    /** ce */
    /** ds */
    function decode(utf) {
        var i = 0, j = 0, x, y, z, l = utf.length, buf = [], charCodes = [];
        for (; i < l; ++i, ++j) {
            x = utf[i] & 255;
            if (!(x & 128)) {
                if (!x) {
                    /// It appears that this is binary data, so it cannot be converted to a string, so just send it back.
                    return utf;
                }
                charCodes[j] = x;
            } else if ((x & 224) == 192) {
                if (i + 1 >= l) {
                    /// It appears that this is binary data, so it cannot be converted to a string, so just send it back.
                    return utf;
                }
                y = utf[++i] & 255;
                if ((y & 192) != 128) {
                    /// It appears that this is binary data, so it cannot be converted to a string, so just send it back.
                    return utf;
                }
                charCodes[j] = ((x & 31) << 6) | (y & 63);
            } else if ((x & 240) == 224) {
                if (i + 2 >= l) {
                    /// It appears that this is binary data, so it cannot be converted to a string, so just send it back.
                    return utf;
                }
                y = utf[++i] & 255;
                if ((y & 192) != 128) {
                    /// It appears that this is binary data, so it cannot be converted to a string, so just send it back.
                    return utf;
                }
                z = utf[++i] & 255;
                if ((z & 192) != 128) {
                    /// It appears that this is binary data, so it cannot be converted to a string, so just send it back.
                    return utf;
                }
                charCodes[j] = ((x & 15) << 12) | ((y & 63) << 6) | (z & 63);
            } else {
                /// It appears that this is binary data, so it cannot be converted to a string, so just send it back.
                return utf;
            }
            if (j == 16383) {
                buf.push(String.fromCharCode.apply(String, charCodes));
                j = -1;
            }
        }
        if (j > 0) {
            charCodes.length = j;
            buf.push(String.fromCharCode.apply(String, charCodes));
        }
        return buf.join("");
    }
    /** de */
    /** cs */
    function encode(s) {
        var ch, chars = [], data, elen = 0, i, l = s.length;
        /// Be able to handle binary arrays and buffers.
        if (typeof s == "object") {
            return s;
        } else {
            $getChars(s, 0, l, chars, 0);
        }
        /// Add extra spaces in the array to break up the unicode symbols.
        for (i = 0; i < l; ++i) {
            ch = chars[i];
            if (ch >= 1 && ch <= 127) {
                ++elen;
            } else if (!ch || ch >= 128 && ch <= 2047) {
                elen += 2;
            } else {
                elen += 3;
            }
        }
        data = [];
        elen = 0;
        for (i = 0; i < l; ++i) {
            ch = chars[i];
            if (ch >= 1 && ch <= 127) {
                data[elen++] = ch << 24 >> 24;
            } else if (!ch || ch >= 128 && ch <= 2047) {
                data[elen++] = (192 | ch >> 6 & 31) << 24 >> 24;
                data[elen++] = (128 | ch & 63) << 24 >> 24;
            } else {
                data[elen++] = (224 | ch >> 12 & 15) << 24 >> 24;
                data[elen++] = (128 | ch >> 6 & 63) << 24 >> 24;
                data[elen++] = (128 | ch & 63) << 24 >> 24;
            }
        }
        return data;
    }
    /** ce */
    
    function toDouble(a) {
        return a[1] + a[0];
    }
    
    /** cs */
    function compress(str, mode, on_finish, on_progress) {
        var this$static = {},
            percent,
            cbn, /// A callback number should be supplied instead of on_finish() if we are using Web Workers.
            sync = typeof on_finish == "undefined" && typeof on_progress == "undefined";
        
        if (typeof on_finish != "function") {
            cbn = on_finish;
            on_finish = on_progress = 0;
        }
        
        on_progress = on_progress || function(percent) {
            if (typeof cbn == "undefined")
                return;
            
            return update_progress(percent, cbn);
        };
        
        on_finish = on_finish || function(res, err) {
            if (typeof cbn == "undefined")
                return;
            
            return postMessage({
                action: action_compress,
                cbn: cbn,
                result: res,
                error: err
            });
        };

        if (sync) {
            this$static.c = $LZMAByteArrayCompressor({}, encode(str), get_mode_obj(mode));
            while ($processChunk(this$static.c.chunker));
            return $toByteArray(this$static.c.output);
        }
        
        try {
            this$static.c = $LZMAByteArrayCompressor({}, encode(str), get_mode_obj(mode));
            
            on_progress(0);
        } catch (err) {
            return on_finish(null, err);
        }
        
        function do_action() {
            try {
                var res, start = (new Date()).getTime();
                
                while ($processChunk(this$static.c.chunker)) {
                    percent = toDouble(this$static.c.chunker.inBytesProcessed) / toDouble(this$static.c.length_0);
                    /// If about 200 miliseconds have passed, update the progress.
                    if ((new Date()).getTime() - start > 200) {
                        on_progress(percent);
                        
                        wait(do_action, 0);
                        return 0;
                    }
                }
                
                on_progress(1);
                
                res = $toByteArray(this$static.c.output);
                
                /// delay so we don’t catch errors from the on_finish handler
                wait(on_finish.bind(null, res), 0);
            } catch (err) {
                on_finish(null, err);
            }
        }
        
        ///NOTE: We need to wait to make sure it is always async.
        wait(do_action, 0);
    }
    /** ce */
    /** ds */
    function decompress(byte_arr, on_finish, on_progress) {
        var this$static = {},
            percent,
            cbn, /// A callback number should be supplied instead of on_finish() if we are using Web Workers.
            has_progress,
            len,
            sync = typeof on_finish == "undefined" && typeof on_progress == "undefined";

        if (typeof on_finish != "function") {
            cbn = on_finish;
            on_finish = on_progress = 0;
        }
        
        on_progress = on_progress || function(percent) {
            if (typeof cbn == "undefined")
                return;
            
            return update_progress(has_progress ? percent : -1, cbn);
        };
        
        on_finish = on_finish || function(res, err) {
            if (typeof cbn == "undefined")
                return;
            
            return postMessage({
                action: action_decompress,
                cbn: cbn,
                result: res,
                error: err
            });
        };

        if (sync) {
            this$static.d = $LZMAByteArrayDecompressor({}, byte_arr);
            while ($processChunk(this$static.d.chunker));
            return decode($toByteArray(this$static.d.output));
        }
        
        try {
            this$static.d = $LZMAByteArrayDecompressor({}, byte_arr);
            
            len = toDouble(this$static.d.length_0);
            
            ///NOTE: If the data was created via a stream, it will not have a length value, and therefore we can't calculate the progress.
            has_progress = len > -1;
            
            on_progress(0);
        } catch (err) {
            return on_finish(null, err);
        }
        
        function do_action() {
            try {
                var res, i = 0, start = (new Date()).getTime();
                while ($processChunk(this$static.d.chunker)) {
                    if (++i % 1000 == 0 && (new Date()).getTime() - start > 200) {
                        if (has_progress) {
                            percent = toDouble(this$static.d.chunker.decoder.nowPos64) / len;
                            /// If about 200 miliseconds have passed, update the progress.
                            on_progress(percent);
                        }
                        
                        ///NOTE: This allows other code to run, like the browser to update.
                        wait(do_action, 0);
                        return 0;
                    }
                }
                
                on_progress(1);
                
                res = decode($toByteArray(this$static.d.output));
                
                /// delay so we don’t catch errors from the on_finish handler
                wait(on_finish.bind(null, res), 0);
            } catch (err) {
                on_finish(null, err);
            }
        }
        
        ///NOTE: We need to wait to make sure it is always async.
        wait(do_action, 0);
    }
    /** de */
    /** cs */
    var get_mode_obj = (function () {
        /// s is dictionarySize
        /// f is fb
        /// m is matchFinder
        ///NOTE: Because some values are always the same, they have been removed.
        /// lc is always 3
        /// lp is always 0
        /// pb is always 2
        var modes = [
            {s: 16, f:  64, m: 0},
            {s: 20, f:  64, m: 0},
            {s: 19, f:  64, m: 1},
            {s: 20, f:  64, m: 1},
            {s: 21, f: 128, m: 1},
            {s: 22, f: 128, m: 1},
            {s: 23, f: 128, m: 1},
            {s: 24, f: 255, m: 1},
            {s: 25, f: 255, m: 1}
        ];
        
        return function (mode) {
            return modes[mode - 1] || modes[6];
        };
    }());
    /** ce */
    
    /// If we're in a Web Worker, create the onmessage() communication channel.
    ///NOTE: This seems to be the most reliable way to detect this.
    if (typeof onmessage != "undefined" && (typeof window == "undefined" || typeof window.document == "undefined")) {
        (function () {
            /* jshint -W020 */
            /// Create the global onmessage function.
            onmessage = function (e) {
                if (e && e.data) {
                    /** xs */
                    if (e.data.action == action_decompress) {
                        LZMA.decompress(e.data.data, e.data.cbn);
                    } else if (e.data.action == action_compress) {
                        LZMA.compress(e.data.data, e.data.mode, e.data.cbn);
                    }
                    /** xe */
                    /// co:if (e.data.action == action_compress) {
                    /// co:    LZMA.compress(e.data.data, e.data.mode, e.data.cbn);
                    /// co:}
                    /// do:if (e.data.action == action_decompress) {
                    /// do:    LZMA.decompress(e.data.data, e.data.cbn);
                    /// do:}
                }
            };
        }());
    }
        
    return {
        /** xs */
        compress:   compress,
        decompress: decompress,
        /** xe */
        /// co:compress:   compress
        /// do:decompress: decompress
    };
}());

/// This is used by browsers that do not support web workers (and possibly Node.js).
this.LZMA = this.LZMA_WORKER = LZMA;

}).call(this,require("timers").setImmediate)
},{"timers":17}]},{},[24]);
