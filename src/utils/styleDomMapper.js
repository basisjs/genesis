var List = require('csso:utils/list.js');
var translate = require('csso:utils/translate.js');
var walk = require('utils.walker');

module.exports = function StyleDOMMapper() {
  var selectorElementMap;
  var elementSelectorMap;
  var mapper = {
    bySelector: function(token) {
      return selectorElementMap.get(token);
    },
    byElement: function(element) {
      return elementSelectorMap.get(element);
    },
    removeSelector: function(selector) {
      var mappedElements = selectorElementMap.get(selector);

      if (mappedElements) {
        for (var i = 0; i < mappedElements.length; i++) {
          var mappedSelectors = elementSelectorMap.get(mappedElements[i]);
          var ix = mappedSelectors.indexOf(selector);

          if (ix > -1) {
            mappedSelectors.splice(ix, 1);

            if (!mappedSelectors.length) {
              elementSelectorMap.delete(mappedElements[i]);
            }
          }
        }

        selectorElementMap.delete(selector);
      }
    },
    removeElement: function(element) {
      var mappedSelectors = elementSelectorMap.get(element);

      if (mappedSelectors) {
        for (var i = 0; i < mappedSelectors.length; i++) {
          var mappedElements = selectorElementMap.get(mappedSelectors[i]);
          var ix = mappedElements.indexOf(element);

          if (ix > -1) {
            mappedElements.splice(ix, 1);

            if (!mappedElements.length) {
              selectorElementMap.delete(mappedSelectors[i]);
            }
          }
        }

        elementSelectorMap.delete(element);
      }
    },
    linkElements: function(token, elements) {
      var selector = translate(token);
      var mappedElements = selectorElementMap.get(token) || [];

      elements = basis.array.from(elements);

      elements.forEach(function(element) {
        var mappedSelectors = elementSelectorMap.get(element) || [];

        if (mappedSelectors.indexOf(token) < 0) {
          mappedSelectors.push(token);
          elementSelectorMap.set(element, mappedSelectors);
          // console.log('token', selector, 'pushed for', element);
        }


        if (mappedElements.indexOf(element) < 0) {
          mappedElements.push(element);
          // console.log('element', element, 'pushed for', selector);
        }
      });

      // todo if(mappedElements.length)
      selectorElementMap.set(token, mappedElements);
    },
    clear: function() {
      selectorElementMap = new WeakMap();
      elementSelectorMap = new WeakMap();
    },
    map: function(root, processedAST, sourceMap) {
      var that = this;

      walk(processedAST, {
        SimpleSelector: function(token) {
          var selector = translate(token);
          var stack = [];

          // console.group('full selector', selector, token);
          token.sequence.each(function(part) {
            var sourcePart = sourceMap.get(part) || part;

            // пропускаем псевдо классы/элементы, иначе querySelectorAll не найдет узлы
            if (sourcePart.type != 'PseudoClass' && sourcePart.type != 'PseudoElement') {
              stack.push(sourcePart);
            }

            // добавляем комбинирующий символ в стек, но не делаем запрос в dom и не линкуем элементы
            if (sourcePart.type == 'Combinator') {
              return;
            }

            var partSelector = translate({type: 'SimpleSelector', sequence: new List(stack)});

            // console.group('part selector', partSelector, part);

            var elements = root.querySelectorAll(partSelector);

            that.linkElements(part, elements);
            // console.groupEnd();
          });
          // console.groupEnd();
        }
      });
    }
  };

  mapper.clear();

  mapper.selectorElementMap = selectorElementMap;
  mapper.elementSelectorMap = elementSelectorMap;

  return mapper;
};
