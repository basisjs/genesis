var StyleDOMMapper = require('./styleDomMapper');
var walk = require('utils.walker').all;
var List = require('csso:utils/list.js');
var ProcessableStyleResource = require('./resource').ProcessableStyleResource;

function getAllEmulators(emuList) {
  var emulators = Object.keys(emuList).reduce(function(emulators, stateName) {
    return stateName == '*' ? emulators : emulators.concat(emuList[stateName]);
  }, []);

  return emulators.concat(emuList['*'] || []);
}

function getStateEmulators(state, emuList) {
  var emulators = emuList.hasOwnProperty(state) && Array.isArray(emuList[state]) ? emuList[state] : [];

  return emulators.concat(emuList['*'] || []);
}

/**
 * @property {Object} generator
 * @property {Object} emulators
 * @property {Object} states
 * @property {Array} generator
 */
module.exports = basis.Class(null, {
  className: 'dp.Variant',
  extendConstructor_: true,
  init: function() {
    this.emulators = this.emulators || {};
    this.resources = this.generator.getStyles();
    this.template = this.generator.generate(this.states);
    this.wrapperClass = 'dp-variant-wrapper-' + this.basisObjectId;
    this.resources = this.resources.map(function(resource) {
      return new ProcessableStyleResource({source: resource, useImmediate: true});
    }, this);
    this.emulators = this.emulators || [];

    this.wrapper = document.createElement('div');
    this.wrapper.appendChild(this.template.getDOM());
    this.isolateStyles();

    this.styleDOMMapper = new StyleDOMMapper();
    this.resources.forEach(function(resource) {
      this.styleDOMMapper.map(this.wrapper, resource.AST, resource.sourceMap);
    }, this);

    this.resources.forEach(function(resource) {
      walk(resource.AST, {
        SimpleSelector: function(token, parent) {
          token.sequence.each(function(part) {
            var emulators = getAllEmulators(this.emulators);

            emulators.forEach(function(emulator) {
              emulator.handleToken(part, parent, resource.AST, resource.sourceMap);
            });
          }, this);
        }
      }, this);
    }, this);

    this.resources.forEach(function(resource) {
      walk(resource.AST, {
        SimpleSelector: function(token, parent) {
          token.sequence.each(function(part) {
            for (var stateName in this.states) {
              if (!this.states.hasOwnProperty(stateName)) {
                continue;
              }

              var emulators = getStateEmulators(stateName, this.emulators);

              emulators.forEach(function(emulator) {
                emulator.emulate(part, parent, resource.AST, resource.sourceMap, this.styleDOMMapper, this.states[stateName]);
              }, this);
            }
          }, this);
        }
      }, this);

      resource.apply();
    }, this);
  },
  isolateStyles: function() {
    this.wrapper.classList.add(this.wrapperClass);

    this.resources.forEach(function(resource) {
      walk(resource.AST, {
        SimpleSelector: function(token) {
          var firstToken = token.sequence.head;

          if (firstToken.data.type == 'Class' && firstToken.data.name != this.wrapperClass || firstToken.data.type == 'Id') {
            var className = List.createItem({type: 'Class', name: this.wrapperClass});
            var combinator = List.createItem({type: 'Combinator', name: ' '});

            token.sequence.insert(combinator, firstToken);
            token.sequence.insert(className, combinator);
          }
        }
      }, this);
      resource.apply();
    }, this);
  },
  unIsolateStyles: function() {
    this.wrapper.classList.remove(this.wrapperClass);

    this.resources.forEach(function(resource) {
      walk(resource.AST, {
        SimpleSelector: function(token) {
          var firstToken = token.sequence.head;

          if (firstToken.data.type == 'Class' && firstToken.data.name == this.wrapperClass) {
            token.sequence.remove(token.sequence.first());
            token.sequence.remove(token.sequence.first());
          }
        }
      }, this);
      resource.apply();
    }, this);
  },
  destroy: function() {
    this.resources.forEach(function(resource) {
      resource.destroy();
    });
    this.wrapper.removeChild(this.template.getDOM());
    basis.Class.prototype.destroy.call(this);
  }
});
