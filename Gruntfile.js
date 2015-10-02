var _ = require('lodash');
var request = require('sync-request');
var qs = require('qs');

module.exports = function(grunt) {
  var _cmp = function(v1, v2, store) {
    for(k in v1) {
      switch(typeof(v1[k])) {
        case 'object':
          if ( v1[k] instanceof Array ) {
            if (!v2[k]) { return false; }
            if (v1[k][0] == '...' && !v2[k].length) {
              return false;
            } else {
              var vs = v1[k][0].split(',')
                , c = 0;

              for(var i=0; i < vs.length; i++) {
                if (vs[i] == '...') {
                  c = v2[k].length - (vs.length-1) - i;
                } else {
                  store[ vs[i] ] = v2[k][c++];
                }
              }
            }
          } else {
            if (!_cmp(v1[k], v2[k])) { return false; }
          }
          break;

        case 'string':
          if ( v1[k].search(/^\$\w*$/) != -1 ) {
            if (!v2[k]) { return false; }
            store[ v1[k] ] = v2[k];
          }
          break;

        default:
          throw 'wrong';
      }
    }

    return true;
  }

  var HOST = '';
  var AUTH = '';
  var PATHS = ''; // app/controllers/**/*_controller.rb

  if(!HOST)   { throw 'provide host'; }
  if(!PATHS)  { throw 'provide paths'; }

  grunt.initConfig({
    watch: {
      files: PATHS,
      tasks: ['optimus']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-watch');

  var log    = grunt.log.writeln
    , logok  = grunt.log.ok
    , logerr = grunt.log.error
    , cursor;


  var searchSpecScope = function(src) {
    var methodInd = _.findIndex(src, function(line) {
      return line.search(/^\s*def \w*\s*$/) != -1;
    });
    var isImportant;

    if (methodInd != -1) {
      cursor = methodInd + 1;
    } else {
      cursor = -1;
      return null;
    }

    var method = src[methodInd].match(/^\s*def (\w*)\s*$/)[1];

    var specs, httpPath, httpMethod;

    for(var i = methodInd-1; i > 0; i--) {
      if (src[i].search(/^\s*#/) == -1) { break; }

      if (src[i].search(/#\s*== Specs/) != -1) {
        if (src[i].search(/Specs!/) != -1) { isImportant = true; }
        specs = src.slice(i+1, methodInd-1);
      }

      var matched = src[i].match(/#\s*(POST|GET|DELETE)\s*([^\s]*)/);
      if (matched) {
        httpMethod  = matched[1];
        httpPath    = matched[2];
      }
    }

    if(specs) {
      specs = _.map(specs, function(line) {
          return line.replace(/\s*#/, '');
        })
        .join('').replace(/\s/g, '')
        .replace(/#=>/g, " #=> ").split(";");
      specs = _.reject(specs, function(line) { return !line; });

      return({
        name: method,
        httpMethod: httpMethod,
        httpPath: httpPath,
        specs: specs,
        isImportant: isImportant
      });
    } else {
      return null;
    }
  };

  var _s = function (n) { return Array(n).join(" "); };

  var doSpecScope = function(specScope) {
    log("");
    logok("Testing method \"" + specScope.name + "\"");
    log(_s(4) + specScope.httpMethod + " " + specScope.httpPath);

    var store = {};

    // parsing path
    _.each(specScope.specs, function(spec) {
      log(_s(2) + spec);
      var url
        , datas = spec.split(" #=> ")
        , params
        , expectedResponse;
      eval("var params; with(store) { params = " + datas[0] + '}');
      eval("var expectedResponse = " + datas[1]);

      url = (HOST + specScope.httpPath);
      _.each(specScope.httpPath.match(/:\w*/) || [], function(dynamic) {
        var key = dynamic.substr(1, dynamic.length - 1);
        url = url.replace(dynamic, params[key]);
        delete params[key];
      });

      var urlParams = '?'
      if (params) { urlParams = '?' + qs.stringify(params) + '&'; }

      var req = request(specScope.httpMethod, url + urlParams + AUTH);
      var r = JSON.parse(req.getBody());

      if (_cmp(expectedResponse, r, store)) {
        logok('ok');
      } else {
        logerr('not ok');
        throw 'failed test';
      }
    });

    log("");
    return;
  };


  var doSpecs = function(filepath) {
    if (!filepath) { throw 'no filepath'; }
    var src = grunt.file.read(filepath).split("\n");
    cursor = 0;

    var specScopes = [];

    do {
      src = src.slice(cursor, src.length - 1)
      specScope = searchSpecScope(src);
      if(specScope) { specScopes.push(specScope); }
    } while(cursor != -1);

    importants = _.filter(specScopes, function(s){ return s.isImportant; });
    _.each(importants.length > 0 ? importants : specScopes, doSpecScope);

    return;
  };

  grunt.event.on('watch', function(a, filepath, target) {
    grunt.log.writeln(filepath + ' has ' + a);
    doSpecs(filepath);
  });

  grunt.registerTask('optimus', doSpecs);

};