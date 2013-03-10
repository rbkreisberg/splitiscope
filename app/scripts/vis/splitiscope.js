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
    splitColor : "#C1573B",
    margin : {top:15, bottom: 15, left:30, right: 10},
    colorLabel  : 'label',
    radius : 4,
    xDataType : 'numerical',
    yDataType : 'numerical',
    data_array : [],
    data : {x:[],y:[], label:[] },
    splits : {},
    split_array : [],
 };

  _.extend(__, config);
    

  var splitiscope = function(selection) {
    selection = splitiscope.selection = d3.select(selection);

    __.width = selection[0][0].clientWidth;
    __.height = selection[0][0].clientHeight;

    // if (selection.nodeType === undefined) { selection = window.document.body; } //check if we're on a node.  
  
          //draw chart
    splitiscope.svg = selection
                    .append('svg')
                    .attr('class','splitiscope')
                    .attr('height',__.height)
                    .attr('width',__.width );

    var plot_offset = splitiscope.svg.append('g')
                        .attr('transform','translate('+__.margin.left+','+ __.margin.top+')')
                        .attr('height',h())
                        .attr('width',w())

    var bottom_surface = plot_offset.append('g');

    splitiscope.split_surface = plot_offset.append('g');

    splitiscope.data_surface = plot_offset.append('g');

            return splitiscope;
  };

  var events = d3.dispatch.apply(this,["render", "resize", "highlight", "brush"].concat(d3.keys(__))),
      w = function() { return __.width - __.margin.right - __.margin.left; },
      h = function() { return __.height - __.margin.top - __.margin.bottom },
      flags = {
        brushable: false,
        reorderable: false,
        axes: false,
        interactive: false,
        shadows: false,
        debug: false
      },
      xscale = d3.scale.ordinal(),
      yscale = {},
      caseSplitsOpacityscale,
      splitxscale,
      splitOpacityscale,
      dragging = {},
      axis = d3.svg.axis().orient("left").ticks(5),
      g; // groups for axes, brushes

  // side effects for setters
  var side_effects = d3.dispatch.apply(this,d3.keys(__))
    .on("width", function(d) { splitiscope.resize(); })
    .on("height", function(d) { splitiscope.resize(); })
    .on("margin", function(d) { splitiscope.resize(); })
    .on("data", function(d) { parseData(); console.log('new data');});
   

  splitiscope.toString = function() { return "Splitiscope: " + __.splits.length + " splits (" + d3.keys(__.data[0]).length + " total) , " + __.data.length + " rows"; };

  // expose the state of the chart
  splitiscope.state = __;
  splitiscope.flags = flags;

  // create getter/setters
  getset(splitiscope, __, events);

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

   var data_points = splitiscope.data_surface
                        .selectAll('.data_point')
                        .data(__.data)
                      .enter()
                      .append('circle')
                        .attr('class','data_point')
                        .attr('cx', function(point) { return xscale(point.x[d3.index]);})
                        .attr('cy', function(point) { return yscale(point.y[d3.index]);})
                        .attr('r',__.radius)
                        .style('fill',function(point) {
                                                return categoryLabelScale(point[__.colorLabel]);
                        })
                        .style('fill-opacity', function(point) {
                            return _.isUndefined(point.splits_on_x) ? 1.0 : caseSplitsOpacityscale(point.splits_on_x);
                        });

    var splits = splitiscope.split_surface
                  .selectAll('.split')
                  .data(__.split_array)
                .enter()
                .append('rect')
                  .attr('class','split')
                  .attr('width',4)
                  .attr('height',h())
                  .attr('x',function() { return splitxscale(d3.index); })
                  .attr('y',0)
                  .style('stroke','red')
                  .style('stroke-width',0.5)
                  .style('fill','none')
                  .style('stroke-opacity', splitOpacityscale)
                  .on('mouseover',function(){
                    var rect = d3.select(this);
                    d3.select('.split').style('stroke-opacity',0);
                    rect.style('stroke-opacity',1.0);
                  })
                  .on('mouseout',function(){
                    var rect = d3.select(this);
                    d3.select('.split').style('stroke-opacity','density');
                  });

    return this;
};

 splitiscope.resize = function() {
    // selection size
    splitiscope.selection.select("svg") 
      .splitiscope("width", __.width)
      .splitiscope("height", __.height);

    splitiscope.svg
            .attr('height',h())
            .attr('width',w())
            .attr("transform", "translate(" + __.margin.left + "," + __.margin.top + ")");
  return this;
};


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

  setScales();

  return splitiscope;

}

function setScales() {
  xscale = __.xDataType === "ordinal" ?
                  d3.scale.ordinal().domain(__.data.x).rangeRoundBands([0,w()],0) :
                  d3.scale.linear().domain(d3.extent(__.data.x)).range([0,w()]);

  yscale = __.yDataType === "ordinal" ?
                  d3.scale.ordinal().domain(__.data.y).rangeRoundBands([h(),0],0) :
                  d3.scale.linear().domain(d3.extent(__.data.y)).range([h(),0]);

  var numberOfCategories = _.uniq(__.data[__.colorLabel]).length;
  var colorArray = _.first(__.pointColors,numberOfCategories);

  categoryLabelScale = d3.scale.ordinal().domain(__.data[__.colorLabel]).range(colorArray);

  split_bin_number = __.split_array[0].length;
  split_bin_start = xscale(split.low)+(.5*split.binsize);
  split_bin_end = split_bin_start +  (split_bin_number-1)*split.binsize;

  splitOpacityscale = d3.scale.linear().domain([0,d3.max(__.split_array)]).range(0.3,0.9);
  splitxscale = d3.scale.linear().domain([0,split_bin_number-1]).range(split_bin_start, split_bin_end);

  caseSplitsOpacityscale = d3.scale.linear().domain([0,d3.max(_.pluck(__.data_array,'splits_on_x'))]).range(0.3,0.9);

}

  return splitiscope;
};


});