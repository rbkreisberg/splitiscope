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
    margin : {top:15, bottom: 15, left:30, right: 10},
    colorLabel  : 'label',
    radius : 4,
    xDataType : 'numerical',
    yDataType : 'numerical',
    data : {x:[],y:[], label:[] },
    splits : {},   
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
      shapes = ['circle','cross','diamond','square','triangle-down','triangle-up'],
      symbolSize = Math.pow(__.radius,2),
      symbol = d3.svg.symbol().size(symbolSize).type(shapes[0]),
      symbolMap = d3.scale.ordinal().domain([0,5]).range(shapes),
      symbolFunction = _.compose(symbol.type, symbolMap),
      splitStrokeColors = ['red','green','black'],
      strokeFunction = function(index) { return splitStrokeColors[index];},
      data_array = [],
      yaxis = d3.svg.axis().orient("right").ticks(5).tickSize(-1*plotWidth() + 10,4,4),
      xaxis = d3.svg.axis().orient("bottom").ticks(5),
      bottom_surface, split_surface, data_surface, partition_surface; // groups for axes, brushes

  // side effects for setters
  var side_effects = d3.dispatch.apply(this,d3.keys(__))
    //.on("width", function(d) { splitiscope.resize(); })
    //.on("height", function(d) { splitiscope.resize(); })
    //.on("margin", function(d) { splitiscope.resize(); })
    .on("radius", function(d) { symbolSize = Math.pow(__.radius,2);})
    .on("data", function(d) { parseData(); console.log('new data');})
    .on("splits", function(d) { parseSplits(); console.log('new splits');});
   
 var splitiscope = function(selection) {
    selection = splitiscope.selection = d3.select(selection);

    __.width = selection[0][0].clientWidth;
    __.height = selection[0][0].clientHeight;

    setAxes();

    //draw chart
    splitiscope.svg = selection
                    .append('svg')
                    .attr('class','splitiscope')
                    .attr('height',__.height)
                    .attr('width',__.width );

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

    return this;
};

function drawSplitLabel() {
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
    bottom_surface.append('g')
    .attr('transform','translate('+ (plotWidth()) +',0)')
    .attr('class','y axis')
    .call(yaxis);

    bottom_surface.append('text')
    .attr('transform','translate('+ (plotWidth() + 25) +',' + plotHeight()/2 + ')rotate(-90)')
    .text('Y Label');

    bottom_surface.append('g')
    .attr('transform','translate(0,' + (plotHeight()) +')')
    .attr('class','x axis')
    .call(xaxis);

    bottom_surface.append('text')
    .attr('transform','translate(' + plotWidth()/2 + ',' + (plotHeight() + 30) +')')
    .text('X Label');
  }

  function drawData() {

     var data_points = data_surface
                          .selectAll('.data_point')
                          .data(data_array)
                        .enter()
                        .append('path')
                          .attr('class','data_point')
                          .attr('transform', function(point) { return 'translate(' + scales.x(point.x) + ',' +
                            scales.y(point.y) + ')';})
                          .attr('d',symbolFunction(0).size(symbolSize)())
                          .style('fill',function(point) {
                                                  return categoryLabelScale(point[__.colorLabel]);
                          })
                          .style('fill-opacity', function(point) {
                              return _.isUndefined(point.splits_on_x) ? 1.0 : caseSplitsOpacityscale(point.splits_on_x);
                          });

  }

  splitiscope.resize = function() {
      // selection size
      splitiscope.selection.select("svg") 
        .splitiscope("width", __.width)
        .splitiscope("height", __.height);

      splitiscope.svg
              .attr('height',plotHeight())
              .attr('width',plotWidth())
              .attr("transform", "translate(" + __.margin.left + "," + __.margin.top + ")");
    return this;
  };

function drawSplits() {

  if (!_.isUndefined(split_data.x.data_array)) {
    drawXSplits();
  }

  if (!_.isUndefined(split_data.y.data_array)) {
    drawYSplits();
  }
}

