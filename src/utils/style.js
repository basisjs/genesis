var parse = require('csso:parser/index');
var walk = require('utils.walker').all;
var translate = require('csso:utils/translate.js');

function sourceMap(sourceAst, processedAST) {
  var sourceTokens = [];
  var processedTokens = [];
  var sourceMap = new WeakMap();

  // todo возможно есть более простой способ сфлэтить все селекторы из ast
  walk(sourceAst, {
    SimpleSelector: function(token) {
      token.sequence.each(function(part) {
        sourceTokens.push(part)
      });
    }
  });

  walk(processedAST, {
    SimpleSelector: function(token) {
      token.sequence.each(function(part) {
        processedTokens.push(part)
      });
    }
  });

  processedTokens.forEach(function(pToken, key) {
    sourceMap.set(pToken, sourceTokens[key]);
  });

  return sourceMap;
}

function clone(sourceAST) {
  return parse(translate(sourceAST));
}

module.exports = {
  sourceMap: sourceMap,
  clone: clone
};
