define([
    'handlebars'
], function (Handlebars) {
        'use strict';
    // HELPER: #key_value
    //
    // Usage: {{#key_value obj}} Key: {{key}} // Value: {{value}} {{/key_value}}
    //
    // Iterate over an object, setting 'key' and 'value' for each property in
    // the object.
    Handlebars.registerHelper("key_value", function(obj, options) {
        var buffer = "",
            key;
     
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                buffer += options.fn({key: key, value: obj[key]});
            }
        }
     
        return buffer;
    });
});