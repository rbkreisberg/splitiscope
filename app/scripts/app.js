/*global define */
define([
    'queue', 
    'splitiscope',
    'hbs!templates/splititem'
], function (queue, split_vis, splitItemTemplate) {
    'use strict';

    function errorMsg(msg) {
        console.error(msg);
    }

    var x_range = { min : 0, max : 8},
        y_range = { min :-4, max : 4},
        splits_range = { min : 20, max : 200},
        label_list = ['high', 'low'],
        test_data = {},
        num = 500,
        labels = {
                    x : 'Feature X',
                    y : 'Feature Y'
                };

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
            var split_list = '#split_list',
                split_item = 'li.split_item';

            //spin up jquery hooks
             function jquery_hooks() {
                
                var $trash = $( '#trash') ;

                $( split_list ).sortable({
                    placeholder: 'split_placeholder',
                    forcePlaceholderSize: true,
                    containment:'document',
                    cursor: 'move',
                    axis: 'y',
                    opacity: 0.7,
                    scroll: true,
                    scrollSensitivity: 2,
                    scrollSpeed: 20,
                    start: function(event, ui) {
                        $trash.addClass('ui-state-highlight');
                    }
                    }).disableSelection();

                // let the trash be droppable, accepting the split items
                $trash.droppable({
                  accept: split_item,
                  hoverClass: "ui-state-highlight",
                  activeClass: "ui-state-highlight",
                  activate : function( event, ui ) {
                    $(this).addClass('ui-state-highlight');
                  },
                  drop: function( event, ui ) {
                    console.log('drop');
                    ui.draggable.fadeOut(function() {
                        ui.draggable.remove();
                    });
                    }
                }).disableSelection();

              }
            jquery_hooks();

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
var format = d3.format('.3f');
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
                            .on('partition',function(data,split_obj) {
                                            plot(data);
                                            var x = {
                                                label: labels.x, 
                                                low: format(split_obj.x.low),
                                                high: format(split_obj.x.high)
                                            },
                                                y = {
                                                label: labels.y, 
                                                low: format(split_obj.y.low),
                                                high: format(split_obj.y.high)
                                            };
                                         
                                            $( split_list ).prepend(splitItemTemplate({splitItem:  {x: x, y:y}}));
                                })
                                .render();
                                $('#plot > text').disableSelection();
                        };
                plot(test_data);
        }
    };
    return Application;
});