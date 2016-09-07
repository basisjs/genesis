var Value = require('basis.data').Value;
var Node = require('basis.ui').Node;
var router = require('basis.router');
var VariantBuilder = require('utils.builder');
var emulators = require('utils.emulators.index');
var sortObject = require('utils.index').sortObject;

require('basis.l10n').setCultureList('ru-RU');

var selectedTemplate = Value.from(router.route(/(.*)/).param(0));
var ignoreCount = new basis.Token(0);
var view = new Node({
  template: resource('./template/view.tmpl'),
  binding: {
    title: router.route(/(.*)/).param(0),
    ignoreCount: ignoreCount
  },

  sorting: function(node) {
    return Object.keys(node.condition).length + JSON.stringify(node.condition);
  },
  childClass: {
    template: resource('./template/variant.tmpl'),
    init: function() {
      Node.prototype.init.call(this);

      // копируем объект и сортируем его свойства
      this.condition = sortObject(basis.object.merge(this.condition));

      // удаляем false-состояния из комбинации
      for (var stateName in this.condition) {
        if (this.condition.hasOwnProperty(stateName) && this.condition[stateName] === false) {
          delete this.condition[stateName];
        }
      }
    },
    binding: {
      condition: function(node) {
        return JSON.stringify(node.condition);
      },
      html: 'html',
      isBlock: 'isBlock'
    }
  }
});

var vBuilder;

function rebuildStage() {
  var url = selectedTemplate.value;
  var variants = [];

  variants.digest = {};
  variants.ignored = [];

  if (url) {
    if (vBuilder) {
      vBuilder.destroy();
      vBuilder.styles.forEach(function(style) {
        style.original.detach(rebuildStage);
      });
    }

    var resource = basis.resource(url);

    vBuilder = new VariantBuilder(resource, Object.keys(emulators).map(function(name) {
      return emulators[name];
    }));

    vBuilder.styles.forEach(function(style) {
      style.original.attach(rebuildStage);
    });

    ignoreCount.set(vBuilder.getIgnoredCount());
    view.setChildNodes(vBuilder.getAcceptedVariants());
  }
}

selectedTemplate.link(view, rebuildStage);

module.exports = view;
