var makeDeclaration = require('basis.template.declaration').makeDeclaration;
var templateBuilder = require('basis.template.html').Template.prototype.builder;
var Template = require('../template');
var StyleResource = require('../resource').StyleResource;

/**
 * @property {String} url
 */
module.exports = basis.Class(null, {
  className: 'dp.generator.BasisGenerator',
  extendConstructor_: true,
  init: function() {
    this.resource = basis.resource(this.url);
    this.decl = makeDeclaration(this.resource.fetch(), basis.path.dirname(this.resource.url), null, this.resource.url);
    this.decl.instances = {};
    this.templateBuilder = templateBuilder.call({source: this.resource}, this.decl.tokens, this.decl.instances);
    this.states = [];

    for (var name in this.decl.states) {
      if (this.decl.states.hasOwnProperty(name)) {
        var values = [];

        if (this.decl.states[name].bool) {
          values.push(false, true);
        }

        if (this.decl.states[name].enum) {
          values.push.apply(values, this.decl.states[name].enum);
        }

        values.forEach(function(value) {
          var state = {};

          state[name] = value;
          this.states.push(state);
        }, this);
      }
    }

    this.styles = this.decl.styles.map(function(style) {
      return new StyleResource({url: style.resource})
    });
  },
  generate: function(states) {
    return new Template({template: this.templateBuilder.createInstance(), states: states});
  },
  getStates: function() {
    return this.states;
  },
  getStyles: function() {
    return this.styles;
  },
  destroy: function() {
    this.templateBuilder.destroy();
    this.resource.destroy();
    this.styles.forEach(function(style) {
      style.destroy();
    });
    basis.Class.prototype.destroy.call(this);
  }
});
