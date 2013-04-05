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
    Handlebars.registerHelper("each_with_key", function(obj, options) {
        var context,
            buffer = "",
            key,
            keyName = options.hash.key;
         
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                context = obj[key];
                
                if (keyName) {
                    context[keyName] = key;
                }
                buffer += options.fn(context);
            }
        }
     
        return buffer;
    });
});
