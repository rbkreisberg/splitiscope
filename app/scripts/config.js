require.config({

  baseUrl: 'scripts',

  deps: [
    // 'hbs', /* need Handlebars loader */
    "main" /* main.js loads next */
  ],

  "paths": {
      "jQuery": "../components/jquery/jquery",
      "jQuery-ui": "../components/jquery-ui/ui/jquery-ui.custom",
      "bootstrap": "vendor/bootstrap",
      "backbone": "../components/backbone/backbone",
      "d3": "../components/d3/d3",
      "modernizr": "../components/modernizr",
      "queue": "../components/queue-async/queue",
      "underscore": "../components/underscore/underscore",
      "splitiscope": "vis/splitiscope",
      'hbs' : '../components/require-handlebars-plugin/hbs',
      'handlebars' : '../components/require-handlebars-plugin/Handlebars',
      'json2' : '../components/require-handlebars-plugin/hbs/json2',
      'i18nprecompile' : '../components/require-handlebars-plugin/hbs/i18nprecompile',
      'store' : '../components/store/store', //localStorage and sessionStorage
      'crossfilter' : 'vendor/crossfilter' //need the newer crossfilter and can't use bower yet
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
      "crossfilter": {
        "exports" : "crossfilter"
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