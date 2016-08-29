var List = require('csso:utils/list.js');
var walk = require('utils.walker').rules;
var translate = require('csso:utils/translate.js');
var pseudoContentFactory = require('./contentFactory');

module.exports = function pseudoElementFactory(type, before) {
  var TYPE_NAME = 'pseudo-element-' + type + '__' + basis.genUID();

  return {
    getStates: function() {
      return [];
    },
    handleToken: function(token, parent, root, sourceMap) {
      if (token.type == 'PseudoElement' && token.name == type) {
        token.type = 'Combinator';
        token.name = '>';
        parent.data.sequence.insert(List.createItem({type: 'Identifier', name: TYPE_NAME}));
      }
    },
    emulate: function(token, parent, root, sourceMap, mapper, value) {
      var needToRetranslate = false;
      var sourceToken = sourceMap.get(token);

      if (sourceToken && sourceToken.type == 'PseudoElement' && sourceToken.name == type) {
        var elementHandler;
        var allowToEmulate = [];
        var mappedElements = mapper.bySelector(token);

        if (mappedElements) {
          allowToEmulate = mappedElements.filter(function(element) {
            var list = new List(parent.data.sequence.toArray().slice(0, -2));

            return element.matches(translate({type: 'SimpleSelector', sequence: list}));
          });
        }

        if (!allowToEmulate.length) {
          return;
        }

        walk(root, {
          Ruleset: function(token) {
            token.selector.selectors.each(function(selector) {
              if (selector == parent.data) {
                token.block.declarations.each(function(declaration) {
                  if (declaration.property.name == 'content' || declaration.property.name == '--dp-disabled-content') {
                    elementHandler = pseudoContentFactory(declaration);

                    if (declaration.property.name == 'content') {
                      declaration.property.name = '--dp-disabled-content';
                      needToRetranslate = true;
                    }
                  }
                });
              }
            });
          }
        });

        mapper.removeSelector(token);
        allowToEmulate.forEach(function(element) {
          var existingEmulator = element.querySelector(TYPE_NAME);

          if (existingEmulator) {
            if (elementHandler) {
              existingEmulator.innerHTML = '';
              elementHandler(existingEmulator);
            }
          } else {
            var emulator = document.createElement(TYPE_NAME);

            if (elementHandler) {
              element.insertBefore(emulator, before ? element.firstChild : null);
              elementHandler(emulator);
              mapper.linkElements(parent.data.sequence.last(), emulator);
            }
          }
        });
      }

      return needToRetranslate;
    }
  }
};
