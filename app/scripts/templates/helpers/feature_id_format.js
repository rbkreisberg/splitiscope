define([
    'handlebars'
], function (Handlebars) {
    'use strict';

    // HELPER: #each_with_key
    //
    // Usage: {{#each_with_key container key="myKey"}}...{{/each_with_key}}
    //
    // Iterate over an object containing other objects. Each
    // inner object will be used in turn, with an added key ("myKey")
    // set to the value of the inner object's key in the container.
    Handlebars.registerHelper("feature_id_format", function( feature_id, options ) {
        var context ,
            buffer = "" ,
            fields ,
            parseInt10 = function(val){ return parseInt(val,10);},
            cols = options.hash.cols.split(",").map(parseInt10) ,
            ncols = cols.length ,
            delim = options.hash.delimiter || ':' ;
         
        fields = feature_id.split(delim);
        
        var i = ncols;
        
        while (i--) {
            if (fields[cols[i]]) buffer = fields[cols[i]] + ' ' + buffer;
        }
     
        return buffer;
    });
});
