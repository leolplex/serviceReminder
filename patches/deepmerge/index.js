'use strict'

const isObject = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const clone = value => {
  if (Array.isArray(value)) return value.map(clone)
  if (!isObject(value)) return value

  const result = {}
  for (const [key, nestedValue] of Object.entries(value)) {
    result[key] = clone(nestedValue)
  }
  return result
}

const merge = (left, right, options = {}) => {
  if (Array.isArray(left) && Array.isArray(right)) {
    return typeof options.arrayMerge === 'function'
      ? options.arrayMerge(left, right, options)
      : [...left.map(clone), ...right.map(clone)]
  }

  if (!isObject(left) || !isObject(right)) return clone(right)

  const result = clone(left)
  for (const [key, value] of Object.entries(right)) {
    result[key] =
      key in result ? merge(result[key], value, options) : clone(value)
  }
  return result
}

module.exports = (left, right, options) => merge(left, right, options)
module.exports.all = (objects, options) =>
  objects.reduce((result, value) => merge(result, value, options), {})
module.exports.into = (destination, source, options) =>
  merge(destination, source, options)
