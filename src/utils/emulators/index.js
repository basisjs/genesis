var pseudoClassFactory = require('./pseudoClassFactory');
var pseudoElementFactory = require('./pseudoElementFactory');
var hthHandler = require('./nthHandler');

module.exports = {
  active: pseudoClassFactory('active'),
  hover: pseudoClassFactory('hover'),
  focus: pseudoClassFactory('focus'),
  after: pseudoElementFactory('after'),
  before: pseudoElementFactory('before', true),
  hthHandler: hthHandler
};
