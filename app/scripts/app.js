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

    var Application = {
        initialize: function(){
            var split_list = '#split_list',
                split_item_class = 'split_item',
                disable_class = '_disabled',
                split_item_class_disabled = split_item_class + disable_class,
                split_item = 'li.' + split_item_class,
                split_item_disabled = 'li.' + split_item_class_disabled;
           
           var data, data_indices;

            var keys, data, data_filter, all, classLabel, classGroup,
                filter = { },
                labels = {x : "", y : ""},
                group = {};

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
                   
                data_filter =  data_filter ? data_filter : crossfilter(data);
                all = all ? all : data_filter.groupAll();
                filter[labels.x] = filter[labels.x] ? filter[labels.x] : data_filter.dimension(function(d) { return d[labels.x];});
                filter[labels.y] = filter[labels.y] ? filter[labels.y] : data_filter.dimension(function(d) { return d[labels.y];});

                if ( _.isString(labels.class) && !_.isUndefined(data[0][labels.class]) ) {
                    classLabel = filter[labels.class] ? filter[labels.class] : data_filter.dimension(function(d) { return d[labels.class];});
                    classGroup = group[labels.class] ? group[labels.class] : classLabel.group().reduceCount();
                }
            }    

            function refilter() {
                var initial = {};
                _.each(_.keys(filter), function(f) { 
                    filter[f].filter(null);
                    initial[f]  = { 
                        "low" : -Infinity, 
                        "high" : Infinity, 
                        "values" : [] 
                        }; 
                    });
                
                var s =  _.reduce( $('li.split_item'), function ( memo, el, index) {
                    var split = warehouse.get(el).split;
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
                }, initial );
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

                $( split_list ).on('click', split_item, function(e,ui) {
                    $(this).removeClass(split_item_class).addClass(split_item_class_disabled);
                    refilter();
                    refreshDisplays();
                });

                $( split_list ).on('click', split_item_disabled, function(e,ui) {
                    $(this).removeClass(split_item_class_disabled).addClass(split_item_class);
                    refilter();
                    refreshDisplays();
                });

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
                  accept: split_item + ', ' + split_item_disabled,
                  hoverClass: "ui-state-highlight",
                  activeClass: "ui-state-highlight",
                  tolerance : 'pointer',
                  activate : function( event, ui ) {
                    $(this).addClass('ui-state-highlight');
                  },
                  drop: function( event, ui ) {
                    ui.draggable.fadeOut(function() {
                        ui.draggable.remove();
                        refilter();
                        refreshDisplays();
                    });
                  }
                }).disableSelection();

                queue()
                .defer(d3.json, '/query/dataset/features')
                .defer(d3.json, '/query/dataset/cases')
                .await( function(error, f, c) {
                    var features = _.pluck(f,"fName");
                    $(".fetch_cases").autocomplete({
                            source: features,
                            minLength: 2,
                            delay: 200
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
        if (!_.isUndefined(classGroup) ) {
            var group = _.map( _.sortBy( classGroup.top(Infinity),'key'), function(group_obj) {
                group_obj.color = color(group_obj.key);
                return group_obj;
            });
            $('#classInfo').html(classListTemplate({
                classLabel: labels.class,
                classList: group
            }));
        };
    }

    function updateSplitiscope() {
        splitiscope
        .axes({
            "attr" : labels,
            "labels" : labels 
        })
        .class({
            label : labels.class ? labels.class : '',
            list: classGroup ? _.pluck(classGroup.top(Infinity),'key') : []
        })
        .data(filter[labels.x].top(Infinity))
        .render();
    }

    function newSplitiscope() {
        splitiscope
        .clear(true)
        .class({
            label : labels.class ? labels.class : '',
            list : classGroup ? _.pluck(classGroup.top(Infinity),'key') : []
        })
        .axes({
            "attr" : labels,
            "labels" : labels 
        })
        .data(filter[labels.x].top(Infinity))
        .render();
    }

    function newDataDisplay() {
        if (!( data.length && data[0][labels.x] && data[0][labels.y])) return;

        if( _.isUndefined(splitiscope)) {
            plot();
            return;
        }
        newSplitiscope();
        updateTotalsTemplates();
    }

    function refreshDisplays() {
        if (!( data.length && data[0][labels.x] && data[0][labels.y])) return;
        updateSplitiscope();
        updateTotalsTemplates();
    }

    function selectElementHooks() {

        $('#y_axis_autocomplete').on('autocompleteselect', function(e, ui){
           queue()
            .defer(d3.json,'/query/dataset/mValues?feature='+ui.item.value)
            .await(function(error,f){
                modify_data( ui.item.value, f['caseValues'] );
                newDataDisplay();
            });
            labels.y = ui.item.value;
        });

       $('#x_axis_autocomplete').on('autocompleteselect', function(e, ui){
           queue()
            .defer(d3.json,'/query/dataset/mValues?feature='+ui.item.value)
            .await(function(error,f){
                modify_data( ui.item.value, f['caseValues'] );
                newDataDisplay();
            });
            labels.x = ui.item.value;
        });
       $('#color_by_autocomplete').on('autocompleteselect', function(e, ui){
           queue()
            .defer(d3.json,'/query/dataset/mValues?feature='+ui.item.value)
            .await(function(error,f){
                modify_data( ui.item.value, f['caseValues'] );
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
                                radius: 8,
                                margin : {
                                            top: 10, left: 10, bottom: 30, right: 40
                                }
                            })(plot_container)
                            .on('partition',function(split_obj) {

                                var keys = _.keys(split_obj);
                                var splitItem = _.object(keys, _.map(keys, function( feature ){
                                    if ( _.isFinite(split_obj[feature].low) ) {
                                        return {
                                                    label: feature,
                                                    low: format(split_obj[feature].low),
                                                    high: format(split_obj[feature].high)
                                        };
                                    } else {
                                        return {
                                            label: feature,
                                            values: split_obj[feature].values
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