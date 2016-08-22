var Value = require('basis.data').Value;
var Node = require('basis.ui').Node;
var router = require('basis.router');

module.exports = new Node({
  template: resource('./template/list.tmpl'),

  childClass: {
    template: resource('./template/item.tmpl'),
    selected: Value
      .from(router.route(/(.*)/).param(0))
      .compute('update', function(node, url){
        return node.data.source == url;
      }),
    binding: {
      title: 'data:source'
    },
    action: {
      select: function(){
        router.navigate(this.data.source);
      }
    }
  },

  childNodes: [
    'node_modules/basisjs/src/basis/ui/templates/button/Button.tmpl',
    'node_modules/basisjs/src/basis/ui/templates/popup/Balloon.tmpl',
    'node_modules/basisjs/src/basis/ui/templates/paginator/PaginatorNode.tmpl',
    'data/button.tmpl',
    'data/checkbox.tmpl',
    'data/window.tmpl',
    'data/box.tmpl',
    'data/complex/panel.tmpl',
    'data/complex/button.tmpl'
  ].map(function(url){
    return {
      data: {
        source: basis.asset('./' + url)
      }
    };
  })
});
