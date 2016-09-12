/**
 * @property {Object} states
 * @property {Object} template
 */
module.exports = basis.Class(null, {
  className: 'dp.Template',
  extendConstructor_: true,
  init: function() {
    if (this.states) {
      for (var stateName in this.states) {
        if (this.states.hasOwnProperty(stateName)) {
          this.template.set(stateName, this.states[stateName]);
        }
      }
    } else {
      this.states = {};
    }
  },
  getDOM: function() {
    return /*this.template.element.parentNode || */this.template.element;
  }
});
