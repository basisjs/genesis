var walk = require('utils.walker').all;
var sortObject = require('utils.index').sortObject;
var domUtils = require('utils.dom');
var Variant = require('./variant');

/**
 * @property {Array} emulators
 * @property {Object} generator
 */
module.exports = basis.Class(null, {
  className: 'dp.Builder',
  extendConstructor_: true,
  init: function() {
    var emulators = Array.isArray(this.emulators) ? this.emulators : basis.array.from(this.emulators);

    this.emulators = {
      '*': []
    };
    this.digest = {};
    this.variants = [];
    this.ignoredVariantsCount = 0;
    this.states = this.generator.getStates();
    this.states = this.generator.getStyles().reduce(function(states, style) {
      return states.concat(this.handleStyle(style, emulators));
    }.bind(this), this.states);

    if (this.states.length) {
      this.states = this.combine(this.states);
    } else {
      this.states.push({hasStates: false});
    }

    this.states.forEach(function(state) {
      var newVariant = this.buildVariant(state);

      if (!this.addVariant(newVariant)) {
        newVariant.destroy();
      }
    }, this);

    console.log('BUILDER', this);
    console.log('STATES', this.states);
    console.log('EMULATORS', this.emulators);
    console.log('VARIANTS', this.variants);
    console.log('=======================');

  },
  handleStyle: function(style, emulators) {
    var states = {};

    emulators.forEach(function(emulator) {
      var newStates = emulator.getStates(style.AST);

      if (Array.isArray(newStates)) {
        newStates.forEach(function(state) {
          var stateString = JSON.stringify(state);

          if (!states[stateString]) {
            for (var stateName in state) {
              if (state.hasOwnProperty(stateName)) {
                this.emulators[stateName] = this.emulators[stateName] || [];
                basis.array.add(this.emulators[stateName], emulator);
              }
            }

            states[stateString] = state;
          }
        }, this);
      } else {
        basis.array.add(this.emulators['*'], emulator);
      }
    }, this);
    style.apply();

    return basis.object.values(states);
  },
  buildVariant: function(states) {
    return new Variant({generator: this.generator, emulators: this.emulators, states: states});
  },
  addVariant: function(candidate) {
    var digest;

    if (this.variants.indexOf(candidate) > -1) {
      return;
    }

    digest = domUtils.getDigest(candidate.wrapper);

    if (!this.digest.hasOwnProperty(digest)) {
      this.digest[digest] = true;
      this.variants.push(candidate);

      return true;
    } else {
      this.ignoredVariantsCount++;

      return false;
    }
  },
  combine: function(states) {
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
  }
});
