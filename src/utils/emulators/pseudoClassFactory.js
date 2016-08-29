module.exports = function pseudoClassFactory(type) {
  var TYPE_NAME = 'pseudo-class-' + type + '__' + basis.genUID();

  return {
    getStates: function() {
      var states = [];
      var state = {};

      state[type] = false;
      states.push(state);
      state = {};
      state[type] = true;
      states.push(state);

      return states;
    },
    handleToken: function(token, parent, root, sourceMap) {
      if (token.type == 'PseudoClass' && token.name == type) {
        token.type = 'Class';
        token.name = TYPE_NAME;
      }
    },
    emulate: function(token, parent, root, sourceMap, mapper, value) {
      if (value) {
        var sourceToken = sourceMap.get(token);

        if (sourceToken && sourceToken.type == 'PseudoClass' && sourceToken.name == type) {
          var mappedElements = mapper.bySelector(token);

          if (mappedElements) {
            mappedElements.forEach(function(element) {
              element.classList.add(TYPE_NAME);
            });
          }
        }
      }
    }
  };
};
