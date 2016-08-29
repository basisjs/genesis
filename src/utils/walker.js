var walker = require('csso:utils/walk.js');

function factory(method) {
  method = typeof walker[method] != "function" ? 'all' : method;

  return function walk(ast, handlers, context) {
    return walker[method](ast, function(token, parent, stack) {
      var handler = typeof handlers == 'function' ? handlers : handlers[token.type];

      if (typeof handler == 'function') {
        handler.call(context, token, parent, stack);
      }

      if (handlers.hasOwnProperty('*') && typeof handlers['*'] == 'function') {
        handlers['*'].call(context, token, parent, stack);
      }
    });
  }
}

module.exports = {
  all: factory('all'),
  rules: factory('rules')
};
