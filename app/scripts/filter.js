//filter.js
define([ 
    'crossfilter' 
    ], 
    function(crossfilter) {
        'use strict';

        var cf_obj,
               all,
             filter = {};
             group = {};

        var Filter = {

            initialize : function(data) {
                cf_obj = crossfilter(data);
                all = cf_obj.groupAll();
            },

            column : function(label) {
                if arguments.length < 1 return Object.keys(filter);
                if ( filter[ label ] === undefined ) return false;
                return true;
            },

            filterColumn : function( label , property ) { //property is optional
                if  ( arguments.length < 2 ) property = label;
                filter[label] = cf_obj.dimension(function(d) { return d[property]; });
            },

            groupColumn : function( label , property ) { //property is optional
                if  ( arguments.length < 2 ) property = label;
                if ( !column( label ) ) Filter.filterColumn(label, property);
                group[label] = filter[label].group().reduceCount();
            },

            filterValues : function( label , range ) {
                if ( !Filter.column(label) ) Filter.filterColumn( label );
                if ( range.length != 2 || !(_.all(range,_.isNumber))  ) { 
                    // a set of categorical values
                    filter[label].filterFunction(function(val) { return _.contains(range, val ); } );
                } else { 
                    // a low, high pair
                     filter[label].filterRange( _.map([range[0], range[1]], parseFloat) );
                }
            },

            resetFilter : function ( label ) {
                filter[label].filter(null);
            },

            getGroups : function( label ) {
                if ( group[label] === undefined ) return [];
                return _.pluck( group[label].top(Infinity),'key').sort();
            },

            getRows : function( label, num ) {
                if (arguments.length < 2) num = Infinity;
                if (arguments.length < 1) label = Object.keys(filter)[0];
                return filter[label].top(num);
            }

        };

        return Filter;
});