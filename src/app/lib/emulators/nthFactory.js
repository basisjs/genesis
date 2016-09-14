var List = require('csso:utils/list.js');

module.exports = function nthFactory(nth, element, sourceMap) {
  var sourceNth = sourceMap.get(nth) || {};
  var normalizedArgs;
  var classMap = {
    'first-child': {
      a: '0n',
      b: 1
    },
    'last-child': {
      a: '0n',
      b: element.parentNode.children.length
    }
  };
  var argMap = {
    even: {
      a: '2n',
      b: 0
    },
    odd: {
      a: '2n',
      b: 1
    }
  };

  console.log(nth);

  if (['first-child', 'last-child', 'nth-child'].indexOf(nth.name) == -1) {
    return;
  }

  if (nth.type == 'PseudoClass') {
    if (!(normalizedArgs = classMap[nth.name])) {
      throw new Error('Something awful was happened...');
    }
  } else if (nth.type == 'FunctionalPseudo') {
    var args = nth.arguments.first().sequence.toArray();

    if (args.length == 1) {
      normalizedArgs = argMap[args[0].value] || {
          a: args[0].value,
          b: 0
        }
    } else if (args.length == 3) {
      normalizedArgs = {
        a: args[0].value,
        b: args[2].value
      }
    } else {
      throw new Error('Something awful was happened...');
    }
  }

  return {
    change: function(amount) {
      console.log(nth.name, amount);
      if (amount < 0 || sourceNth.name == 'last-child' && amount > 0) {
        return;
      }

      normalizedArgs.b += amount;
    },
    apply: function() {
      var args = new List([{
        type: 'Argument',
        sequence: new List([
          {type: 'Nth', value: normalizedArgs.a},
          {type: 'Operator', value: '+'},
          {type: 'Nth', value: normalizedArgs.b}
        ])
      }]);

      nth.name = 'nth-child';
      nth.type = 'FunctionalPseudo';
      nth.arguments = args;
    }
  }
};
