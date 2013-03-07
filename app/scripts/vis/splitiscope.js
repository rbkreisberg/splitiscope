/*
Splitiscope
Dick Kreisberg 
March 2013
MIT License
*/
define(['jquery', 'd3', 'underscore' ], function (jQuery, d3, _) {

(function( $ ) {

  $.fn.splitiscope = function( method ) {
    
    if ( methods[method] ) {
      return methods[method].apply( this, Array.prototype.slice.call( arguments, 1 ));
    // } else if ( typeof method === 'object' || ! method ) {
    //   return methods.init.apply( this, arguments );
    } else {
      $.error( 'Method ' +  method + ' does not exist on jQuery.splitiscope' );
    }    
  
  };

var d3 = window.d3;

if (!d3 && (typeof require !== 'undefined')) d3 = require('d3');

//defaults

var width = 500,
    height = 400,
    pointColors = [
                    "#71C560",
                    "#9768C4",
                    "#98B8B8",
                    "#4F473D",
                    "#C1B14C",
                    "#B55381"
            ],
    splitColor = "#C1573B";
    
    data_array = [],
    data ={ },
    radius = 4,
    colorLabel ='target';

var methods = {

  draw: function(options) {
    var $this = $(this);
          // if (selection.nodeType === undefined) { selection = window.document.body; } //check if we're on a node.  
    var plotWidth = width - 40;
    var plotHeight = height - 30;     
    offset = {top:15, bottom: 15, left:30, right: 10};

          //draw chart
    var svg = d3.svg.select($this.el)
                    .append('svg')
                    .class('splitiscope')
                    .attr('height',height)
                    .attr('width',width);

    var bottom_surface = svg.append('g');

    var split_surface = svg.append('g');

    var data_surface = svg.append('g')
                        .attr('transform','translate('+offset.left+','+offset.top+')');

    var data_points = data_surface
                        .selectAll('.data_point')
                        .data(data_array)
                      .enter()
                      .append('circle')
                        .class('data_point')
                        .attr('cx', 'x')
                        .attr('cy', 'y')
                        .attr('r',radius)
                        .style('fill-color',function(point) {
                                                return categoryLabelScale(point[colorLabel]);
                        });

    var splits = split_surface
                  .selectAll('.split')
                  .data(split_array)
                .enter()
                .append('rect')
                  .class('split')
                  .attr('width','')
                  .attr('height','')
                  .attr('x','')
                  .attr('y','')
                  .style('stroke','red')
                  .style('stroke-width',0.5)
                  .style('fill','none')
                  .style('stroke-opacity','density')
                  .on('mouseover',function(){
                    var rect = d3.select(this);
                    d3.select('.split').style('stroke-opacity',0);
                    rect.style('stroke-opacity',1.0);
                  })
                  .on('mouseout',function(){
                    var rect = d3.select(this);
                    d3.select('.split').style('stroke-opacity','density');
                  })


            return this;
  },      

  data : function(data_to_plot) {
        if (arguments.length < 1) return data_array;
        data_array = data_to_plot;
        return this;
  },

  width : function(width_to_set){
        if (arguments.length < 1) return width;
        width = width_to_set;
        return this;
},

  height : function(height_to_set){
        if (arguments.length < 1) return height;
        height = height_to_set;
        return this;
},

  radius : function(radius_to_set){
        if (arguments.length < 1) return radius;
        radius = radius_to_set;
        return this;
},

  splitColor : function(splitColor_to_set){
        if (arguments.length < 1) return splitColor;
        splitColor = splitColor_to_set;
        return this;
},

  colorLabel : function(colorLabel_to_set){
        if (arguments.length < 1) return colorLabel;
        colorLabel = colorLabel_to_set;
        return this;
}

};



function parseData() {
  if (data_array.length < 1) {
      console.log('Empty data array.  Nothing to plot.');
      return;
    }
  var element_properties = _.keys(data_array[0]);

  data = _.map(element_properties, function(property) {
    return _.pluck(data_array,property);
  });


}

function setScales() {
  xScale = xDataType === "ordinal" ?
                  d3.scale.ordinal().domain(data.x).rangeRoundBands([0,plotWidth],0) :
                  d3.scale.linear().domain(d3.extent(data.x)).range([0,plotWidth]);

  yScale = yDataType === "ordinal" ?
                  d3.scale.ordinal().domain(data.y).rangeRoundBands([plotHeight,0],0) :
                  d3.scale.linear().domain(d3.extent(data.y)).range([plotHeight,0]);

  var numberOfCategories = _.uniq(data[colorLabel]).length;
  var colorArray = pointColors.first(numberOfCategories);

  categoryLabelScale = d3.scale.ordinal().domain(data[colorLabel]).range(colorArray);

}


})( jQuery );

})