function drawXSplits() {

    var xsplits = split_surface.append('g');
    
    var xExtent = scales.x.range();
     
    xsplits.append('rect')             
              .attr('x',xExtent[0])
              .attr('width', xExtent[1] - xExtent[0])
              .attr('y', -1 * padding.top)
              .attr('height', padding.top)
              .style('fill','#eee')
              .style('fill-opacity',0.3)
              .style('stroke','#888')
              .style('stroke-width',2.0)
              .on('mouseover',function(){
                var position = d3.mouse(this)[0];
                if (selected['x'] === null) selectSplitValue(position, 'x');
              })
              .on('mousemove',function(){
                var position = d3.mouse(this)[0];
                if (selected['x'] === null) selectSplitValue(position, 'x');
              })
              .on('mouseout', function() {
                if (selected['x'] === null) clearSplitSelection('x');
              })
              .on('click', function() {
                  var position = d3.mouse(this)[0];
                  selectSplitValue(position,'x');
                  if (selected['x'] !== null) {
                    xsplits.selectAll('.x.split_pointer').remove();
                    selected['x'] = null;
                  }
                  else { 
                    selected['x'] = position;
                    xsplits.append('path')
                        .attr('class','x split_pointer')
                        .attr('transform','translate('+position+',0)')
                        .attr('d',function(d,i) {
                          return "M" + 0 + ",-" +padding.top + "v"+ padding.top;
                          })
                        .style('stroke', '#cc6432')
                        .style('stroke-width',4.0)
                        .style('fill','#cc6432');
                      }
                });

    // var splits = xsplits                    
    //                 .selectAll('.x .splits')
    //                 .data(split_data.x.data_array)                   
    //               .enter()
    //               .append('g')
    //               .attr('class','x splits')
    //               .on('click', function(split_val,i) {
    //                       mouseover_fn(this, i, 'x');
    //                    })
    //                .on('mouseover',function(split_val,i){
    //                   if (selected['x'] === null) makeSplitSelection(this, i, 'x');
    //                 });
                   
    //               splits.append('rect')
    //                 .attr('class','split_bubble')
    //                 .attr('x',function(d,i) { return split_data.x.binScale(i)-20;})
    //                 .attr('width', 40)
    //                 .attr('y',-1 * padding.top)
    //                 .attr('height',padding.top +10)
    //                 .style('stroke',split_data.x.colorScale)
    //                 .style('stroke-opacity','1')
    //                 .style('stroke-width',0)
    //                 .style('fill','transparent')
    //                 .style('fill-opacity','1');

    //       var split_line = splits.append('g')
    //                 .attr('class','split_line')
    //                 .attr('transform',function(d,i) { return 'translate('+split_data.x.binScale(i)+','+0+')';});
                    
    //           split_line 
    //                 .append('path')
    //                 .attr('d',function(d,i) {
    //                   return "M" + 0 + ",-" +padding.top + "v"+ padding.top;
    //                   })
    //                 .style('stroke',split_data.x.colorScale)
    //                 .style('stroke-width',4.0)
    //                 .style('fill',split_data.x.colorScale);

    //           split_line
    //                   .append("path")
    //                   .style('stroke',split_data.x.colorScale)
    //                   .style('stroke-width',4.0)
    //                   .style('fill',split_data.x.colorScale)
    //                   .attr("d", "M5,0L-5,0L0,5z");

  }

