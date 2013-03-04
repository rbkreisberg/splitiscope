require.config({
    "paths": {
        "jQuery": "../components/jquery/jquery",
        "bootstrap": "vendor/bootstrap/bootstrap",
        "backbone": "../components/backbone/backbone",
        "d3": "../components/d3/d3",
        "modernizr": "../components/modernizr",
        "queue": "../components/queue-async/queue",
        "sass-bootstrap": "../components/sass-bootstrap/lib/bootstrap.scss",
        "underscore": "../components/underscore/underscore",
        "splitiscope": "vis/splitiscope"
    },
    "shim": {
        "backbone": {
            "deps": [
                "underscore",
                "jQuery"
            ],
            "exports": "Backbone"
        },
        "jQuery" : {
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
        }
    }
});

require(['app', 'jQuery', 'backbone'], function (app, $, Backbone) {
    'use strict';
    app.initialize();
    // console.log(app);
    // console.log('Running jQuery %s', $().jquery);
});