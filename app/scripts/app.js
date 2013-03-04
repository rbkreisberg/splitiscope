/*global define */
define(['queue', 'splitiscope'], function (queue, splitiscope) {
    'use strict';

    function errorMsg(msg) {
        console.error(msg);
    }

    var Application = {
        initialize: function(){
            queue()
                .defer(d3.csv,'/test')
                .defer(d3.csv,'/test1')
                .await(function(error, data1, data2){
                    if (error) { errorMsg(error);}
                    console.log(data1);
                    console.log(data2);

                });
        }
    };
    return Application;
});