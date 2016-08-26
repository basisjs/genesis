var Node = require('basis.ui').Node;
var Value = require('basis.data').Value;
/** @cut */ require('basis.devpanel');

require('basis.router').start();

module.exports = require('basis.app').create({
  title: 'Template state generator',

  init: function() {
    var list = require('./module/list/index.js');
    var stage = require('./module/stage/index.js');
    var backChooser = require('./module/back-chooser/index.js');

    // stage.setDelegate(
    //   Value.from(list.selection, 'itemsChanged', 'pick()')
    // );

    return new Node({
      template: resource('./app/template/layout.tmpl'),
      binding: {
        list: list,
        stage: stage,
        backChooser: backChooser,
        back: Value
          .from(backChooser, 'selectionChanged', 'selection')
          .pipe('itemsChanged', function(selection) {
            return selection.pick().value;
          })
      }
    });
  }
});
