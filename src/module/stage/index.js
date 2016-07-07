var Value = require('basis.data').Value;
var Node = require('basis.ui').Node;
var router = require('basis.router');
var makeDeclaration = require('basis.template.declaration').makeDeclaration;
var builder = require('basis.template.html').Template.prototype.builder;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var parse = require('csso:parser/index');
var translate = require('csso:utils/translate.js');
var walker = require('csso:utils/walk.js');
var List = require('csso:utils/list.js');
var domUtils = require('basis.dom');
var HOVER = 'hover__' + basis.genUID();
var ACTIVE = 'active__' + basis.genUID();
var BEFORE = 'before__' + basis.genUID();
var AFTER = 'after__' + basis.genUID();

var walk = function(ast, handlers, context){
  return walker.all(ast, function(token, parent, stack){
    var handler = typeof handlers == 'function' ? handlers : handlers[token.type];

    if (typeof handler == 'function')
      handler.call(context, token, parent, stack);
  });
};

require('basis.l10n').setCultureList('ru-RU');

var selectedTemplate = Value.from(router.route(/(.*)/).param(0));
var ignoreCount = new basis.Token(0);
var view = new Node({
  template: resource('./template/view.tmpl'),
  binding: {
    title: router.route(/(.*)/).param(0),
    ignoreCount: ignoreCount
  },

  childClass: {
    template: resource('./template/variant.tmpl'),
    binding: {
      condition: 'condition',
      html: 'html',
      isBlock: 'isBlock'
    },
    templateAction: function(){
      // nothing todo
    }
  }
});

function getDigest(node){
  document.body.appendChild(node);
  var result = domUtils.axis(node, domUtils.AXIS_DESCENDANT).map(function(node){
    if (node.nodeType == 1)
      return getComputedStyle(node).cssText;
    if (node.nodeType == 3)
      return node.nodeValue;
    return '';
  }).join('');
  document.body.removeChild(node);
  return result;
}

function getFirstNodeStyle(html){
  var node = html.firstChild;
  var result = {};

  document.body.appendChild(html);
  if (node.nodeType == 1)
    result = basis.object.slice(getComputedStyle(node));
  document.body.removeChild(html);

  return result;
}

function buildVariant(decl, state){
  var tmpl = decl.builder.createInstance();
  var buffer = document.createElement('div');

  for (var name in state)
    if (hasOwnProperty.call(state, name))
      tmpl.set(name, state[name]);

  buffer.appendChild(tmpl.element.parentNode || tmpl.element);

  return {
    condition: JSON.stringify(state),
    html: buffer
  };
}

function addVariant(variants, candidate){
  var digest = getDigest(candidate.html);
  if (!hasOwnProperty.call(variants.digest, digest))
  {
    var firstNodeStyle = getFirstNodeStyle(candidate.html);
    candidate.isBlock = firstNodeStyle.display == 'block';

    variants.digest[digest] = true;
    variants.push(candidate);
  }
  else
    variants.ignored.push(candidate);
}

function comb(decl, variants, state, sequence, emulateState, emulateElement){
  if (!sequence.length)
  {
    addVariant(variants, buildVariant(decl, state));
    emulateState.forEach(function(pseudoState){
      var stateCount = pseudoState.states.length;
      var stateCombinationCount = 1 << stateCount;

      for (var stateNum = 1; stateNum < stateCombinationCount; stateNum++)
      {
        var candidate = buildVariant(decl, state);
        try {
          var elements = candidate.html.querySelectorAll(pseudoState.selector);

          if (!elements.length)
            continue;

          for (var idx = 0; idx < stateCount; idx++)
            if ((stateNum >> idx) & 1)
            {
              var stateInfo = pseudoState.states[idx];

              elements[0].classList.add(stateInfo.className);
              candidate.condition += ' +' + stateInfo.name;
            }

          addVariant(variants, candidate);
        } catch(e){
          console.error('Can\'t generate state: ', e);
        }
      }
    });

    return;
  }

  sequence = basis.array(sequence);

  var info = sequence.shift();
  for (var i = 0; i < info.values.length; i++)
  {
    var combState = basis.object.slice(state);
    combState[info.name] = info.values[i];
    comb(decl, variants, combState, sequence, emulateState, emulateElement);
  }

  variants.forEach(function(variant){
    emulateElement.forEach(function(emulation){
      var targetElements = variant.html.querySelectorAll(emulation.selector);

      if (!targetElements.length)
        return;

      targetElements.forEach(function(element){
        emulation.elements.forEach(function(pseudo){
          var emulator = document.createElement('span');
          emulator.innerText = pseudo.content || '';
          emulator.className = pseudo.className;

          if (pseudo.prepend && element.firstChild)
          {
            element.insertBefore(emulator, element.firstChild);
          }
          else
          {
            element.appendChild(emulator);
          }
        });
      });
    });
  });
}

var currentStyles = [];

