/*global define */
define([
    'queue', 
    'carve',
    'data',
    'filter',
    'hbs!templates/splititem',
    'hbs!templates/totals',
    'hbs!templates/classList',
], function (queue, carveVis, warehouse, filter, splitItemTemplate, totalsItemTemplate, classListTemplate) {
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

            var keys, data, data_filter,
                labels = {"x" : "", "y" : "", list : []},
                insistCategoricalValues = { "x":  [], "y" : [] },
                group = {},
                highlight_label = null;

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
                if (!( data.length && data[0][labels.x] && data[0][labels.y])) return;   
                data_filter =  data_filter ? data_filter : filter(data);
                data_filter.addColumn(labels.x).addColumn(labels.y);
                if ( _.isString(labels.class) && !_.isUndefined(data[0][labels.class]) ) {
                   data_filter.addGroup( labels.class );
                }
            }    

            function refilter() {
                var initial = {};
                _.each( data_filter.columns(), function(f) { 
                    data_filter.resetFilter(f);
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
                    data_filter.filterColumn(axis, _.map([split[axis].low, split[axis].high], parseFloat));
                } else if ( split[axis].values.length > 0) {
                    data_filter.filterColumn(axis, split[axis].values );
                }
                });
            }

            //spin up jquery hooks
             function jquery_hooks() {
                
                var $trash = $( '#trash, #trash i, #trash div') ;

                $('#classInfo').on('mouseover', '.classItem', function () {
                    var classLabel = $(this).attr('data-class-label');
                    $('.classItem:not([data-class-label=\"' + classLabel+'\"])').css('opacity',0.3);
                    highlight_label = classLabel;
                    carve
                        .highlight( highlight_label )
                        .render();
                });

                $('#classInfo').on('mouseout', '.classItem', function () {
                    $('.classItem').css('opacity', '');
                    highlight_label = null;
                    carve
                        .highlight('')
                        .render();
                });

                $('#switch_axes').on('click', function (e,ui) {
                    var x = $('#x_autocomplete').val();
                    $('#x_autocomplete').val( $('#y_autocomplete').val() );
                    $('#y_autocomplete').val( x );
                    labels['y'] = x;
                    labels['x'] = $('#x_autocomplete').val();
                    updateCarve();
                });

                $( split_list ).on('click', split_item, function (e,ui) {
                    $(this).removeClass(split_item_class).addClass(split_item_class_disabled);
                    refilter();
                    refreshDisplays();
                });

                $( split_list ).on('click', split_item_disabled, function (e,ui) {
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
                    if (error) errorMsg(error);
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
            filtered_total :  data_filter.totalSize(),
            total : data_filter.currentSize()
        }));

        var color = carve.colorFn();

        if ( data_filter.has(labels.class) ) {
            var group = _.map( data_filter.getGroupEntries( labels.class ), function(group_obj) {
                group_obj.color = color(group_obj.key);
                return group_obj;
            });

            $('#classInfo').html(classListTemplate({
                classLabel: labels.class,
                classList: group
            }));

            $('#classList').sortable({
                    placeholder: 'classItem_placeholder',
                    forcePlaceholderSize: true,
                    containment:'document',
                    cursor: 'move',
                    axis: 'y',
                    opacity: 0.7,
                    scroll: true,
                    scrollSensitivity: 2,
                    scrollSpeed: 20,
                    stop : function() {
                        labels.list = $('li.classItem').map( function (el) { return $(this).attr('data-class-label');}).get();
                        updateCarve();
                    }
                }).disableSelection();

            labels.list = $('li.classItem').map( function (el) { return $(this).attr('data-class-label');}).get();
        } else { $('#classInfo').html(""); labels.list = []; }

    }

    function setInsistCategoricalValues() {
    insistCategoricalValues = {"x" : [], "y" : []};
    if (_.intersection(data_filter.getGroupLabels(labels.x, false), ["false","true"]).length) insistCategoricalValues.x = ["false","true"];
    if (_.intersection(data_filter.getGroupLabels(labels.y, false), ["false","true"]).length) insistCategoricalValues.y = ["false","true"];
    }

    function updateCarve() {
        if (labels.class) {
            labels.list = labels.list.length ? labels.list : data_filter.has(labels.class) ? data_filter.getGroupLabels(labels.class) : [];
        }
        else {
            labels.class = '';
            labels.list = [];
        }
        carve
        .axisLabel(labels)
        .axisKey(labels)
        .colorBy({
            label : labels.class,
            list: labels.list,
            highlight : highlight_label
        })
        .data(data_filter.getRows())
        .render();
    }

    function newCarve() {
        setInsistCategoricalValues();

        carve
        .clear(true)
        .colorBy({
            label : labels.class ? labels.class : '',
            list : data_filter.has( labels.class ) ? data_filter.getGroupLabels( labels.class ) : []
        })
        .axisLabel(labels)
        .axisKey(labels)
        .axisInsistCategoricalValues(insistCategoricalValues)
        .axisValueDictionary( { "x" : { "true" : "true"}})
        .data(data_filter.getRows())
        .render();
    }

    function newDataDisplay() {
        if (!( data.length && data[0][labels.x] && data[0][labels.y])) return;

        if( _.isUndefined(carve)) {
            plotCarve();
            return;
        }
        newCarve();
        updateTotalsTemplates();
    }

    function refreshDisplays() {
        if (!( data.length && data[0][labels.x] && data[0][labels.y])) return;
        updateCarve();
        updateTotalsTemplates();
    }

    function selectElementHooks() {
        _.each(['x','y','class'], function(attr) {
           $('#' + attr + '_autocomplete').on('autocompleteselect', function(e, ui){
           queue()
            .defer(d3.json,'/query/dataset/mValues?feature='+ui.item.value)
            .await(function(error,f){
                modify_data( ui.item.value, f['caseValues'] );
                newDataDisplay();
            });
            labels[attr] = ui.item.value;
          });
        });

       $('#class_autocomplete_cancel').on('click', function (e, ui) {
            labels['class'] = null;
            labels['list'] = [];
            $('#class_autocomplete').val("");
            refreshDisplays();       
      });
    }

    selectElementHooks();

    var carve;
    var plot_container = '#plot';
    var format = d3.format('.3f');
   function plotCarve() {
            carve = carveVis({
                radius: 8,
                margin : {
                            top: 10, left: 10, bottom: 30, right: 40
                }
            })(plot_container)
            .on('partitioncomplete',function(split_obj) {

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