var walk = require('utils.walker').all;

module.exports = function pseudoClassFactory(type) {
  var TYPE_NAME = 'pseudo-class-' + type + '__' + basis.genUID();

  return {
    /**@cut*/__debugName: TYPE_NAME,
    getStates: function(AST) {
      var allow = false;

      //todo сделать оптимально - построить индекс по таким местам или не обходить оставшиеся узлы если стало понятно, что эмуляция нужна
      walk(AST, {
        PseudoClass: function(token) {
          if (token.type == 'PseudoClass' && token.name == type) {
            allow = true;
          }
        }
      });

      if (allow) {
        var states = [];
        var state = {};

        state[type] = false;
        states.push(state);
        state = {};
        state[type] = true;
        states.push(state);

        return states;
      }
    },
    handleToken: function(token, parent, root, sourceMap, mapper) {
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
