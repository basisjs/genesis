var domUtils = require('basis.dom');
var parse = require('csso:parser/index');
var walk = require('utils.walker').all;
var sortObject = require('utils.index').sortObject;
var translate = require('csso:utils/translate.js');
var StyleDOMMapper = require('utils.styleDomMapper');
var makeDeclaration = require('basis.template.declaration').makeDeclaration;
var templateBuilder = require('basis.template.html').Template.prototype.builder;

function Builder(resource, emulators) {
  var bindings;

  this.resource = resource;
  this.decl = makeDeclaration(resource.fetch(), basis.path.dirname(resource.url), null, resource.url);
  this.decl.instances = {};
  this.templateBuilder = templateBuilder.call({source: resource}, this.decl.tokens, this.decl.instances);
  this.emulators = {
    '*': []
  };
  this.variants = [];
  this.ignoredVariantsCount = 0;
  this.allVariants = [];
  this.digest = {};
  this.styles = [];
  this.states = [];

  this.decl.styles.forEach(function(style) {
    var resource;
    var sourceAST;
    var processedAST;
    var processedStyle;

    if (!style.resource) {
      return;
    }

    resource = basis.resource(style.resource);
    sourceAST = parse(resource.fetch().cssText);
    processedAST = parse(resource.fetch().cssText);
    processedStyle = basis.resource.virtual('css', resource.fetch().cssText, style.resource).fetch();

    processedStyle.url = style.resource;
    processedStyle.baseURI = basis.path.dirname(style.sourceUrl) + '/';
    processedStyle.startUse();

    this.styles.push({
      isOwnStyle: !style.includeToken,
      original: resource,
      sourceAST: sourceAST,
      processed: processedStyle,
      processedAST: processedAST,
      sourceMap: this.generateSourceMap(sourceAST, processedAST)
    });
  }, this);

  bindings = this.decl.states;

  for (var name in bindings) {
    if (bindings.hasOwnProperty(name)) {
      var values = [];

      if (bindings[name].bool) {
        values.push(false, true);
      }

      if (bindings[name].enum) {
        values.push.apply(values, bindings[name].enum);
      }

      values.forEach(function(value) {
        var state = {};

        state[name] = value;
        this.states.push(state);
      }, this);
    }
  }

  this.styles.forEach(function(style) {
    this.states = this.states.concat(this.handleStyle(style, basis.array.from(emulators)));
  }, this);

  this.states = this.combine(this.states);

  if (!this.states.length) {
    this.states.push({hasState: false});
  }

  this.states.forEach(function(state) {
    var newVariant = this.buildVariant(state);

    for (var stateName in state) {
      var emulators;

      if (!state.hasOwnProperty(stateName)) {
        continue;
      }

      emulators = this.emulators[stateName] || [];
      emulators = emulators.concat(this.emulators['*']);

      if (emulators.length) {
        this.styles.forEach(function(style) {
          var needToRetranslate = false;

          walk(style.processedAST, {
            SimpleSelector: function(token, parent) {
              token.sequence.each(function(part) {
                emulators.forEach(function(emulator) {
                  needToRetranslate = emulator.emulate(part, parent, style.processedAST, style.sourceMap, newVariant.mapper, state[stateName]) || needToRetranslate;
                });
              });
            }
          });

          if (needToRetranslate) {
            style.processed.updateCssText(translate(style.processedAST));
          }
        });
      }
    }

    this.addVariant(newVariant);
  }, this);

  console.log('STATES', this.states);
  console.log('EMULATORS', this.emulators);

  console.log('=======================');
  console.log(this);
}

Builder.prototype.destroy = function() {
  this.styles.forEach(function(style) {
    style.processed.stopUse();
  });
};

Builder.prototype.generateSourceMap = function(sourceAst, processedAST) {
  var sourceTokens = [];
  var processedTokens = [];
  var sourceMap = new WeakMap();

  // todo возможно есть более простой способ сфлэтить все селекторы из ast
  walk(sourceAst, {
    SimpleSelector: function(token) {
      token.sequence.each(function(part) {
        sourceTokens.push(part)
      });
    }
  });

  walk(processedAST, {
    SimpleSelector: function(token) {
      token.sequence.each(function(part) {
        processedTokens.push(part)
      });
    }
  });

  processedTokens.forEach(function(pToken, key) {
    sourceMap.set(pToken, sourceTokens[key]);
  });

  return sourceMap;
};