function drawYSplits() {

    var ysplits = split_surface.append('g');

    var yExtent = scales.y.range();
     
     ysplits.append('rect')
              .attr('x',-1 * padding.left)
              .attr('width', padding.left)
              .attr('y',yExtent[1])
              .attr('height',yExtent[0]-yExtent[1])
              .style('fill','#eee')
              .style('fill-opacity',0.3)
              .style('stroke','#888')
              .style('stroke-width',2.0)
              .on('mouseover',function(){
                var position = d3.mouse(this)[1];
                if (selected['y'] === null) selectSplitValue(position, 'y');
              })
              .on('mousemove',function(){
                var position = d3.mouse(this)[1];
                if (selected['y'] === null) selectSplitValue(position, 'y');
              })
               .on('mouseout', function() {
                if (selected['y'] === null) clearSplitSelection('y');
              })
              .on('click', function() {
                  var position = d3.mouse(this)[1];
                  selectSplitValue(position,'y');
                  if (selected['y'] !== null) {
                    ysplits.selectAll('.y.split_pointer').remove();
                    selected['y'] = null;
                  }
                  else { 
                    selected['y'] = position;
                    ysplits.append('path')
                        .attr('class','y split_pointer')
                        .attr('transform','translate(0,'+position+')')
                        .attr('d',function(d,i) {
                          return "M" + "-" + padding.left + ",0h"+ padding.left;
                          })
                        .style('stroke', '#cc6432')
                        .style('stroke-width',4.0)
                        .style('fill','#cc6432');
                      }
                });
                                 

     // var splits = ysplits
     //                .selectAll('.y .splits')
     //                .data(split_data.y.data_array)
     //              .enter()
     //              .append('g')
     //               .attr('class','y splits')
     //               .on('click', function(split_val,i) {
     //                      mouseover_fn(this,i,'y')
     //                })
     //               .on('mouseover',function(split_val,i){
     //                    if (selected['y'] === null) makeSplitSelection(this,i,'y');
     //                });

          //         splits.append('rect')
          //           .attr('class','split_bubble')
          //           .attr('y',function(d,i) { return split_data.y.binScale(i)-20;})
          //           .attr('height', 40)
          //           .attr('x',-1 * padding.left)
          //           .attr('width',padding.left + 10)
          //           .style('stroke',split_data.y.colorScale)
          //           .style('stroke-opacity','1')
          //           .style('stroke-width',0)
          //           .style('fill','transparent')
          //           .style('fill-opacity','1');

          // var split_line = splits.append('g')
          //           .attr('class','split_line')
          //           .attr('transform',function(d,i) { return 'translate('+0+',' + split_data.y.binScale(i) +')';});
                    
          //         split_line 
          //           .append('path')
          //           .attr('d',function(d,i) {
          //             return "M" + "-" + padding.left + ",0h"+ padding.left;
          //             })
          //           .style('stroke',split_data.y.colorScale)
          //           .style('stroke-width',4.0)
          //           .style('fill',split_data.y.colorScale);

          //         split_line.append("path")
          //             .style('stroke',split_data.y.colorScale)
          //             .style('stroke-width',4.0)
          //             .style('fill',split_data.y.colorScale)
          //             .attr("d", "M0,5L5,0L0,-5z");

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
                      .on('click',function(dims){
                        var x = {low : scales.x.invert(dims[0]), high: scales.x.invert(dims[2] + dims[0])};
                        var y = {low : scales.y.invert(dims[1] + dims[3]), high: scales.y.invert(dims[1])};
                        var data_indices  = _.map(__.data.x, function(valx,index){
                          var valy = __.data.y[index];
                            return valx >= x.low && valx <= x.high && valy >= y.low && valy <= y.high ? index : null;
                        });
                        data_indices = _.compact(data_indices);
                        var data = {};
                        _.each(_.keys(__.data), function(data_key) {
                          data[data_key] = d3.permute(__.data[data_key],data_indices);
                        });
                        events.partition(data);
                      });              

                      partitions.transition()
                      .duration(100)
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
    var selector = '.' + axis + ' .split_line,.' + axis + ' .split_bubble';
    var split = d3.select(el).selectAll(selector);
                      d3.selectAll(selector).style('stroke-opacity',0.3).style('fill-opacity',0.3);
                      split.style('stroke-opacity',1).style('fill-opacity',1);

    split_data[axis].span = split_data[axis].binScale(index);

    drawPartitionSpans();
 
  }

  function selectSplitValue(position, axis) {
    var value = scales[axis].invert(position)
    split_data[axis].span = position;
    drawPartitionSpans();
    updateSplitTextLabel(position, axis);
  }

  function clearSplitSelection(axis){
       var selector = '.' + axis + ' .split_line,.' + axis + ' .split_bubble';
                      d3.selectAll(selector).style('stroke-opacity',1).style('fill-opacity',1);
                      // d3.selectAll('.data_point').attr(split_data[axis].vis.attr,split_data[axis].vis.default)

      split_data[axis].span = null;
      drawPartitionSpans();
      updateSplitTextLabel(null, axis);

  }

  function parseData() {
    if ((__.data.x).length < 1) {
        console.log('Empty data array.  Nothing to plot.');
        return;
      }
    var element_properties = _.keys(__.data);
    if ((__.data.x).length > 0) {
      __.xDataType =  typeof __.data.x[0] === 'string' ? 'ordinal' : 'numerical';
      __.yDataType =  typeof __.data.y[0] === 'string' ? 'ordinal' : 'numerical';
    }

    data_array = _.map(__.data.x, function(val, index) {
                          var element = {};
                          
                          _.each(element_properties, function(prop) {
                              element[prop] = __.data[prop][index];
                            });
                          
                        return element;
      });  

    setDataScales();

    return splitiscope;

  }

   function setDataScales() {
    scales.x = __.xDataType === "ordinal" ?
                     d3.scale.ordinal().domain(__.data.x).rangeRoundBands([10,plotWidth()-10],0) :
                     d3.scale.linear().domain(d3.extent(__.data.x)).range([10,plotWidth()-10]);
   
    scales.y = __.yDataType === "ordinal" ?
                    d3.scale.ordinal().domain(__.data.y).rangeRoundBands([plotHeight()-10,10],0) :
                    d3.scale.linear().domain(d3.extent(__.data.y)).range([plotHeight()-10,10]);

    var numberOfCategories = _.uniq(__.data[__.colorLabel]).length;
    var colorArray = _.first(__.pointColors,numberOfCategories);

    categoryLabelScale = d3.scale.ordinal().domain(__.data[__.colorLabel]).range(colorArray);
    caseSplitsOpacityscale = d3.scale.linear().domain(d3.extent(__.data['splits_on_x'])).range([0.2,0.9]);
    
    return setAxes();
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

        var bin_positions = _.map(s, function(d,i) { return split_bin_start + (__.splits[axis].binsize * i); });
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
    split_data[axis].opacityScale = d3.scale.linear().domain(d3.extent(data)).range([0.3,0.9]);
    split_data[axis].colorScale = d3.scale.linear().domain(d3.extent(data)).range(['#FFEDA0','#F03B20']);
    split_data[axis].binScale = d3.scale.linear().domain([0,split_bin_number-1]).range([scales[axis](split_bin_start), scales[axis](split_bin_end)]);

    return splitiscope;
  }

  function setAxes() {
    
    yaxis.scale(scales['y']).tickSize(-1*plotWidth()+10).ticks(5);
    xaxis.scale(scales['x']).tickSize(2).ticks(5);

    return splitiscope;
  }

  return splitiscope;
};

});