var List = require('csso:utils/list.js');
var translate = require('csso:utils/translate.js');
var walk = require('utils.walker').all;

function StyleDOMMapper() {
  this.selectorElementMap = new WeakMap();
  this.elementSelectorMap = new WeakMap();
}

StyleDOMMapper.prototype.bySelector = function(token) {
  return this.selectorElementMap.get(token);
};

StyleDOMMapper.prototype.byElement = function(element) {
  return this.elementSelectorMap.get(element);
};

StyleDOMMapper.prototype.removeSelector = function(selector) {
  var mappedElements = this.selectorElementMap.get(selector);

  if (mappedElements) {
    for (var i = 0; i < mappedElements.length; i++) {
      var mappedSelectors = this.elementSelectorMap.get(mappedElements[i]);

      if (basis.array.remove(mappedSelectors, selector) && !mappedSelectors.length) {
        this.elementSelectorMap.delete(mappedElements[i]);
      }
    }

    this.selectorElementMap.delete(selector);
  }
};

StyleDOMMapper.prototype.removeElement = function(element) {
  var mappedSelectors = this.elementSelectorMap.get(element);

  if (mappedSelectors) {
    for (var i = 0; i < mappedSelectors.length; i++) {
      var mappedElements = this.selectorElementMap.get(mappedSelectors[i]);

      if (basis.array.remove(mappedElements, element) && !mappedElements.length) {
        this.selectorElementMap.delete(mappedSelectors[i]);
      }
    }

    this.elementSelectorMap.delete(element);
  }
};

StyleDOMMapper.prototype.linkElements = function(token, elements) {
  var selector = translate(token);
  var mappedElements = this.selectorElementMap.get(token) || [];

  elements = Array.isArray(elements) ? element : basis.array.from(elements)
  elements.forEach(function(element) {
    var mappedSelectors = this.elementSelectorMap.get(element) || [];

    if (basis.array.add(mappedSelectors, token)) {
      this.elementSelectorMap.set(element, mappedSelectors);
      // console.log('token', selector, 'pushed for', element);
    }

    if (basis.array.add(mappedElements, element)) {
      // console.log('element', element, 'pushed for', selector);
    }
  }, this);

  // todo if(mappedElements.length)
  this.selectorElementMap.set(token, mappedElements);
};

StyleDOMMapper.prototype.map = function(root, processedAST, sourceMap) {
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

        // добавляем комбинатор в стек, но не делаем запрос в dom и не линкуем элементы
        if (sourcePart.type == 'Combinator') {
          return;
        }

        var partSelector = translate({type: 'SimpleSelector', sequence: new List(stack)});
        var elements = root.querySelectorAll(partSelector);

        // console.group('part selector', partSelector, part);

        this.linkElements(part, elements);
        // console.groupEnd();
      }, this);
      // console.groupEnd();
    }
  }, this);
};

module.exports = StyleDOMMapper;
