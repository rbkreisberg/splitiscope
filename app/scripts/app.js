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

    var range = { 
                x : {
                    min : 0, 
                    max : 8
                },
                y : { 
                    min :-4, 
                    max : 4
                }
            },
        splits_range = { min : 20, max : 200},
        label_list = ['high', 'low'],
        test_data = {},
        num = 500,
        labels = {
                    x : 'Feature X',
                    y : 'Feature Y'
                };

    function numerical_data(axis) {
           return  _.map(_.range(num),function(value) {
               return (Math.random()*(range[axis].max - range[axis].min) + range[axis].min);
           });
    }

    function categorical_data(axis) {
           return _.map(_.range(num),function(value) {
                return ['A','B','C','D'][Math.round(Math.random()*3)];
            });
    }

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
                low: range.x.min + 1,
                binsize: ((range.x.max -1) - (range.x.min +1)) / 10
    };

    var test_split_y = {

                bins: _.map(_.range(1,9), function(value) {
                   return Math.pow(value+1,-1*Math.abs((value-5)/10))* num;
                }),
                low: range.y.min + 1,
                binsize: ((range.y.max -1) - (range.y.min +1)) / 10
    };

    var Application = {
        initialize: function(){
            var split_list = '#split_list',
                split_item = 'li.split_item';
           
           var data, data_indices;

            var keys, data, data_filter, all, classLabel, classGroup,
                filter = {  x: null, y: null },
                labels = {x : "", y : ""};

            function modify_data(property, arr) {
                _.each(arr, function(element) {
                    data[data_indices[element.cName]][property] = element.fValue;
                });
                set_data();
            }

            function set_cases(c_arr) {
                data_indices = {};
                data = new Array(c_arr.length);
                _.each(c_arr, function(c, index) { 
                    data_indices[c.cName] = index; 
                    data[index] = {id: c.cName};
                });
            } 

            function set_data() {
                   
                    data_filter = crossfilter(data);
                    all = data_filter.groupAll();
                    filter = {
                        x: data_filter.dimension(function(d) { return d.x;}),
                        y: data_filter.dimension(function(d) { return d.y;})
                        };
                    
                    classLabel = data_filter.dimension(function(d) { return d.class;});
                    classGroup = classLabel.group().reduceCount();
            }    

            function refilter() {
                filter.x.filter(null);
                filter.y.filter(null);
                var s =  _.reduce( $('li.split_item'), function ( memo, el, index) {
                    var split = (warehouse.get(el).split);
                    var keys = _.keys(split);
                            return _.extend( memo , _.object(keys, _.map(keys, function(axis) {
                                if (_.isFinite(split[axis].low) ) {
                                return {
                                 low: Math.max( split[axis].low, memo[axis].low ),
                                 high: Math.min( split[axis].high, memo[axis].high )
                                };
                            } else if (_.isArray(split[axis].values)) { 
                                 return {
                                 values: _.union( split[axis].values, memo[axis].values )
                                };
                            }
                            })) );
                }, { x :{ low: -Infinity, high: Infinity, values : [] }, 
                     y :{ low: -Infinity, high: Infinity, values : [] } } 
                );
                filterData(s);
            }

            function filterData(split) {
                var keys = _.keys( split );
                _.each(keys, function(axis) {
                    if (_.isFinite(split[axis].low)) {
                    filter[axis].filterRange(_.map([split[axis].low, split[axis].high], parseFloat));
                } else if ( split[axis].values.length > 0) {
                    filter[axis].filterFunction(function(val) { return _.contains(split[axis].values, val ); } );
                }
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
                        refreshDisplays(false);
                    });
                  }
                }).disableSelection();

                queue()
                .defer(d3.json, '/query/dataset/features')
                .defer(d3.json, '/query/dataset/cases')
                .await( function(error, f, c) {
                    var features = _.pluck(f,"fName");
                    $(".fetch_cases").autocomplete({
                            source: features
                            });
                    set_cases(c);
                });
            }
            jquery_hooks();

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
            classLabel: labels.class,
            classList: group
        }));
    }

    function updateSplitiscope(old_data) {
        splitiscope
        .update(old_data)
        .labels(labels)
        .data(filter.x.top(Infinity))
        .render();
    }

    function newDataDisplay() {
        if (!( data.length && data[0].x && data[0].y)) return;

        if( _.isUndefined(splitiscope)) {
            plot();
            return;
        }
        updateSplitiscope(false);
        updateTotalsTemplates();
    }

    function refreshDisplays() {
        if (!( data.length && data[0].x && data[0].y)) return;

        if( _.isUndefined(splitiscope)) {
            plot();
            return;
        }
        updateSplitiscope(true);
        updateTotalsTemplates();
    }

    function selectElementHooks() {

            $('#y_axis_autocomplete').on('autocompleteselect', function(e, ui){
               queue()
                .defer(d3.json,'/query/dataset/mValues?feature='+ui.item.value)
                .await(function(error,f){
                    modify_data('y',f['caseValues']);
                    newDataDisplay();
                });
                labels.y = ui.item.value;
            });

           $('#x_axis_autocomplete').on('autocompleteselect', function(e, ui){
               queue()
                .defer(d3.json,'/query/dataset/mValues?feature='+ui.item.value)
                .await(function(error,f){
                    modify_data('x',f['caseValues']);
                    newDataDisplay();
                });
                labels.x = ui.item.value;
            });
           $('#color_by_autocomplete').on('autocompleteselect', function(e, ui){
               queue()
                .defer(d3.json,'/query/dataset/mValues?feature='+ui.item.value)
                .await(function(error,f){
                    modify_data('class',f['caseValues']);
                    newDataDisplay();
                });
                labels.class = ui.item.value;
            });
    }

    selectElementHooks();

    var splitiscope;
    var plot_container = '#plot';
    var format = d3.format('.3f');
                    var plot = function() {
                            splitiscope = split_vis({
                                radius: 12,
                                margin : {
                                            top: 10, left: 10, bottom: 30, right: 40
                                }
                            })(plot_container)
                            .on('partition',function(split_obj) {

                                var keys = _.keys(split_obj);
                                var splitItem = _.object(keys, _.map(keys, function(axis){
                                    if ( _.isFinite(split_obj[axis].low) ) {
                                        return {
                                                    label: labels[axis],
                                                    low: format(split_obj[axis].low),
                                                    high: format(split_obj[axis].high)
                                        };
                                    } else {
                                        return {
                                            label: labels[axis],
                                            values: split_obj[axis].values
                                        };
                                    }
                                }));
                                   filterData(split_obj);
                                   refreshDisplays();
                                     
                                    var new_el = $.parseHTML( splitItemTemplate({ "splitItem" : splitItem }) )[0];
                                    $( split_list ).prepend(new_el);
                                    
                                    warehouse.set(new_el, {split: split_obj});
                                });
                            newDataDisplay();;
                        };
        }
    };
    return Application;
});