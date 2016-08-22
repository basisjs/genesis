var walker = require('csso:utils/walk.js');

module.exports = function walk(ast, handlers, context) {
  return walker.all(ast, function(token, parent, stack) {
    var handler = typeof handlers == 'function' ? handlers : handlers[token.type];

    if (typeof handler == 'function') {
      handler.call(context, token, parent, stack);
    }

    if(handlers.hasOwnProperty('*') && typeof handlers['*'] == 'function') {
      handlers['*'].call(context, token, parent, stack);
    }
  });
};
