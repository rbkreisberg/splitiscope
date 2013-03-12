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
    data : {x:[],y:[], label:[] },
    splits : {},
    
 };

  _.extend(__, config);

  var events = d3.dispatch.apply(this,["render", "resize", "highlight", "brush"].concat(d3.keys(__))),
      w = function() { return __.width - __.margin.right - __.margin.left - padding.right - padding.left},
      h = function() { return __.height - __.margin.top - __.margin.bottom - padding.top - padding.bottom },
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
      caseSplitsColorscale,
      splitxscale,
      splitOpacityscale,
      splitColorscale,
      dragging = {},
      padding = { top: 4, bottom: 4, left: 4, right: 4 },
      split_array = undefined,
      shapes = ['circle','cross','diamond','square','triangle-down','triangle-up'],
      symbolSize = Math.pow(__.radius,2),
      symbol = d3.svg.symbol().size(symbolSize).type(shapes[0]),
      symbolMap = d3.scale.ordinal().domain([0,5]).range(shapes),
      symbolFunction = _.compose(symbol.type, symbolMap),
      data_array = [],
      yaxis = d3.svg.axis().orient("right").ticks(5).tickSize(-1*w()),
      xaxis = d3.svg.axis().orient("bottom").ticks(5).tickSize(2),
      bottom_surface, split_surface, data_surface; // groups for axes, brushes

  // side effects for setters
  var side_effects = d3.dispatch.apply(this,d3.keys(__))
    .on("width", function(d) { splitiscope.resize(); })
    .on("height", function(d) { splitiscope.resize(); })
    .on("margin", function(d) { splitiscope.resize(); })
    .on("radius", function(d) { symbolSize = Math.pow(__.radius,2);})
    .on("data", function(d) { parseData(); console.log('new data');})
    .on("splits", function(d) { parseSplits(); console.log('new splits');});
   

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

    splitiscope.svg.append("defs").append("svg:clipPath")
                  .attr("id", "plot_clip")
                    .append("svg:rect")
                    .attr("id", "clip-rect")
                    .attr("x", "0")
                    .attr("y", "0")
                    .attr("width", w() + padding.left+ padding.right)
                    .attr("height", h()+ padding.bottom +  padding.top);

    var plot_offset = splitiscope.svg.append('g')
                        .attr('transform','translate('+__.margin.left+','+ __.margin.top+')');
                       
    bottom_surface = plot_offset.append('g');

    var top_surface = plot_offset.append('g')
                  .attr('clip-path','url(#plot_clip)')
                        .attr('height',h()+ padding.bottom +  padding.top  )
                        .attr('width',w() + padding.left+ padding.right);

    split_surface = top_surface.append('g')
    .attr('transform','translate(' + padding.left + ',' + padding.top + ')');                    

    data_surface = top_surface.append('g')
    .attr('transform','translate(' + padding.left + ',' + padding.top + ')');

            return splitiscope;
  };

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

  if (yaxis.scale() !== undefined) drawAxes();

  if (_.isArray(data_array))  drawData();

  if (_.isArray(split_array)) drawSplits();

    return this;
};

  function drawAxes() {
    bottom_surface.append('g')
    .attr('transform','translate('+ (w()) +',0)')
    .attr('class','y axis')
    .call(yaxis);

    bottom_surface.append('g')
    .attr('transform','translate(0,' + (h() ) +')')
    .attr('class','x axis')
    .call(xaxis);
  }

  function drawData() {

     var data_points = data_surface
                          .selectAll('.data_point')
                          .data(data_array)
                        .enter()
                        .append('path')
                          .attr('class','data_point')
                          .attr('transform', function(point) { return 'translate(' + xscale(point.x) + ',' +
                            yscale(point.y) + ')';})
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
              .attr('height',h())
              .attr('width',w())
              .attr("transform", "translate(" + __.margin.left + "," + __.margin.top + ")");
    return this;
  };

  function drawSplits() {


     var splits = split_surface
                    .selectAll('.splits')
                    .data(split_array)
                  .enter()
                  .append('g')
                  .attr('class','splits')
                   .on('mouseover',function(split_val,i){
                      var rect = d3.select(this).select('.split_line');
                      d3.selectAll('.split_line').style('stroke-opacity',0).style('fill-opacity',0);
                      rect.style('stroke-opacity',1).style('fill-opacity',1);

                      d3.selectAll('.data_point')
                        .filter(function(point) { return xscale(point.x) < splitxscale(i); })
                        .attr('d',symbolFunction(0));


                      d3.selectAll('.data_point')
                        .filter(function(point) { return xscale(point.x) >= splitxscale(i); })
                        .attr('d',symbolFunction(1));

                    })
                    .on('mouseout',function(split_val){
                       var rect = d3.select(this).select('.split_line');
                      d3.selectAll('.split_line').style('stroke-opacity',1).style('fill-opacity',1);
                      d3.selectAll('.data_point').attr('d',symbolFunction(0));
                    });


                  splits.append('rect')
                  .attr('class','split_bubble')
                  .attr('x',function(d,i) { return splitxscale(i)-10;})
                    .attr('width', 20)
                    .attr('y',0)
                    .attr('height',h())
                    .style('stroke','white')
                    .style('stroke-opacity','1')
                    .style('stroke-width',2.0)
                    .style('fill','white')
                    .style('fill-opacity','1');
                   

                  splits.append('line')
                    .attr('class','split_line')
                    .attr('x1',function(d,i) { return splitxscale(i);})
                    .attr('x2',function(d,i) { return splitxscale(i);})
                    .attr('y1',0)
                    .attr('y2',h())
                    .style('stroke-dasharray','9, 5')
                    .style('stroke',splitColorscale)
                    .style('stroke-width',2.0)
                    .style('fill',splitColorscale);
                    
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
    xscale = __.xDataType === "ordinal" ?
                     d3.scale.ordinal().domain(__.data.x).rangeRoundBands([0,w()],0) :
                     d3.scale.linear().domain(d3.extent(__.data.x)).range([0,w()]);
   
    yscale = __.yDataType === "ordinal" ?
                    d3.scale.ordinal().domain(__.data.y).rangeRoundBands([h(),0],0) :
                    d3.scale.linear().domain(d3.extent(__.data.y)).range([h(),0]);

    var numberOfCategories = _.uniq(__.data[__.colorLabel]).length;
    var colorArray = _.first(__.pointColors,numberOfCategories);

    categoryLabelScale = d3.scale.ordinal().domain(__.data[__.colorLabel]).range(colorArray);
    caseSplitsOpacityscale = d3.scale.linear().domain(d3.extent(__.data['splits_on_x'])).range([0.2,0.9]);
    
    return setAxes();
  }

  function parseSplits() {
    if (__.splits === null) {split_array = undefined; return;}
    split_array = __.splits.bins;
    if(split_array.length < 1 || split_array[0] === undefined || split_array[0].length < 1) {
      console.error('invalid split bins');
      return;
    }
    split_bin_number = split_array.length;
    split_bin_start = __.splits.low+(.5*__.splits.binsize);
    split_bin_end = split_bin_start + ((split_bin_number-1)*__.splits.binsize);

    return setSplitScales();

  }

  function setSplitScales() {
    splitOpacityscale = d3.scale.linear().domain(d3.extent(split_array)).range([0.3,0.9]);
    splitColorscale = d3.scale.linear().domain(d3.extent(split_array)).range(['#FFEDA0','#F03B20']);

    splitxscale = d3.scale.linear().domain([0,split_bin_number-1]).range([xscale(split_bin_start), xscale(split_bin_end)]);

    return splitiscope;
  }

  function setAxes() {
    
    yaxis.scale(yscale);
    xaxis.scale(xscale);

    return splitiscope;
  }

  return splitiscope;
};

});