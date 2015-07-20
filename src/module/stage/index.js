var Value = require('basis.data').Value;
var Node = require('basis.ui').Node;
var router = require('basis.router');
var makeDeclaration = require('basis.template.declaration').makeDeclaration;
var builder = require('basis.template.html').Template.prototype.builder;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var parse = require('app:utils/parser.js');
var translate = require('app:utils/translate.js');
var walker = require('app:utils/walker.js');
var domUtils = require('basis.dom');
var HOVER = 'hover__' + basis.genUID();
var ACTIVE = 'active__' + basis.genUID();

var walk = function(ast, handlers, context){
  return walker(ast, function(token, parent, stack){
    var handler = typeof handlers == 'function' ? handlers : handlers[token[0]];

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

function comb(decl, variants, state, sequence, emulateState){
  if (!sequence.length)
  {
    addVariant(variants, buildVariant(decl, state));
    emulateState.forEach(function(pseudoState){
      var stateCount = pseudoState.states.length;
      var stateCombinationCount = 1 << stateCount;
      var stateNum = 0;

      for (var stateNum = 1; stateNum < stateCombinationCount; stateNum++)
      {
        var candidate = buildVariant(decl, state);
        try {
          var elements = candidate.html.querySelectorAll(pseudoState.selector);
          var idx = 0;

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
        } catch(e) {
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
    comb(decl, variants, combState, sequence, emulateState);
  }
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
    var emulateMap = {};
    var emulateState;

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
          simpleselector: function(token){
            var noPseudoc = token.every(function(t){
              return t[0] != 'pseudoc';
            });

            if (noPseudoc)
              return;

            var group = [];
            var parts = [group];
            for (var i = 1; i < token.length; i++)
              if (token[i][0] == 's' || token[i][0] == 'combinator')
              {
                if (!group.length)
                  continue;

                group = [];
                parts.push(group);
                if (token[i][0] == 'combinator')
                  group.push(token[i]);
              }
              else
                group.push(token[i]);

            if (!group.length)
              parts.pop();

            var selector = [];
            for (var i = 0; i < parts.length; i++)
            {
              var states = [];
              var nopseudo = parts[i].filter(function(p){
                if (p[0] == 'pseudoc')
                {
                  if (p[1][1] == 'hover')
                  {
                    states.push({
                      name: 'hover',
                      className: HOVER,
                      values: [false, true]
                    });
                    p[0] = 'clazz';
                    p[1][1] = HOVER;
                    return;
                  }
                  if (p[1][1] == 'active')
                  {
                    states.push({
                      name: 'active',
                      className: ACTIVE,
                      values: [false, true]
                    });
                    p[0] = 'clazz';
                    p[1][1] = ACTIVE;
                    return true;
                  }
                }
                return p[0] != 'pseudoc';
              });

              selector.push(translate(['simpleselector'].concat(nopseudo)));

              if (nopseudo.length != parts[i].length)
              {
                var currentSelector = selector.join(' ');
                if (currentSelector)
                  states.forEach(function(state){
                    if (!hasOwnProperty.call(emulateMap, currentSelector))
                      emulateMap[currentSelector] = [];
                    if (!basis.array.search(emulateMap[currentSelector], state.name, 'name'))
                      emulateMap[currentSelector].push(state);
                  });

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

    emulateState = basis.object.iterate(emulateMap, function(selector, states){
      return {
        selector: selector,
        states: states
      };
    });

    // create template instance factory
    decl.instances = {};
    decl.builder = builder.call({ source: source }, decl.tokens, decl.instances);

    // build combinations
    comb(decl, variants, {}, sequence, emulateState);
  }

  view.setChildNodes(variants);
  ignoreCount.set(variants.ignored.length);
}

selectedTemplate.link(view, rebuildStage);

module.exports = view;
