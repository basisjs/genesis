var Node = require('basis.ui').Node;

module.exports = new Node({
  template: resource('./template/list.tmpl'),

  selection: true,
  childClass: {
    template: resource('./template/item.tmpl'),
    binding: {
      back: 'value'
    }
  },

  childNodes: [
    'url(' + asset('./template/img/bg.gif') + ') #F0F0F0',
    'black',
    'rgb(64, 64, 64)',
    'rgb(128, 128, 128)',
    'rgb(192, 192, 192)',
    'white'
  ].map(function(back, idx) {
    return {
      value: back,
      selected: !idx
    };
  })
});