Builder.prototype.handleStyle = function(style, emulators) {
  var states = {};

  walk(style.processedAST, {
    SimpleSelector: function(token, parent) {
      token.sequence.each(function(part) {
        emulators.forEach(function(emulator) {
          var newStates;

          emulator.handleToken(part, parent, style.processedAST, style.sourceMap);
          newStates = emulator.getStates(style.sourceAST) || [];

          if (!newStates.length) {
            if (this.emulators['*'].indexOf(emulator) < 0) {
              this.emulators['*'].push(emulator)
            }
          }

          newStates.forEach(function(state) {
            var stateString = JSON.stringify(state);

            if (!states[stateString]) {
              for (var stateName in state) {
                if (state.hasOwnProperty(stateName)) {
                  this.emulators[stateName] = this.emulators[stateName] || [];

                  if (this.emulators[stateName].indexOf(emulator) < 0) {
                    this.emulators[stateName].push(emulator)
                  }
                }
              }

              states[stateString] = state;
            }
          }, this);
        }, this);
      }, this);
    }
  }, this);
  style.processed.updateCssText(translate(style.processedAST));

  return basis.object.values(states);
};

Builder.prototype.getDigest = function(node) {
  document.body.appendChild(node);
  var result = domUtils.axis(node, domUtils.AXIS_DESCENDANT).map(function(node) {
    if (node.nodeType == 1) {
      return getComputedStyle(node).cssText;
    }

    if (node.nodeType == 3) {
      return node.nodeValue;
    }

    return '';
  }).join('');

  document.body.removeChild(node);

  return result;
};

Builder.prototype.getFirstNodeStyle = function(html) {
  var node = html.firstChild;
  var result = {};

  document.body.appendChild(html);

  if (node.nodeType == 1) {
    result = basis.object.slice(getComputedStyle(node));
  }

  document.body.removeChild(html);

  return result;
};

Builder.prototype.buildVariant = function(state) {
  var tmpl = this.templateBuilder.createInstance();
  var buffer = document.createElement('div');
  var styleDOMMapper = new StyleDOMMapper();

  for (var name in state) {
    if (state.hasOwnProperty(name)) {
      tmpl.set(name, state[name]);
    }
  }

  buffer.appendChild(tmpl.element.parentNode || tmpl.element);

  this.styles.forEach(function(style) {
    styleDOMMapper.map(buffer, style.processedAST, style.sourceMap);
  }, this);

  return {
    mapper: styleDOMMapper,
    condition: state,
    html: buffer
  };
};

Builder.prototype.addVariant = function(candidate) {
  var digest;

  if (this.allVariants.indexOf(candidate) > -1) {
    return;
  }

  this.allVariants.push(candidate);

  digest = this.getDigest(candidate.html);

  if (!this.digest.hasOwnProperty(digest)) {
    var firstNodeStyle = this.getFirstNodeStyle(candidate.html);

    candidate.isBlock = firstNodeStyle.display == 'block';
    this.digest[digest] = true;
    this.variants.push(candidate);
  } else {
    this.ignoredVariantsCount++;
  }
};

Builder.prototype.getAcceptedVariants = function() {
  return this.variants;
};

Builder.prototype.getIgnoredCount = function() {
  return this.ignoredVariantsCount;
};

// fixme подумать над тем, нужно ли выбирать все комбинации, при большом количестве комбинаций получаем тормоза при формировании комбинаций
Builder.prototype.combine = function(states) {
  var newStates = {};

  states.forEach(function(state) {
    Object.keys(newStates).forEach(function(stateName) {
      var stateToAdd = basis.object.merge(state, newStates[stateName]);
      var objectString = JSON.stringify(sortObject(stateToAdd));

      if (!newStates[objectString]) {
        newStates[objectString] = stateToAdd;
      }
    });

    var objectString = JSON.stringify(sortObject(state));

    if (!newStates[objectString]) {
      newStates[objectString] = state;
    }
  });

  return basis.object.values(newStates);
};

module.exports = Builder;
