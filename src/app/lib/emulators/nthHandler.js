var List = require('csso:utils/list.js');

module.exports = {
  getStates: function() {
    return [];
  },
  handleToken: function(token, parent, root, sourceMap) {
    if (token.type == 'PseudoClass' && token.name == 'only-child') {
      var sourceToken = sourceMap.get(token);
      var newToken = List.createItem({type: 'PseudoClass', name: 'last-child'});

      token.name = 'first-child';

      sourceMap.delete(token);
      sourceMap.set(newToken.data, sourceToken);

      parent.data.sequence.insert(newToken);
    }
  },
  emulate: function(token, parent, root, sourceMap, mapper, value) {
    // nothing to do...
  }
};
