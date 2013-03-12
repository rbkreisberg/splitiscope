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
      outerWidth = function() { return __.width - __.margin.right - __.margin.left },
      outerHeight = function() { return __.height - __.margin.top - __.margin.bottom },
      plotWidth = function() { return outerWidth() - padding.right - padding.left},
      plotHeight = function() { return outerHeight() - padding.top - padding.bottom },
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
      selected = null,
      padding = { top: 24, bottom: 4, left: 4, right: 4 },
      split_array = undefined,
      shapes = ['circle','cross','diamond','square','triangle-down','triangle-up'],
      symbolSize = Math.pow(__.radius,2),
      symbol = d3.svg.symbol().size(symbolSize).type(shapes[0]),
      symbolMap = d3.scale.ordinal().domain([0,5]).range(shapes),
      symbolFunction = _.compose(symbol.type, symbolMap),
      data_array = [],
      yaxis = d3.svg.axis().orient("right").ticks(5).tickSize(-1*plotWidth(),4,4),
      xaxis = d3.svg.axis().orient("bottom").ticks(5),
      bottom_surface, split_surface, data_surface; // groups for axes, brushes

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
                    .attr("width", outerWidth())
                    .attr("height", outerHeight());

    splitiscope.svg.select("defs")
                .append("svg:marker")
                .attr("id", 'arrow_end')
                .attr("viewBox", "0 0 10 10")
                .attr("refX", 0)
                .attr("refY", 5)
                .attr("markerUnits",'strokeWidth')
                .attr("markerWidth", 4)
                .attr("markerHeight", 3)
                .attr("orient", "auto")
              .append("svg:path")
                .attr("d", "M0,0L10,5L0,10z");

    var plot_offset = splitiscope.svg.append('g')
                        .attr('transform','translate('+__.margin.left+','+ __.margin.top+')');
                       
    bottom_surface = plot_offset.append('g')
                  .attr('transform','translate(' + padding.left + ',' + padding.top + ')');

    var top_surface = plot_offset.append('g')
                  .attr('clip-path','url(#plot_clip)');

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
    .attr('transform','translate('+ (plotWidth()) +',0)')
    .attr('class','y axis')
    .call(yaxis);

    bottom_surface.append('g')
    .attr('transform','translate(0,' + (plotHeight()) +')')
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
              .attr('height',plotHeight())
              .attr('width',plotWidth())
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
                   .on('click', function(split_val,i) {
                          if (selected === i) {
                            selected = null;
                            clearSplitSelection();
                            return;
                          }
                          selected = i;
                          makeSplitSelection(this,selected);
                          console.log('click');
                          return;
                       })
                   .on('mouseover',function(split_val,i){
                      if (selected === null) makeSplitSelection(this,i);
                    })
                    .on('mouseout',function(split_val){
                      if (selected === null) clearSplitSelection();
                    });

                  splits.append('rect')
                  .attr('class','split_bubble')
                  .attr('x',function(d,i) { return splitxscale(i)-10;})
                    .attr('width', 20)
                    .attr('y',-1 * padding.top)
                    .attr('height',padding.top +10)
                    .style('stroke',splitColorscale)
                    .style('stroke-opacity','1')
                    .style('stroke-width',0.5)
                    .style('fill','transparent')
                    .style('fill-opacity','1');

          var split_line = splits.append('g')
                    .attr('class','split_line')
                    .attr('transform',function(d,i) { return 'translate('+splitxscale(i)+','+0+')';});
                    
                  split_line 
                    .append('path')
                    .attr('d',function(d,i) {
                      return "M" + 0 + ",-" +padding.top + "v"+ padding.top;
                      })
                    .style('stroke',splitColorscale)
                    .style('stroke-width',4.0)
                    .style('fill',splitColorscale);

                    split_line.append("path")
                         .style('stroke',splitColorscale)
                      .style('stroke-width',4.0)
                    .style('fill',splitColorscale)
                      .attr("d", "M5,0L-5,0L0,5z");
  
  }

  function makeSplitSelection(el,index){
       var split = d3.select(el).selectAll('.split_line, .split_bubble');
                      d3.selectAll('.split_line, .split_bubble').style('stroke-opacity',0).style('fill-opacity',0);
                      split.style('stroke-opacity',1).style('fill-opacity',1);

                      d3.selectAll('.data_point')
                        .filter(function(point) { return xscale(point.x) < splitxscale(index); })
                        .attr('d',symbolFunction(0));

                      d3.selectAll('.data_point')
                        .filter(function(point) { return xscale(point.x) >= splitxscale(index); })
                        .attr('d',symbolFunction(1));

  }

  function clearSplitSelection(){
                      d3.selectAll('.split_line, .split_bubble').style('stroke-opacity',1).style('fill-opacity',1);
                      d3.selectAll('.data_point').attr('d',symbolFunction(0));
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
                     d3.scale.ordinal().domain(__.data.x).rangeRoundBands([10,plotWidth()-10],0) :
                     d3.scale.linear().domain(d3.extent(__.data.x)).range([10,plotWidth()-10]);
   
    yscale = __.yDataType === "ordinal" ?
                    d3.scale.ordinal().domain(__.data.y).rangeRoundBands([plotHeight()-10,10],0) :
                    d3.scale.linear().domain(d3.extent(__.data.y)).range([plotHeight()-10,10]);

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
    
    yaxis.scale(yscale).tickSize(-1*plotWidth()).ticks(5);
    xaxis.scale(xscale).tickSize(2).ticks(5);

    return splitiscope;
  }

  return splitiscope;
};

});