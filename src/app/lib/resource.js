var styleUtils = require('utils.style');
var parse = require('csso:parser/index');
var translate = require('csso:utils/translate.js');

var Resource = basis.Class(null, {
  extendConstructor_: true,
  className: 'dp.Resource',
  startUse: function() {
    this.resource.startUse();
  },
  stopUse: function() {
    this.resource.stopUse();
  },
  apply: function() {
    this.resource.updateCssText(translate(this.AST));
  },
  destroy: function() {
    this.stopUse();
    //TODO очищать ресурсы
    //this.resource.destroy();
    //this.physResource.destroy();
    basis.Class.prototype.destroy.call(this);
  },
  postInit: function() {
    if (this.useImmediate) {
      this.startUse();
    }
  }
});

var StyleResource = basis.Class(Resource, {
  className: 'dp.StyleResource',
  init: function() {
    this.physResource = basis.resource(this.url);
    this.resource = this.physResource.fetch();
    this.AST = parse(this.resource.cssText);
  }
});

var ProcessableStyleResource = Resource.subclass({
  className: 'dp.ProcessableStyleResource',
  init: function() {
    this.physResource = this.source.physResource;
    this.resource = basis.resource.virtual('css', this.source.resource.cssText, this.url).fetch();
    this.AST = parse(this.resource.cssText);
    this.sourceMap = styleUtils.sourceMap(this.source.AST, this.AST)
  }
});

module.exports = {
  StyleResource: StyleResource,
  ProcessableStyleResource: ProcessableStyleResource
};
