module.exports = function pseudoContentFactory(pseudoContent) {
  return function contentHandler(element) {
    pseudoContent.value.sequence.each(function(part) {
      switch (part.type) {
        case 'Url':
          var image = new Image();
          image.src = part.value.value;
          element.appendChild(image);
          break;
        case 'Number':
          element.appendChild(document.createTextNode(part.value));
          break;
        case 'String':
          element.appendChild(document.createTextNode(part.value.slice(1, -1)));
          break;
        case 'Function':
          var name = part.name;
          var args = part.arguments.map(function(arg) {
            return translate(arg);
          });

          if (name == 'attr' && args[0]) {
            element.appendChild(document.createTextNode(element.parentNode.getAttribute(args[0])));
          }
          break;
        case 'Identifier':
          // todo:
          // counter
          // open-quote
          // close-quote
          // no-open-quote
          // no-close-quote
          // initial
          // inherit
          break;
      }
    });
  }
};
