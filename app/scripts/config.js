require.config({

  baseUrl: 'scripts',

  deps: [
    // 'hbs', /* need Handlebars loader */
    "main" /* main.js loads next */
  ],

  "paths": {
      "jQuery": "../bower_components/jquery/jquery",
      "jQuery-ui": "../bower_components/jquery-ui/ui/jquery-ui",
      "bootstrap": "vendor/bootstrap",
      "carve": "../bower_components/carve/carve",
      "d3": "../bower_components/d3/d3",
      "modernizr": "../bower_components/modernizr",
      "queue": "../bower_components/queue-async/queue",
      "underscore": "../bower_components/underscore/underscore",
      "science" : "../bower_components/science/science.v1",
      'hbs' : '../bower_components/require-handlebars-plugin/hbs',
      'handlebars' : '../bower_components/require-handlebars-plugin/Handlebars',
      'json2' : '../bower_components/require-handlebars-plugin/hbs/json2',
      'i18nprecompile' : '../bower_components/require-handlebars-plugin/hbs/i18nprecompile',
      'store' : '../bower_components/store/store', //localStorage and sessionStorage
      'crossfilter' : '../bower_components/crossfilter/crossfilter' //need the newer crossfilter and can't use bower yet
  },
  "shim": {
      "backbone": {
          "deps": [
              "underscore",
              "jQuery"
          ],
          "exports": "Backbone"
      },
      "jQuery-ui" : {
          "deps": ["jQuery"],
          "exports" : "$"
      },
       "underscore" : {
          "exports" : "_"
      },
       "d3" : {
          "exports" : "d3"
      },
       "queue" : {
          "exports" : "queue"
      },
      "carve" : {
        "deps" : ["d3","underscore","science"],
        "exports" : "carve"
      },
      "crossfilter": {
        "exports" : "crossfilter"
      },
      "science" : {
        "exports" : "science"
      }
  },
  "hbs" : {
      "templateExtension" : 'hbs',
      "disableI18n" : true,
      "helperPathCallback" :       // Callback to determine the path to look for helpers
      function (name) {       // ('/template/helpers/'+name by default)
        return 'templates/helpers/' + name;
      }
  },

  callback: function(o) {
    try {
      console.log('1');
    } catch(e) {
      /* No console */
    }
  }

});
