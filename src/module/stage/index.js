var Value = require('basis.data').Value;
var Node = require('basis.ui').Node;
var router = require('basis.router');
var Builder = require('app.lib.builder');
var Generator = require('app.lib.generator.basis');
var emulators = require('app.lib.emulators.index');
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
    return Object.keys(node.states).length + JSON.stringify(node.states);
  },
  childClass: {
    template: resource('./template/variant.tmpl'),
    init: function() {
      Node.prototype.init.call(this);

      // копируем объект и сортируем его свойства
      this.states = sortObject(basis.object.merge(this.states));

      // удаляем false-состояния из комбинации
      for (var stateName in this.states) {
        if (this.states.hasOwnProperty(stateName) && this.states[stateName] === false) {
          delete this.states[stateName];
        }
      }
    },
    binding: {
      states: function(node) {
        return JSON.stringify(node.states);
      },
      html: 'html',
      isBlock: 'isBlock'
    }
  }
});

var vBuilder;
var tGenerator;

function rebuildStage() {
  var url = selectedTemplate.value;
  var variants = [];

  variants.digest = {};
  variants.ignored = [];

  if (url) {
    if (vBuilder) {
      tGenerator.getStyles().forEach(function(style) {
        style.physResource.detach(rebuildStage);
      });
      vBuilder.destroy();
      tGenerator.destroy();
    }

    tGenerator = new Generator({url: url});
    vBuilder = new Builder({generator: tGenerator, emulators: basis.object.values(emulators)});

    tGenerator.getStyles().forEach(function(style) {
      style.physResource.attach(rebuildStage);
    });

    ignoreCount.set(vBuilder.ignoredVariantsCount);
    view.setChildNodes(vBuilder.variants.map(function(variant) {
      return {
        states: variant.states,
        html: variant.wrapper,
        isBlock: variant.isBlock
      };
    }));
  }
}

selectedTemplate.link(view, rebuildStage);

module.exports = view;