function rebuildStage(){
  var url = selectedTemplate.value;
  var variants = [];
  var style;
  variants.digest = {};
  variants.ignored = [];

  // detach old styles if any
  while (style = currentStyles.pop())
  {
    style.original.detach(rebuildStage);
    style.processed.stopUse();
  }

  if (url)
  {
    var source = basis.resource(url);
    var decl = makeDeclaration(source.fetch(), basis.path.dirname(url), null, url);
    var bindings = decl.states;
    var sequence = [];
    var emulateClassMap = {};
    var emulateElementMap = {};
    var emulateState;
    var emulateElement;

    // template bindings
    for (var name in bindings)
      if (hasOwnProperty.call(bindings, name))
      {
        var values = [];

        if (bindings[name].bool)
          values.push(false, true);
        if (bindings[name].enum)
          values.push.apply(values, bindings[name].enum);

        if (values.length)
          sequence.push({
            name: name,
            values: values
          });
      }

    // process styles
    for (var i = 0; style = decl.styles[i]; i++)
      if (style.resource)
      {
        var resource = basis.resource(style.resource);
        var ast = parse(resource.fetch().cssText);

        walk(ast, {
          // суть данного блока - вынуть значение правила content для before/after и подставить в эмулирующие элементы
          Ruleset: function(token){
            // есть ли в данном блоке правило 'content'?
            var contentRule = basis.array.search(token.block.declarations.toArray(), 'content', 'property.name');

            if (contentRule)
            {
              // транслируем
              var ruleValue = translate(contentRule.value);
              // если строка, то нужно отбросить кавычки
              if (typeof ruleValue == 'string')
              {
                ruleValue = ruleValue .slice(1, -1);
              }
              // перебираем селекторы для данного набора провил
              token.selector.selectors.first().sequence.each(function(item){
                // чтобы не перебирать всю иерархию emulateElementMap, разворачиваем его в одномерный массив
                basis.array.flatten(basis.object.values(emulateElementMap)).forEach(function(pseudoElement){
                  // если найден токен соответствующий текущему эмулируемому элементу, то запоминаем значение правила content
                  if (pseudoElement.token == item)
                  {
                    pseudoElement.content = ruleValue;
                  }
                });
              });
            }
          },
          SimpleSelector: function(token){
            var hasPseudo = token.sequence.some(function(t){
              return !t.type.indexOf('Pseudo');
            });

            if (!hasPseudo)
              return;

            var group = [];
            var parts = [group];
            token.sequence.each(function(t){
              if (t.type == 'String' || t.type == 'Combinator')
              {
                if (!group.length)
                  return;

                group = [];
                parts.push(group);
                if (t.type == 'Combinator')
                  group.push(t);
              }
              else
                group.push(t);
            });

            if (!group.length)
              parts.pop();

            var selector = [];
            for (var i = 0; i < parts.length; i++)
            {
              var states = [];
              var elements = [];
              var nopseudo = parts[i].filter(function(p){
                if (p.type == 'PseudoClass')
                {
                  if (p.name == 'hover')
                  {
                    states.push({
                      name: 'hover',
                      className: HOVER,
                      values: [false, true]
                    });
                    p.type = 'Class';
                    p.name = HOVER;
                    return;
                  }

                  if (p.name == 'active')
                  {
                    states.push({
                      name: 'active',
                      className: ACTIVE,
                      values: [false, true]
                    });
                    p.type = 'Class';
                    p.name = ACTIVE;
                    return;
                  }
                }

                if (p.type == 'PseudoClass' || p.type == 'PseudoElement')
                {
                  if (p.name == 'before')
                  {
                    elements.push({
                      name: 'before',
                      className: BEFORE,
                      prepend: true,
                      // токен нужен для того, чтобы позже получить значение правила content
                      // у качестве альтернативы, можно использовать KeyObjectMap
                      token: p
                    });
                    // трансформируем во вложенный селектор
                    p.type = 'SimpleSelector';
                    p.sequence = new List([{type: 'Combinator', name: ' '}, {type: 'Class', name: BEFORE}]);
                    return;
                  }

                  if (p.name == 'after')
                  {
                    elements.push({
                      name: 'after',
                      className: AFTER,
                      token: p
                    });
                    // трансформируем во вложенный селектор
                    p.type = 'SimpleSelector';
                    p.sequence = new List([{type: 'Combinator', name: ' '}, {type: 'Class', name: AFTER}]);
                    return;
                  }
                }

                return true;
              });

              selector.push(translate({type: 'SimpleSelector', sequence: new List(nopseudo)}));

              if (nopseudo.length != parts[i].length)
              {
                var currentSelector = selector.join(' ');
                if (currentSelector)
                {
                  states.forEach(function(state){
                    if (!hasOwnProperty.call(emulateClassMap, currentSelector))
                      emulateClassMap[currentSelector] = [];
                    if (!basis.array.search(emulateClassMap[currentSelector], state.name, 'name'))
                      emulateClassMap[currentSelector].push(state);
                  });

                  elements.forEach(function(element){
                    if (!hasOwnProperty.call(emulateElementMap, currentSelector))
                      emulateElementMap[currentSelector] = [];
                    if (!basis.array.search(emulateElementMap[currentSelector], element.name, 'name'))
                      emulateElementMap[currentSelector].push(element);
                  });
                }
                //selectors.push(selector.join(' '));
                //console.log('>>', selector.join(' '));
              }
            }

          }
        });

        //resource.updateCssText(translate(ast));
        //console.log(translate(ast));

        var processedStyle = basis.resource.virtual('css', translate(ast), style.resource).fetch();
        processedStyle.url = style.resource;
        processedStyle.baseURI = basis.path.dirname(style.sourceUrl) + '/';
        processedStyle.startUse();

        resource.attach(rebuildStage);
        currentStyles.push({
          original: resource,
          processed: processedStyle
        });
      }

    emulateState = basis.object.iterate(emulateClassMap, function(selector, states){
      return {
        selector: selector,
        states: states
      };
    });
    emulateElement = basis.object.iterate(emulateElementMap, function(selector, elements){
      return {
        selector: selector,
        elements: elements
      };
    });

    // create template instance factory
    decl.instances = {};
    decl.builder = builder.call({ source: source }, decl.tokens, decl.instances);

    // build combinations
    comb(decl, variants, {}, sequence, emulateState, emulateElement);
  }

  view.setChildNodes(variants);
  ignoreCount.set(variants.ignored.length);
}

selectedTemplate.link(view, rebuildStage);

module.exports = view;
