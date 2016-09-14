function simpleEqual(a, b) {
  if (a == b) {
    return true;
  }

  var aKeys = Object.keys(a);
  var bKeys = Object.keys(b);

  if (aKeys.length == bKeys.length) {
    return !aKeys.some(function(key) {
      return a[key] != b[key];
    });
  }

  return false;
}

function uniqueObjects(list, getter) {
  var uniqueObjects = [];

  getter = basis.getter(getter || basis.fn.$self);

  list.forEach(function(item) {
    var alreadyExists = uniqueObjects.some(function(uniqueItem) {
      return simpleEqual(getter(uniqueItem), getter(item))
    });

    if (!alreadyExists) {
      uniqueObjects.push(item);
    }
  });

  return uniqueObjects;
}

function sortObject(obj) {
  return Object.keys(obj).sort().reduce(function(result, current) {
    result[current] = obj[current];

    return result;
  }, {});
}

module.exports = {
  simpleEqual: simpleEqual,
  uniqueObjects: uniqueObjects,
  sortObject: sortObject
};
