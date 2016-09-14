var domUtils = require('basis.dom');

function getDigest(node) {
  document.body.appendChild(node);
  var result = domUtils.axis(node, domUtils.AXIS_DESCENDANT).map(function(node) {
    if (node.nodeType == 1) {
      return getComputedStyle(node).cssText;
    }

    if (node.nodeType == 3) {
      return node.nodeValue;
    }

    return '';
  }).join('');

  document.body.removeChild(node);

  return result;
}

function getFirstNodeStyle(html) {
  var node = html.firstChild;
  var result = {};

  document.body.appendChild(html);

  if (node.nodeType == 1) {
    result = basis.object.slice(getComputedStyle(node));
  }

  document.body.removeChild(html);

  return result;
}

module.exports = {
  getDigest: getDigest,
  getFirstNodeStyle: getFirstNodeStyle
};
