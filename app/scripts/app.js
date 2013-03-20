/*global define */
define([
    'queue', 
    'splitiscope',
    'crossfilter',
    'data',
    'hbs!templates/splititem',
    'hbs!templates/totals',
    'hbs!templates/classList',
], function (queue, split_vis, crossfilter, warehouse, splitItemTemplate, totalsItemTemplate, classListTemplate) {
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
                //return ['A','B','C','D'][Math.round(Math.random()*3)];
    });

    test_data.y = _.map(_.range(num),function(value) {
             //   return (Math.random()*(y_range.max - y_range.min) + y_range.min);
                return ['A','B','C','D'][Math.round(Math.random()*3)];
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

   var keys = _.keys(test_data);

   var data = _.map(test_data.x, function(value,index) {
                        return _.object(keys, _.map(keys,function(k) {return test_data[k][index];}));
   });

   var data_filter = crossfilter(data),
        all = data_filter.groupAll();

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
            
            var filter = {
                        x: data_filter.dimension(function(d) { return d.x;}),
                        y: data_filter.dimension(function(d) { return d.y;})
                    },
                classLabel = data_filter.dimension(function(d) { return d.label;}),
                classGroup = classLabel.group().reduceCount();

            function refilter() {
                filter.x.filter(null);
                filter.y.filter(null);
                var s =  _.reduce( $('li.split_item'), function ( memo, el, index) {
                    var split = (warehouse.get(el).split);
                    var keys = _.keys(split);
                            return _.extend( memo , _.object(keys, _.map(keys, function(axis){
                                return {
                                 low: Math.max( split[axis].low, memo[axis].low ),
                                 high: Math.min( split[axis].high, memo[axis].high )
                                };
                            })) );
                }, { x :{ low: -Infinity, high: Infinity }, 
                     y :{ low: -Infinity, high: Infinity } } 
                );
                filterData(s);
            }

            function filterData(split) {
                var keys = _.keys( split );
                _.each(keys, function(axis) {
                    filter[axis].filterRange(_.map([split[axis].low, split[axis].high], parseFloat));
                });
            }

            //spin up jquery hooks
             function jquery_hooks() {
                
                var $trash = $( '#trash, #trash i, #trash div') ;

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
                  tolerance : 'pointer',
                  activate : function( event, ui ) {
                    $(this).addClass('ui-state-highlight');
                  },
                  drop: function( event, ui ) {
                    console.log('drop');
                    ui.draggable.fadeOut(function() {
                        ui.draggable.remove();
                        refilter();
                        refreshDisplays();
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

    function updateSplitsTemplates() {

    }

    function updateTotalsTemplates() {
        $('#summary').html(totalsItemTemplate({
            filtered_total :  all.value(),
            total : data_filter.size()
        }));

        var color = splitiscope.categoryColor();

        var group = _.map( _.sortBy(classGroup.top(Infinity),'key'), function(group_obj) {
            group_obj.color = color(group_obj.key);
            return group_obj;
        });
        $('#classInfo').html(classListTemplate({
            classList: group
        }));
    }

    function updateSplitiscope() {
        splitiscope.data(filter.x.top(Infinity)).render();
    }

    function refreshDisplays() {
        updateSplitiscope();
        updateTotalsTemplates();
    }

    var splitiscope;
    var plot_container = '#plot';
    var format = d3.format('.3f');
                    var plot = function(data) {
                            splitiscope = split_vis({
                                radius: 12,
                                margin : {
                                            top: 10, left: 10, bottom: 30, right: 40
                                }
                            })(plot_container)
                            .on('partition',function(split_obj) {

                                var keys = _.keys(split_obj);
                            var splitItem = _.object(keys, _.map(keys, function(axis){
                                return {
                                            label: labels[axis],
                                            low: format(split_obj[axis].low),
                                            high: format(split_obj[axis].high)
                                };
                            }));
                                   filterData(split_obj);
                                   refreshDisplays();
                                     
                                    var new_el = $.parseHTML( splitItemTemplate({ "splitItem" : splitItem }) )[0];
                                    $( split_list ).prepend(new_el);
                                    
                                    warehouse.set(new_el, {split: split_obj});
                                });
                            refreshDisplays();
                        };
                plot(data);
        }
    };
    return Application;
});