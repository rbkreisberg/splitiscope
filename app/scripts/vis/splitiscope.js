/*
Splitiscope
Dick Kreisberg 
March 2013
MIT License

some code taken from 
https://github.com/syntagmatic/parallel-coordinates
Copyright (c) 2012, Kai Chang
*/
define(['jQuery', 'd3', 'underscore' ], function (jQuery, d3, _) {

return function(config) {

var config = config || {};
//defaults
var __ = {
        width : 500,
    height : 400,
    pointColors : [
                    "#71C560",
                    "#9768C4",
                    "#98B8B8",
                    "#4F473D",
                    "#C1B14C",
                    "#B55381"
            ],
    partitionColors : [
                    "#98B8B8",  
                    "#4F473D",
                    "#C1B14C",
                    "#B55381"
                    ],
    splitColor : "#C1573B",
    margin : {
              "top" : 15, 
              "bottom" : 15, 
              "left" : 30,
              "right" : 10
            },
    radius : 4,
    dataType : { 
                 "x" : 'numerical',
                 "y" : 'numerical'
               },
    data : {x:[],y:[], class:[] },
    splits : {},
    id : 'id',
    axes : {
        labels : {
             "x" : "X Axis",
              "y" : "Y Axis"
        },
        attr : {
            "x" : "x",
            "y" : "y"
        }
    },
    categoryColor : function(d) { return __.pointColors[0] },
    class : {label:"", list:[]},
    clear : true,
 };

  _.extend(__, config);

  var events = d3.dispatch.apply(this,["render", "resize", "highlight", "brush", "partition"].concat(d3.keys(__))),
      outerWidth = function() { return __.width - __.margin.right - __.margin.left },
      outerHeight = function() { return __.height - __.margin.top - __.margin.bottom },
      plotWidth = function() { return outerWidth() - padding.right - padding.left},
      plotHeight = function() { return outerHeight() - padding.top - padding.bottom },
      displayWidth = function() { return plotWidth() - 20;},
      displayHeight = function() { return plotHeight() - 20;},
      flags = {
        brushable: false,
        reorderable: false,
        axes: false,
        interactive: false,
        shadows: false,
        debug: false
      },
      scales = { x: d3.scale.ordinal(),
                y : {}
              },
      caseSplitsOpacityscale,
      dragging = {},
      selected = {x: null, y: null},
      padding = { top: 24, bottom: 4, left: 30, right: 4 },
      split_data = {x: {}, y: {}},
      shapes = ['square','circle','cross','diamond','triangle-down','triangle-up'],
      symbolSize = Math.pow(__.radius,2),
      symbol = d3.svg.symbol().size(symbolSize).type(shapes[0]),
      symbolMap = d3.scale.ordinal().domain([0,5]).range(shapes),
      symbolFunction = _.compose(symbol.type, symbolMap),
      splitStrokeColors = ['red','green','black'],
      colorCategories = [],
      strokeFunction = function(index) { return splitStrokeColors[index];},
      data_array = [],
      yaxis = d3.svg.axis().orient("right"),
      xaxis = d3.svg.axis().orient("bottom"),
      update_duration = 300,
      bottom_surface, split_surface, data_surface, partition_surface; // groups for axes, brushes

  // side effects for setters
  var side_effects = d3.dispatch.apply(this,d3.keys(__))
    .on("radius", function(d) { symbolSize = Math.pow(__.radius,2);})
    .on("data", function(d) { clearAllSplitSelections(); clearAllSplitPointers(); parseData(); console.log('splitscope: data loaded');})
    .on("class", setClassScales )
    .on("splits", parseSplits )
    .on("axes", updateAxisLabels );
   
  var splitiscope = function(selection) {
    selection = splitiscope.selection = d3.select(selection);

    __.width = 800; //selection[0][0].clientWidth;
    __.height = 600; //selection[0][0].clientHeight;

    setAxes();

    //draw chart
    splitiscope.svg = selection
                   .append('svg')
                    .attr('class','splitiscope')
                   .append('svg')
                    .attr('viewBox','0 0 ' + __.width + ' ' + __.height)
                    .attr('preserveAspectRatio','xMinYMin meet');
                    // .attr('height',__.height)
                    // .attr('width',__.width );

    splitiscope.svg.append("defs").append("svg:clipPath")
                    .attr("id", "plot_clip")
                    .append("svg:rect")
                    .attr("id", "clip-rect")
                    .attr("x", "0")
                    .attr("y", "0")
                    .attr("width", outerWidth())
                    .attr("height", outerHeight());

    var plot_offset = splitiscope.svg.append('g')
                        .attr('transform','translate('+__.margin.left+','+ __.margin.top+')');
                       
    bottom_surface = plot_offset.append('g')
                        .attr('transform','translate(' + padding.left + ',' + padding.top + ')');

    partition_surface = bottom_surface.append('g');
                         
    var top_surface = plot_offset.append('g')
                  .attr('clip-path','url(#plot_clip)');

    split_surface = top_surface.append('g')
                    .attr('transform','translate(' + padding.left + ',' + padding.top + ')');                    

    data_surface = top_surface.append('g')
                    .attr('transform','translate(' + padding.left + ',' + padding.top + ')');
    data_surface.append('g').attr('class','data');
    data_surface.append('g').attr('class','data_labels');

            return splitiscope;
  };

  splitiscope.toString = function() { return "Splitiscope: (" + d3.keys(__.data[0]).length + " total) , " + __.data.length + " rows"; };

  // expose the state of the chart
  splitiscope.state = __;
  splitiscope.flags = flags;

  // create getter/setters
  getset(splitiscope, __, events);

  // expose events
  d3.rebind(splitiscope, events, "on");

        // getter/setter with event firing
  function getset(obj,state,events)  {
    d3.keys(state).forEach(function(key) {   
      obj[key] = function(x) {
        if (!arguments.length) return state[key];
        var old = state[key];
        state[key] = x;
        side_effects[key].call(splitiscope,{"value": x, "previous": old});
        events[key].call(splitiscope,{"value": x, "previous": old});
        return obj;
      };
    });
  };

splitiscope.render = function() {

  if (yaxis.scale() !== undefined) drawAxes();

  if (_.isArray(data_array))  drawData();

  if (_.isObject(split_data)) drawSplits();

  drawSplitLabel();

  __.clear = false;

    return this;
};

function drawSplitLabel() {

  if (bottom_surface.select('.split_labels').node() !== null) { return; }
    var split_labels = bottom_surface.append('g')
                          .attr('class','split_labels');
    split_labels.append('text')
                .attr('class','x')
                .attr('transform','translate(0,'+plotHeight()+')')
                .text('');

    split_labels.append('text')
                .attr('class','y')
                .attr('transform','translate(0,0)')
                .text('');                
}

function updateSplitTextLabel(position,axis) {
  var format = d3.format('.3f');
    if (position === null) {
      bottom_surface.select('.split_labels .' + axis)
                      .text('');
      return;
    }
    var transform = {
                  x : axis === 'x' ? position : plotWidth()+2,
                  y : axis === 'y' ? position : plotHeight()+2
    };
    bottom_surface.select('.split_labels .' + axis)
                    .text(format(scales[axis].invert(position)))
                    .attr('transform','translate(' + transform.x + ',' + transform.y + ')');
}

function drawAxes() {
    var yAxis = bottom_surface.select('.y.axis'), 
       xAxis = bottom_surface.select('.x.axis');

    if (yAxis.node() != null | xAxis.node() != null) return updateAxes();

   yAxis = bottom_surface.append('g')
    .attr('class','y axis');

   xAxis = bottom_surface.append('g')
    .attr('class','x axis');

   adjustTicks();

   yAxis.append('g')
    .attr('class','ticks')
    .attr('transform','translate('+ (plotWidth()) +',0)')
    .call(yaxis);

   yAxis.append('text')
    .attr('class','axis_label')
    .attr('transform','translate('+ (plotWidth() + 45) +',' + plotHeight()*.6667 + ')rotate(-90)')
    .text(__.axes.labels.y);

   xAxis.append('g')
    .attr('class','ticks')
    .attr('transform','translate(0,' + (plotHeight()) +')')
    .call(xaxis);

   xAxis.append('text')
    .attr('class','axis_label')
    .attr('transform','translate(' + plotWidth()*.3334 + ',' + (plotHeight() + 30) +')')
    .text(__.axes.labels.x);


  }

function adjustTicks() {
   var yAxis = bottom_surface.select('.y.axis'), 
       xAxis = bottom_surface.select('.x.axis');

    
    yAxis.select('.ordinal_ticks').remove();
    xAxis.select('.ordinal_ticks').remove();
  
  if ( __.dataType.y === 'ordinal' ) {

    yaxis.tickSize(2);
    var yOrdinal = yAxis.append('g').attr('class','ordinal_ticks');

  var height_axis = 'y',
            extent = scales[height_axis].range(),
              band = ((scales[height_axis].rangeExtent()[1] - scales[height_axis].rangeExtent()[0]) / extent.length),
              halfBand = band/2;

    var yTicks = scales.y.range();

    var lines = yOrdinal
                .selectAll('line')
                .data(yTicks);
    
    lines.enter()
      .append('line')
      .style('stroke','#888')
      .style('stroke-width','2px')
      .attr('x1',0)
      .attr('x2',plotWidth())
      .attr('y1',function(point) { return point + halfBand + 2; } )
      .attr('y2',function(point) { return point + halfBand + 2; } )
  } 
  else yaxis.tickSize(-1*plotWidth()+10);

  if ( __.dataType.x === 'ordinal' ) {
    
   
    var xOrdinal = xAxis.append('g').attr('class','ordinal_ticks');

    var  axis = 'x',
         extent = scales[axis].range(),
              band = ((scales[axis].rangeExtent()[1] - scales[axis].rangeExtent()[0]) / extent.length),
              halfBand = band/2;

    var xTicks = scales.x.range();

    var lines = xOrdinal
                .selectAll('line')
                .data(xTicks);
    
    lines.enter()
      .append('line')
      .style('stroke','#888')
      .style('stroke-width','2px')
      .attr('x1',function(point) { return point - halfBand; })
      .attr('x2', function(point) { return point - halfBand; })
      .attr('y1',0 )
      .attr('y2',plotHeight() )
  } 


}

function updateAxes() {
  var y_axis = bottom_surface.select('.y.axis'), 
      x_axis = bottom_surface.select('.x.axis');

  adjustTicks();

  y_axis.select('.ticks').transition().duration(update_duration).call(yaxis.scale(scales.y));
  x_axis.select('.ticks').transition().duration(update_duration).call(xaxis.scale(scales.x));

}

function updateAxisLabels() {
     var y_axis = bottom_surface.select('.y.axis'), 
      x_axis = bottom_surface.select('.x.axis');

      y_axis.select('.axis_label').text(__.axes.labels.y);
      x_axis.select('.axis_label').text(__.axes.labels.x);
  }

function drawData() {

  var data_points = data_surface.select('.data')
    .selectAll('.data_point')
    .data(data_array, function(d) { return d[__.id]; } );

  function colorDataPoint(selector, point) {  
    selector
      .style('fill',function(point) {
            return  __.categoryColor(String(point[__.class.label]));
      })
      .style('stroke',function(point) {
            return __.categoryColor(String(point[__.class.label]));
      });
  }

  data_points.enter()
      .append('path')
      .attr('class','data_point')
      .style('fill','#fff')
      .style('stroke','#fff');

  data_points.exit()
      .transition()
      .duration(update_duration/2)
      .style('fill-opacity',0)
      .style('stroke-opacity',0)
      .remove();

  if (__.dataType['x'] == 'numerical' || __.dataType['y'] == 'numerical') {      

  data_points
        .attr('d',symbolFunction(0).size(symbolSize)())
    .transition()
      .duration(update_duration)
      .attr('transform', function(point) { 
          return 'translate(' + scales.x(point[__.axes.attr.x]) + ',' +
          scales.y(point[ __.axes.attr.y ]) + ')';})
      
      .style('fill-opacity', function(point) {
          return _.isUndefined(point.splits_on_x) ? 
            0.8 : caseSplitsOpacityscale(point.splits_on_x);
      })
      .style('stroke-width',"1px")     
      .call(colorDataPoint);
 
   var data_text = data_surface.select('.data_labels')
                      .selectAll('.data_totals')
                      .data([], String );

      data_text.exit().remove();

  } else if (__.dataType['x'] !== 'numerical' && __.dataType['y'] !== 'numerical') {

          var xInversed = {}; 
          _.each( scales.x.domain(), function(label, index) {
            xInversed[label] = index;
          });
          var yInversed = {}; 
          _.each( scales.y.domain(), function(label, index) {
            yInversed[label] = index;
          });

          var totalWidth = colorCategories.length * 15;

          var d = {}; 
                _.each(scales.x.domain(), function(label) { 
                  d[label] = {};
                  _.each(scales.y.domain(), function(ylabel) {
                    d[label][ylabel] = {};
                    _.each(colorCategories, function(cat) {
                      d[label][ylabel][cat] = 0;
                    });
                  });
                });

          var stacks = scales.x.domain().length * scales.y.domain().length * colorCategories.length;
          var e = Array.apply(null, new Array((scales.y.domain().length))).map(function() { return 0;});
          var f = new Array(stacks);

          _.each(data_array, function(point, index) {
                 e[ index ] = d[ point[ __.axes.attr.x ] ] [  point[ __.axes.attr.y ] ] [ String(point[__.class.label]) ]++;
          });

          var i = stacks -1;

          _.each(_.keys(d), function (k1) { 
              _.each(_.keys(d[k1]), function(k2) { 
                  _.each(_.keys(d[k1][k2]), function(k3) {
                          f[i--] = [k1, k2, k3, d[k1][k2][k3]];
                  });
                });
            });

          var height_axis = 'y',
            extent = scales[height_axis].range(),
              band = ((scales[height_axis].rangeExtent()[1] - scales[height_axis].rangeExtent()[0]) / extent.length);

          var width_axis = 'x',
            width_extent = scales[width_axis].range(),
              width_band = ((scales[width_axis].rangeExtent()[1] - scales[width_axis].rangeExtent()[0]) / width_extent.length);
           
          var barHeight =  (band - 25) / ( d3.max(e) ) ,
              halfBarHeight = barHeight / 2,
              barWidth =  ( width_band /2) / colorCategories.length,
              halfBarWidth = barWidth / 2,
              barSpacing = barWidth/colorCategories.length,
              last_index = colorCategories.length -1;

          function category_offset (label) {
            if (label === "undefined") { label = undefined; }
                position = colorCategories.indexOf( label ),
                midpoint = last_index / 2;
            var offset = (position  - midpoint) * (barWidth + (barSpacing * last_index));
            return Math.round(offset);
          } 

          data_points
                    .transition()
                      .duration(update_duration)
                      .style('fill-opacity', 0.8)
                      .style('stroke-opacity',0.8)
                      .attr('d', 'M 0 0 L '+ halfBarWidth +' 0 L ' + 
                              halfBarWidth +' -' + barHeight + ' L -'+halfBarWidth +' -' + 
                              barHeight + ' L -'+halfBarWidth+' 0 L 0 0' )
                      .attr('transform', 
                        function(point, i) { 
                            return 'translate(' + 
                                  (scales.x(point[__.axes.attr.x]) + category_offset(String(point[__.class.label])) ) +
                                    ',' +
                                  (scales.y(point[__.axes.attr.y] ) + band/2 - (e[i]*barHeight)) + ')';
                      })
                      .call(colorDataPoint);
                 
          function text_transform(point) {
                          return 'translate(' + 
                                  (scales.x(point[0]) + category_offset( point[2] ) - barWidth /4) + 
                                    ',' +
                                  (scales.y(point[1]) + band/2 - ((point[3]+1)*barHeight)) + ')';
          }

          var data_text = data_surface.select('.data_labels')
                      .selectAll('.data_totals')
                      .data(f, String );
                      
          data_text.enter()
                    .append("text")
                    .attr('class','data_totals')
                    .text(function(point,i){ return point[3];})
                    .attr('transform', function(point) {
                          return 'translate(' + 
                              (scales.x(point[0]) + category_offset( point[2] ) - barWidth /4) + 
                                ',' +
                              scales.y(point[1]) + ')';});

          data_text.transition()
                    .duration(update_duration)
                    .attr('transform', text_transform );

          data_text.exit().remove();

    }

  }

  splitiscope.resize = function() {
      // selection size
      // splitiscope.selection.select("svg") 
      //   .attr("width", __.width)
      //   .attr("height", __.height);

      splitiscope.svg
              .attr('height',plotHeight())
              .attr('width',plotWidth())
              .attr("transform", "translate(" + __.margin.left + "," + __.margin.top + ")");
    return this;
  };

function drawSplits() {

  _.each(['x','y'], function (axis) { 
    var split_group = d3.select('.'+axis+'.split_group').node();
            if ( _.isNull(split_group) ) split_surface.append('g').attr('class','' + axis + ' split_group');

            if ( __.dataType[axis] === 'numerical' ) {
                drawNumericalAxisSplits(axis);
            } else {
                drawOrdinalAxisSplits(axis);
            }
            });
}

function clearAllSplitPointers() {
  _.each(['x','y'], clearSplitPointer);
}

function clearSplitPointer(axis) {
  d3.select('.' + axis + '.split_group').selectAll('.' + axis + '.split_pointer')
          .transition()
          .duration(update_duration)
          .style('stroke-opacity',0)
          .remove();
}

function styleSplitSelector( split_selector, axis ) {
      split_selector
              .style('fill', '#eee')
              .style('fill-opacity', 0.3)
              .style('stroke', '#888')
              .style('stroke-width', 2.0)
             
}

function defineOrdinalSplitShape ( selection, axis ) {
  var domain = scales[axis].domain(),
      extent = scales[axis].range(),
         band = ((scales[axis].rangeExtent()[1] - scales[axis].rangeExtent()[0]) / extent.length) - 10;

  if (axis === 'x') {
    selection.attr('transform', function(d) { return 'translate(' + (scales[axis](d) - band/2) + ',0)'; } )
              .attr('x', 0)
              .attr('width', band)
              .attr('y', -1 * padding.top)
              .attr('height', padding.top);
  } else {
    selection.attr('transform', function(d) { return 'translate(0,' + ( scales[axis](d) - band/2 ) + ')'; } )
              .attr('x',-1 * padding.left)
              .attr('width', padding.left)
              .attr('y', 0 )
              .attr('height', band);
  }
}

function drawOrdinalAxisSplits ( axis ) {
   
   split_group = split_surface.select('.' + axis + '.split_group');

  var domain = scales[axis].domain();

  var splits = split_group.selectAll('rect')
            .data( domain, String );

      splits.enter()
           .append('rect')     
              .call(defineOrdinalSplitShape, axis )
              .call(styleSplitSelector, axis )
              .on('mouseover', function() {
                d3.select(this)
                    .style('fill-opacity', 1.0);
              })
              .on('mouseout', function() {
                d3.select(this)
                    .style('fill-opacity', 0.3);
              })
              .on('click', function(val) {
                 if ( _.contains(selected[axis], val )) {
                    removeCategoricalSplitValue(val, axis );
                  }
                  else {
                    selectCategoricalSplitValue(val, axis );
                  }
              });

    splits.transition()
              .duration(update_duration)
              .call(defineOrdinalSplitShape, axis );

    splits.exit()
          .remove();
}

function defineNumericalSplitShape ( selection, axis ) {

  var extent = scales[axis].range();

  if ( axis === 'x' ) {
    selection
              .attr('x',extent[0])
              .attr('width', extent[1] - extent[0])
              .attr('y', -1 * padding.top)
              .attr('height', padding.top);
  } else {
     selection.attr('x',-1 * padding.left)
              .attr('width', padding.left)
              .attr('y', extent[1])
              .attr('height', extent[0] - extent[1])
  }
}

function drawNumericalAxisSplits ( axis ) {
    
    var split_group = split_surface.select('.' + axis + '.split_group');
    
    var splits = split_group.selectAll('rect')
                      .data(["ZZZ"], String);

    var mouse_position_index = (axis === 'y') + 0; 

    splits.enter()
              .append('rect')             
              .call(defineNumericalSplitShape, axis)
              .call(styleSplitSelector, axis)
              .on('mouseover',function(){
                var position = d3.mouse(this)[mouse_position_index];
                if (selected[axis] === null) selectSplitValue(position, axis);
              })
              .on('mousemove',mousemove_fn(axis))
              .on('mouseout', function() {
                if (selected[axis] === null) clearSplitSelection(axis);
              })
              .on('click', function() {
                  var position = d3.mouse(this)[mouse_position_index];
                  selectSplitValue(position,axis);
                  if (selected[axis] !== null) {
                    clearSplitPointer(axis);
                    selected[axis] = null;
                  } else { 
                    selected[axis] = position;
                    appendNumericalSplitPointer(split_group, axis, position);
                   
                  }
                });

    splits.exit().remove();
              
  }

function appendNumericalSplitPointer(selection, axis, position) {
  if (axis ==='x') {
   selection.append('path')
                      .attr('class',axis + ' split_pointer')
                      .attr('transform','translate('+position+',0)')
                      .attr('d',function(d,i) {
                        return "M" + 0 + ",-" +padding.top + "v"+ padding.top;
                        })
                      .style('stroke', '#cc6432')
                      .style('stroke-width',4.0)
                      .style('fill','#cc6432');
   } else {
      selection.append('path')
                      .attr('class','y split_pointer')
                      .attr('transform','translate(0,'+position+')')
                      .attr('d',function(d,i) {
                        return "M" + "-" + padding.left + ",0h"+ padding.left;
                        })
                      .style('stroke', '#cc6432')
                      .style('stroke-width',4.0)
                      .style('fill','#cc6432');
   }

  }

function drawPartitionSpans() {

    var pad = 10;
    var double_pad = pad *2;

    var partition_splits = [
                            [ 
                              pad, 
                              pad, 
                              split_data['x'].span ? split_data['x'].span - pad : displayWidth() + pad, 
                              split_data['y'].span ? split_data['y'].span - pad : displayHeight()
                            ],
                            [ 
                              split_data['x'].span ? split_data['x'].span : displayWidth(), 
                              pad, 
                              split_data['x'].span ? displayWidth() - split_data['x'].span + double_pad : 0, 
                              split_data['y'].span ? split_data['y'].span - pad : displayHeight()
                            ],
                            [ 
                              pad,
                              split_data['y'].span ? split_data['y'].span : displayHeight(), 
                              split_data['x'].span ? split_data['x'].span - pad : displayWidth() + pad, 
                              split_data['y'].span ? displayHeight() - split_data['y'].span + pad : 0,
                            ],
                            [ 
                              split_data['x'].span ? split_data['x'].span : displayWidth(), 
                              split_data['y'].span ? split_data['y'].span : displayHeight(), 
                              split_data['x'].span ? displayWidth() - split_data['x'].span + double_pad : 0,
                              split_data['y'].span ? displayHeight() - split_data['y'].span + pad : 0
                            ]
                          ];

    if (_.isNull(split_data['x'].span) && _.isNull(split_data['y'].span)) {
      partition_splits = [];
    }

    var partitions = partition_surface.selectAll('.partition')
                    .data(partition_splits);
        
              partitions
                  .enter()
                  .append('rect')
                  .attr('class','partition')
                   .attr('x',function(val) {return val[0];})
                    .attr('y',function(val) {return val[1];})
                    .attr('width', function(val) {return val[2];})
                    .attr('height',function(val) {return val[3];})
                    .style('fill',function(d,i) { return __.partitionColors[i]})
                    .style('fill-opacity',0.3)
                    .style('stroke','none')
                    .style('stroke-opacity','0.6')
                    .style('stroke-width',4.0)
                    .on('mouseover', function() {
                      d3.selectAll('.partition').style('stroke','none');
                      d3.select(this).style('stroke','#22D');
                    })
                    .on('mouseout', function() {
                      var el = d3.event.relatedTarget;
                      if (d3.select(el).classed('data_point') || el.nodeName == 'line') { return; }
                      d3.select(this).style('stroke','none');
                    })
                    .on('click',function(dims){
                      var split_obj = {};
                      if ( !_.isNull(split_data['x'].span) ) {
                        split_obj[__.axes.attr.x] = {};
                        if ( __.dataType.x === 'numerical' ) {
                          var x = {low : scales.x.invert(dims[0]), high: scales.x.invert(dims[2] + dims[0])};
                          split_obj[__.axes.attr.x] = _.clone(x);
                        } else {
                          var xExtent = scales.x.range(),
                              xSelectedVals = _.filter(xExtent, function(val) { return val >= dims[0] && val <= dims[0] + dims[2]; } );
                          split_obj[__.axes.attr.x] = { values: _.map(xSelectedVals, scales.x.invert) };
                        }
                      }
                      if (!_.isNull(split_data['y'].span)) {
                        split_obj[__.axes.attr.y] = {};
                        if ( __.dataType.y === 'numerical' ) {
                          var y = {low : scales.y.invert(dims[1] + dims[3]), high: scales.y.invert(dims[1])};
                          split_obj[__.axes.attr.y] = _.clone(y);
                        } else {
                          var yExtent = scales.y.range(),
                              ySelectedVals = yExtent.filter( function(val) { return val >= dims[1] && val <= dims[1] + dims[3];} );
                          split_obj[__.axes.attr.y] = { values : _.map(ySelectedVals, scales.y.invert) };
                        }
                      }
                      events.partition( split_obj );
                    });              

                partitions
                    .attr('x',function(val) {return val[0];})
                    .attr('y',function(val) {return val[1];})
                    .attr('width', function(val) {return val[2];})
                    .attr('height',function(val) {return val[3];});

                partitions.exit()
                    .transition()
                    .duration(100)
                    .attr('fill-opacity',0)
                    .remove();

  }

function clearPartitionSpans() {
   var partitions = partition_surface.selectAll('.partition');
   
   partitions.transition()
              .duration(update_duration)
              .style('fill-opacity',0.0)
              .style('stroke-opacity',0.0)
              .remove();
  }

function mousemove_fn(axis) {
    return function(){ 
                var position = d3.mouse(this)[axis === 'x' ? 0 : 1];
                if (selected[axis] === null) selectSplitValue(position, axis);            
    };
  }

function mouseover_fn(el,index, axis) {
   if (selected[axis] === index) {
                selected[axis] = null;
                clearSplitSelection(axis);
                return;
              }
              selected[axis] = index;
              makeSplitSelection(el,selected[axis],axis);
              return;
  }
 
  function makeSplitSelection(el, index, axis){
    split_data[axis].span = split_data[axis].binScale(index);
    drawPartitionSpans();
  }

  function selectSplitValue(position, axis) {
    var value = scales[axis].invert(position)
    split_data[axis].span = position;
    drawPartitionSpans();
    updateSplitTextLabel(position, axis);
  }

  function selectCategoricalSplitValue(value, axis) {
    if (!_.contains(selected[axis], value)) selected[axis].push(value);
    var remaining_values = _.difference( scales[axis].domain(), selected[axis] ),
        domain = _.union(selected[axis],remaining_values),
        band = ((scales[axis].rangeExtent()[1] - scales[axis].rangeExtent()[0]) / domain.length) ;

    scales[axis].domain(domain);
    scales[axis].invert.range(domain);
    
    split_data[axis].span  = scales[axis](value) - ( band/2 * (axis === 'x' ? -1 : 1));
    updateAxes();
    drawData();
    drawSplits();
    drawPartitionSpans();
  }

  function removeCategoricalSplitValue(value, axis) {
    if (!_.contains(selected[axis], value)) return;
    
    selected[axis] = _.difference( selected[axis], [ value ] );
    var len = selected[axis].length
        remaining_values = len ? _.difference( scales[axis].domain(), selected[axis] ) : scales[axis].domain(),
        domain = len ? _.union(selected[axis],remaining_values) : remaining_values,
        band = ((scales[axis].rangeExtent()[1] - scales[axis].rangeExtent()[0]) / domain.length) ;
    
    scales[axis].domain(domain);
    scales[axis].invert.range(domain);

    split_data[axis].span  = len ? scales[axis](selected[axis][len-1]) - ( band/2 * (axis === 'x' ? -1 : 1)) : null;
        
    updateAxes();
    drawData();
    drawSplits();
    drawPartitionSpans();
  }

  function clearAllSplitSelections() {
    _.each(['x','y'], function(axis) {
      selected[axis] = __.dataType[axis] === 'numerical' ? null : [];
      clearSplitSelection(axis)
      });
  }

  function clearSplitSelection(axis){
      if ( _.isNull(split_data[axis].span) ) return;
      split_data[axis].span = null;
      drawPartitionSpans();
      updateSplitTextLabel(null, axis);
  }

  function isOrdinal(array) {
    if ( !_.isArray(array)) return false; //can't handle a non-array...
    var vals = _.uniq(array);
    if ( vals.length <= 6 ) return true;   // too few values
    if ( _.some(vals, _.isString) ) return true;  // any strings?
    return false;
  }

  function isFinite(array) {  // check if there's a terrible number (Infinity, NaN) in there
    return !( _.some(array, !_.isFinite));
  }

  function parseData() {
    if (__.data.length < 1) {
        console.log('Empty data array.  Nothing to plot.');
        return;
    }

    var element_properties = _.keys(__.data[0]);
    if ( _.contains(element_properties,  __.axes.attr.x ) && _.contains(element_properties,  __.axes.attr.y ) ) {
      var xVals = _.uniq(_.pluck(__.data, __.axes.attr.x ) ),
          yVals = _.uniq(_.pluck(__.data,  __.axes.attr.y ) );
          if (__.clear) {
              __.dataType.x =  isOrdinal( xVals ) ? 'ordinal' : 'numerical';
              __.dataType.y =  isOrdinal( yVals ) ? 'ordinal' : 'numerical';
          }
    }
    else {
      console.error('x or y coordinates not packaged in data');
      return;
    }

    data_array = __.data;

    setDataScales(xVals, yVals);

    return splitiscope;

  }

  function setDataScales( xVals, yVals ) {  //unique values for each dimension
    
    var splits_on_x = _.pluck( data_array, 'splits_on_x' );

    caseSplitsOpacityscale = d3.scale.linear().domain(d3.extent(splits_on_x)).range([0.2,0.9]);

    if ( __.dataType.x === "ordinal" ) {
      scales.x = d3.scale.ordinal().domain(xVals.sort()).rangePoints([10,plotWidth()-10],1.0);
      scales.x.invert = d3.scale.ordinal().domain(scales.x.range()).range(xVals);

      selected.x = [];
    } 
    else { 
      scales.x =d3.scale.linear().domain(d3.extent(xVals)).rangeRound([10,plotWidth()-10]);
   }
                     
    if ( __.dataType.y === "ordinal" ) {
      scales.y = d3.scale.ordinal().domain(yVals.sort(d3.descending)).rangePoints([plotHeight()-10,10],1.0);
      scales.y.invert = d3.scale.ordinal().domain(scales.y.range()).range(yVals);
      
      selected.y = [];
    }
    else { 
      scales.y = d3.scale.linear().domain(d3.extent(yVals)).rangeRound([plotHeight()-10,10]);
     }
    
    return setAxes();
  }

  function setClassScales() {
 
    //if the class hasn't changed, don't modify it.
    colorCategories = __.class.list.length ? _.map( __.class.list, String) : [undefined];

    var numberOfCategories = colorCategories.length,
        colorArray = _.first(__.pointColors, numberOfCategories) || __.pointColors[0];

    __.categoryColor = numberOfCategories ? d3.scale.ordinal().domain(colorCategories).range(colorArray) : function() { return colorArray;};

  }

  function setAxes() {
    
    yaxis.scale(scales['y']).tickSize(-1*plotWidth()+10).ticks(5);
    xaxis.scale(scales['x']).tickSize(2).ticks(5);

    return splitiscope;
  }

function parseSplits() {
  var split_bin_start, split_bin_number, split_bin_end, s;

  _.each(['x','y'], function (axis){

    if (__.splits[axis] !== undefined) {

     s = split_data[axis].data_array = __.splits[axis].bins;
      
      if(s.length < 1 || s[0] === undefined || s[0].length < 1) {
        console.error('invalid split bins in axis: ' + axis);
        return;
      }

      split_bin_number = split_data[axis].data_array.length;
      split_bin_start = __.splits[axis].low+(.5*__.splits[axis].binsize);
      split_bin_end = split_bin_start + ((split_bin_number-1)*__.splits[axis].binsize);

      var bin_positions = _.map(s, function(d,i) { 
        return split_bin_start + (__.splits[axis].binsize * i); 
      });

      var range = scales[axis].domain(), min = range[0], max = range[1];
      s= [];
      var idx = 0, bin_p = [];

       _.each(bin_positions, function(val, index) { 
          if (val >= min && val <= max) {
            bin_p[idx] = val;
            s[idx] = split_data[axis].data_array[index];
            idx++;
          } 
      });

      split_bin_number = bin_p.length;
      split_bin_start = bin_p[0];
      split_bin_end = bin_p[split_bin_number-1];

      split_data[axis].data_array = split_bin_number > 0 ? s : undefined;

      split_data[axis].vis = {
          attr : axis === 'x' ? 'd' : 'stroke',
          fn: axis === 'x' ? symbolFunction : strokeFunction,
          default: axis === 'x' ? symbolFunction(0)() : 'transparent',
      };

      if (!_.isUndefined(split_data[axis].data_array)) setSplitScales(axis,split_bin_number,split_bin_start,split_bin_end);
    }

  });
}

  function setSplitScales(axis,split_bin_number,split_bin_start,split_bin_end) {
    var data = split_data[axis].data_array;
    split_data[axis].opacityScale = d3.scale.linear().domain(d3.extent(data)).rangeRound([0.3,0.9]);
    split_data[axis].colorScale = d3.scale.linear().domain(d3.extent(data)).range(['#FFEDA0','#F03B20']);
    split_data[axis].binScale = d3.scale.linear().domain([0,split_bin_number-1]).rangeRound([scales[axis](split_bin_start), scales[axis](split_bin_end)]);

    return splitiscope;
  }

  return splitiscope;
};

});