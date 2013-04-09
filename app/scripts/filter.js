//filter.js
define([ 
    'crossfilter' 
    ], 
    function(crossfilter) {
        'use strict';

        var cf_obj,
               all,
             filter = {},
             group = {};

        var Filter = function(data) {
             cf_obj = crossfilter(data);
                all = cf_obj.groupAll();
                return Filter;
            };

            Filter.currentSize = function() {
                return cf_obj.size();
            };

            Filter.totalSize = function() {
                return all.value();
            }

            Filter.columns = function() {
                return Object.keys(filter);
            };

            Filter.has = function(label) {
                if ( filter[ label ] === undefined ) return false;
                return true;
            };

            Filter.addColumn = function( label , property ) { //property is optional
                if  ( arguments.length < 2 ) property = label;
                if (Filter.has(label)) return Filter;
                filter[label] = cf_obj.dimension(function(d) { return d[property]; });
                return Filter;
            };

            Filter.addGroup = function( label , property ) { //property is optional
                if  ( arguments.length < 2 ) property = label;
                if ( !Filter.has( label ) ) Filter.addColumn(label, property);
                if ( group[label] !== undefined ) return Filter;
                group[label] = filter[label].group().reduceCount();
                return Filter;
            };

            Filter.filterColumn = function( label , range ) {
                if ( !Filter.has(label) ) Filter.addColumn( label );
                if ( range.length != 2 || !(_.all(range,_.isNumber))  ) { 
                    // a set of categorical values
                    filter[label].filterFunction(function(val) { return _.contains(range, val ); } );
                } else { 
                    // a low, high pair
                     filter[label].filterRange( _.map([range[0], range[1]], parseFloat) );
                }
                return Filter;
            };

            Filter.resetFilter = function ( label ) {
                filter[label].filter(null);
                return Filter;
            };

             Filter.getGroupEntries = function( label, sorted) {
                if ( group[label] === undefined ) return [];
                sorted = ( sorted === undefined ) ? true : sorted;
                if ( sorted ) return _.sortBy(group[label].top( Infinity ), 'key' );
                return _.sortBy( group[label].top( Infinity ), 'key' );
            };

            Filter.getGroupLabels = function( label, sorted) {
                if ( group[label] === undefined ) return [];
                sorted = ( sorted === undefined ) ? true : sorted;
                if ( sorted ) return _.pluck( group[label].top( Infinity ), 'key' ).sort();
                return _.pluck( group[label].top( Infinity ), 'key' );
            };

            Filter.getRows = function( label, num ) {
                if (arguments.length < 2) num = Infinity;
                if (arguments.length < 1) label = Object.keys(filter)[0];
                return filter[label].top(num);
            };

        return Filter;
});