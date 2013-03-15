/*global define */
define(['queue', 'splitiscope'], function (queue, split_vis) {
    'use strict';

    function errorMsg(msg) {
        console.error(msg);
    }

    var x_range = { min : 0, max : 8},
        y_range = { min :-4, max : 4},
        splits_range = { min : 20, max : 200},
        label_list = ['high', 'low'],
        test_data = {},
        num = 500;

    test_data.x = _.map(_.range(num),function(value) {
                return (Math.random()*(x_range.max - x_range.min) + x_range.min);
    });

    test_data.y = _.map(_.range(num),function(value) {
                return (Math.random()*(y_range.max - y_range.min) + y_range.min);
    });

   test_data.label = _.map(_.range(num),function(value) {
                return label_list[Math.round(Math.random() * (label_list.length-1))];
    });

   test_data.splits_on_x = _.map(_.range(num),function(value) {
                return Math.round(Math.random()*(splits_range.max - splits_range.min) + splits_range.min);
    });

   test_data.id = _.map(_.range(num),function(value) {
                return String.fromCharCode.apply(this, _.map(_.range(5),function()  { return Math.random()*26 + 65;}));
    });

    var test_split_x = {

                bins: _.map(_.range(1,9), function(value) {
                   return Math.pow(value+1,-1*Math.abs((value-5)/10))* num;
                }),
                low: x_range.min + 1,
                binsize: ((x_range.max -1) - (x_range.min +1)) / 10
    };

    var test_split_y = {

                bins: _.map(_.range(1,9), function(value) {
                   return Math.pow(value+1,-1*Math.abs((value-5)/10))* num;
                }),
                low: y_range.min + 1,
                binsize: ((y_range.max -1) - (y_range.min +1)) / 10
    };

    var Application = {
        initialize: function(){
            // queue()
            //     //.defer(d3.json, 'http://')
            //     .defer(function() { return true;})
            //     .await(function(error, data1){
            //         if (error) { errorMsg(error);}
                    // var splitiscope = split_vis({
                    //     radius: 12,
                    //     margin : {
                    //                 top: 10, left: 10, bottom: 30, right: 30
                    //     }

                    // });
                    var plot = function(data) {
                            var splitiscope = split_vis({
                                radius: 12,
                                margin : {
                                            top: 10, left: 10, bottom: 30, right: 40
                                }
                            });
                            $('#plot').empty();
                            splitiscope('#plot')
                            .data(data)
                            .splits({x:test_split_x, y: test_split_y})
                            .on('partition',function(data) {
                                            plot(data);
                                })
                            .render();
                        };
                plot(test_data);
                // });
        }
    };
    return Application;
});