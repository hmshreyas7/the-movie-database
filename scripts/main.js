// set up SVG
var svg = d3.select('body').append('svg')
    .attr('width', window.innerWidth)
    .attr('height', 1200);
    margin = 20,
    diameter = 800,
    g = svg.append('g')
    .attr('transform', 'translate(' + window.innerWidth / 2 + ',' + window.innerWidth / 2.25 + ')');

function primaryView() {
  // load the data
  d3.json('tmdb_movies_top20.json').then(data => {
    // store all genres in an array
    var genres = [];
    data.children.forEach(genre => {
      genres.push(genre.name);
    })
    
    // custom color scale for genres
    var color = d3.scaleOrdinal()
        .domain(genres)
        .range(['#ff3030', '#0fff77', '#0fff77', '#00d4ff', '#9b512e', '#ff117c', '#9b512e', '#ff5c1c', '#ff5c1c',
                '#ffff00', '#ff117c', '#ff3030', '#00d4ff', '#ffffff', '#ffffff', '#ffff00']); // to fix

    // configuration of pack layout
    var pack = d3.pack()
    .size([diameter - margin, diameter - margin])
    .padding(5);

    // construct root node for hierarchy
    root = d3.hierarchy(data)
    .sum(d => d.size)
    .sort((a, b) => b.value - a.value);

    // declare variables for zooming and array of all nodes
    var focus = root,
        nodes = pack(root).descendants(),
        view;

    // create circles for nodes with zooming on click
    var circle = g.selectAll('circle')
        .data(nodes)
        .enter()
        .append('circle')
        .attr('fill', d => {
          if(d.parent == null) {
            return 'none';
          } else if(d.children == null) {
            return color(d.parent.data.name);
          } else {
            return color(d.data.name);
          }
        })
        .attr('opacity', 0.7)
        .on('click', d => {
          if(d3.event.shiftKey) {
            if(d.parent == null) {
              // do nothing
            } else {
              svg.selectAll('g')
              .remove();

              var genre = '';
              if(d.children == null) {
                genre = d.parent.data.name;
              } else {
                genre = d.data.name;
              }

              d3.select("h2")
              .text(genre)

              var html_string = `Hover over any bubble to view movie title, revenue information and similar movies<br/>
              Bubble size => Revenue<br/>
              Scroll to zoom in/out<br/>
              Drag screen for moving the network around<br/>
              Tip: You can use the scroll bar in your browser when dragging is not convenient<br/>
              Click a bubble to view specific information about a movie`

              d3.select("p")
              .html(html_string);

              window.scrollTo(top);
              secondaryView(genre, color(genre));
            }
          } else {
            if(focus !== d) {
              zoom(d),
              d3.event.stopPropagation();
            }
          }
        });

    // add title to display info on hover
    circle.append('title')
    .text(function(d) {
      return 'Revenue: $' + d.value.toLocaleString();
    });

    // create text for each node
    var text = g.selectAll('text')
        .data(nodes)
        .enter()
        .append('text')
        .attr('class', 'genre-text')
        .attr('dy', '0.2em')
        .attr('fill-opacity', d => { return d.parent === root ? 1 : 0; })
        .style('display', d => { return d.parent === root ? 'inline' : 'none'; })
        .text(d => d.data.name);

    // select circle and text for each node
    var node = g.selectAll('circle,text');

    // revert to default view for random click on SVG
    svg.on('click', () => zoom(root));

    // default zoom
    zoomTo([root.x, root.y, root.r * 1.5]);

    // function for shifting focus to the node to be zoomed and adding transition effects
    function zoom(d) {
      if(d.children == null) {
        d = d.parent;
      }
      var focus0 = focus; 
      focus = d;

      // define transition
      var transition = d3.transition()
          .duration(750)
          .tween('zoom', () => {
            var i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 1.5]);
            return function(t) { zoomTo(i(t)); };
          });

      // define behavior of text on transition
      transition.selectAll('text')
      .filter(function(d) { return d.parent === focus || this.style.display === 'inline'; })
      .style('fill-opacity', function(d) { return d.parent === focus ? 1 : 0; })
      .style('font-size', function(d) { return d.children == null ? '9px' : '12px'; })
      .on('start', function(d) { if (d.parent === focus) { this.style.display = 'inline';} })
      .on('end', function(d) { if (d.parent !== focus) this.style.display = 'none'; });
    }

    // function for zooming to specific node
    function zoomTo(v) {
      var k = diameter / v[2];
      view = v;

      // move to node and resize it
      node.attr('transform', d => { return 'translate(' + (d.x - v[0]) * k + ',' + (d.y - v[1]) * k + ')'; });
      circle.attr('r', d => d.r * k);
    }
  });
}

function keywordMatch(a, b) {
  var map = {};
  var count = 0;
  a.forEach(keyword => {
    map[keyword] = 0;
  });
  b.forEach(keyword => {
    if(map[keyword] == 0) {
      count++;
    }
  });
  return count;
}

function secondaryView(genre, color) {
  var file = './data/' + genre + '.json';

  d3.json(file).then(data => {
    var container = svg.append("g");
    
    svg.call(
      d3.zoom()
        .scaleExtent([.1, 6])
        .on("zoom", function() { container.attr("transform", d3.event.transform); })
    );

    var simulation = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links).id(d => d.name).distance(50).strength(1))
        .force("charge", d3.forceManyBody().strength(-3000))
        .force("x", d3.forceX((diameter + 500) / 2).strength(1))
        .force("y", d3.forceY(diameter / 2).strength(1))
        .on("tick", ticked);

    var adjlist = [];
    
    data.links.forEach(function(d) {
      adjlist[d.source.index + "-" + d.target.index] = true;
      adjlist[d.target.index + "-" + d.source.index] = true;
    });
    
    function neigh(a, b) {
      return a == b || adjlist[a + "-" + b];
    }

    var link = container.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(data.links)
        .enter()
        .append("line")
        .attr("stroke-width", function(d) { return Math.sqrt(d.value); });

    var node = container.append("g")
    .attr("class", "nodes")
    .selectAll("g")
    .data(data.nodes)
    .enter()
    .append("g");
      
    var circles = node.append("circle")
        .attr("r", d => d.size / 100000000)
        .attr("fill", color)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    circles.on("mouseover", focus).on("mouseout", unfocus);

    circles.on("click", d => {
      d3.selectAll("h2, br, p, svg")
      .remove();

      window.scrollTo(top);
      thirdView(d.name, d.user_rating, d.votes, d.release_year, d.overview, d.runtime, d.keywords);
    });

    var labels = node
        .append("text")
        .attr("fill", "white")
        .attr("class", "label")
        .text(function(d) {
          return d.name;
        })
        .attr('x', 6)
        .attr('y', 3);

    node
        .append("title")
        .text(function(d) { return d.name + "\nRevenue: $" + d.size.toLocaleString(); });

    function ticked() {
      link
          .attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

      node
          .attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
          })
    }

    function focus() {
      var index = d3.select(d3.event.target).datum().index;
      circles.style("opacity", function(o) {
        return neigh(index, o.index) ? 1 : 0.1;
      });
      labels.style("opacity", function(o) {
        return neigh(index, o.index) ? 1 : 0.1;
      });
      link.style("opacity", function(o) {
        return o.source.index == index || o.target.index == index ? 1 : 0.1;
      });
    }
    
    function unfocus() {
      circles.style("opacity", 1);
      labels.style("opacity", 1);
      link.style("opacity", 1);
    }

    function dragstarted(d) {
      if (!d3.event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function dragended(d) {
      if (!d3.event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  });
}

function thirdView(name, user_rating, votes, release_year, overview, runtime, keywords) {
  var hours = Math.floor(runtime / 60);
  var minutes = runtime % 60;
  var title = `<h1>${name} (${release_year}) | ${hours}h ${minutes}min</h1>`;
  var horizontal_row = `<hr style = 'border-color: white' />`;
  var width = window.innerWidth - 100;
  var height = 450;
  var user_rating_gauge = `<svg id='fill-gauge' width='${width}' height='${height}'></svg>`;

  var html_string = title + horizontal_row + user_rating_gauge;
  d3.select("body")
  .append("div")
  .style("color", "white")
  .attr("class", "movie-info")
  .html(html_string);

  var gauge_color;
  if(user_rating < 5) {
    gauge_color = "red";
  } else if(user_rating >= 5 && user_rating < 7) {
    gauge_color = "yellow";
  } else {
    gauge_color = "green";
  }
  var config = liquidFillGaugeDefaultSettings();
  config.circleColor = gauge_color;
  config.textColor = gauge_color;
  config.waveTextColor = "black";
  config.waveColor = gauge_color;
  config.waveAnimateTime = 1000;
  var gauge = loadLiquidFillGauge("fill-gauge", user_rating * 10, config);

  var svg = d3.select("svg");
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 385)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .text("User Score");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 415)
    .attr("text-anchor", "middle")
    .attr("fill", "white")
    .text(`[based on ${votes.toLocaleString()} votes]`);

  svg.append("rect")
    .attr("x", width / 1.35)
    .attr("y", 70)
    .attr("width", 40)
    .attr("height", 20)
    .attr("fill", "green");

  svg.append("text")
    .attr("x", width / 1.25)
    .attr("y", 85)
    .attr("fill", "white")
    .text(">= 70%")

  svg.append("rect")
    .attr("x", width / 1.35)
    .attr("y", 110)
    .attr("width", 40)
    .attr("height", 20)
    .attr("fill", "yellow");

  svg.append("text")
    .attr("x", width / 1.25)
    .attr("y", 125)
    .attr("fill", "white")
    .text("50-69%")

  svg.append("rect")
    .attr("x", width / 1.35)
    .attr("y", 150)
    .attr("width", 40)
    .attr("height", 20)
    .attr("fill", "red");

  svg.append("text")
    .attr("x", width / 1.25)
    .attr("y", 165)
    .attr("fill", "white")
    .text("< 50%")

  d3.select("div")
    .append("h2")
    .text("Keywords");
  
  d3.select("div")
    .append("hr")
    .style("border-color", "white");

  d3.select("div")
    .selectAll("div")
    .data(keywords)
    .enter()
    .append("div")
    .attr("class", "keyword")
    .text(d => d);

  d3.select("div")
    .append("h2")
    .style("margin-top", "50px")
    .text("Overview");
  
  d3.select("div")
    .append("hr")
    .style("border-color", "white");

  d3.select("div")
    .append("p")
    .style("margin-bottom", "50px")
    .style("text-align", "justify")
    .text(overview);
}

function liquidFillGaugeDefaultSettings(){
  return {
      minValue: 0, // The gauge minimum value.
      maxValue: 100, // The gauge maximum value.
      circleThickness: 0.05, // The outer circle thickness as a percentage of it's radius.
      circleFillGap: 0.05, // The size of the gap between the outer circle and wave circle as a percentage of the outer circles radius.
      circleColor: "#178BCA", // The color of the outer circle.
      waveHeight: 0.05, // The wave height as a percentage of the radius of the wave circle.
      waveCount: 1, // The number of full waves per width of the wave circle.
      waveRiseTime: 1000, // The amount of time in milliseconds for the wave to rise from 0 to it's final height.
      waveAnimateTime: 18000, // The amount of time in milliseconds for a full wave to enter the wave circle.
      waveRise: true, // Control if the wave should rise from 0 to it's full height, or start at it's full height.
      waveHeightScaling: true, // Controls wave size scaling at low and high fill percentages. When true, wave height reaches it's maximum at 50% fill, and minimum at 0% and 100% fill. This helps to prevent the wave from making the wave circle from appear totally full or empty when near it's minimum or maximum fill.
      waveAnimate: true, // Controls if the wave scrolls or is static.
      waveColor: "#178BCA", // The color of the fill wave.
      waveOffset: 0, // The amount to initially offset the wave. 0 = no offset. 1 = offset of one full wave.
      textVertPosition: .5, // The height at which to display the percentage text withing the wave circle. 0 = bottom, 1 = top.
      textSize: 1, // The relative height of the text to display in the wave circle. 1 = 50%
      valueCountUp: false, // If true, the displayed value counts up from 0 to it's final value upon loading. If false, the final value is displayed.
      displayPercent: true, // If true, a % symbol is displayed after the value.
      textColor: "#045681", // The color of the value text when the wave does not overlap it.
      waveTextColor: "#A4DBf8" // The color of the value text when the wave overlaps it.
  };
}

function loadLiquidFillGauge(elementId, value, config) {
  if(config == null)
    config = liquidFillGaugeDefaultSettings();

  var gauge = d3.select("#" + elementId);
  var radius = Math.min(parseInt(gauge.style("width")), parseInt(gauge.style("height")) - 150) / 2;
  var locationX = parseInt(gauge.style("width")) / 2 - radius;
  var locationY = (parseInt(gauge.style("height")) - 50) / 2 - radius;
  var fillPercent = Math.max(config.minValue, Math.min(config.maxValue, value)) / config.maxValue;

  var waveHeightScale;
  if(config.waveHeightScaling) {
      waveHeightScale = d3.scaleLinear()
          .range([0, config.waveHeight, 0])
          .domain([0, 50, 100]);
  } else {
      waveHeightScale = d3.scaleLinear()
          .range([config.waveHeight, config.waveHeight])
          .domain([0, 100]);
  }

  var textPixels = (config.textSize * radius / 2);
  var textFinalValue = value;
  var textStartValue = config.valueCountUp ? config.minValue : textFinalValue;
  var percentText = config.displayPercent ? "%" : "";
  var circleThickness = config.circleThickness * radius;
  var circleFillGap = config.circleFillGap * radius;
  var fillCircleMargin = circleThickness + circleFillGap;
  var fillCircleRadius = radius - fillCircleMargin;
  var waveHeight = fillCircleRadius * waveHeightScale(fillPercent * 100);

  var waveLength = fillCircleRadius * 2 / config.waveCount;
  var waveClipCount = 1 + config.waveCount;
  var waveClipWidth = waveLength * waveClipCount;

  // Data for building the clip wave area.
  var data = [];
  for(var i = 0; i <= 40 * waveClipCount; i++){
      data.push({x: i / (40 * waveClipCount), y: (i / (40))});
  }

  // Scales for drawing the outer circle.
  var gaugeCircleX = d3.scaleLinear().range([0, 2 * Math.PI]).domain([0, 1]);
  var gaugeCircleY = d3.scaleLinear().range([0, radius]).domain([0, radius]);

  // Scales for controlling the size of the clipping path.
  var waveScaleX = d3.scaleLinear().range([0, waveClipWidth]).domain([0, 1]);
  var waveScaleY = d3.scaleLinear().range([0, waveHeight]).domain([0, 1]);

  // Scales for controlling the position of the clipping path.
  var waveRiseScale = d3.scaleLinear()
      // The clipping area size is the height of the fill circle + the wave height, so we position the clip wave
      // such that the it will overlap the fill circle at all when at 0%, and will totally cover the fill
      // circle at 100%.
      .range([(fillCircleMargin + fillCircleRadius * 2 + waveHeight), (fillCircleMargin - waveHeight)])
      .domain([0, 1]);
  var waveAnimateScale = d3.scaleLinear()
      .range([0, waveClipWidth - fillCircleRadius * 2]) // Push the clip area one full wave then snap back.
      .domain([0, 1]);

  // Scale for controlling the position of the text within the gauge.
  var textRiseScaleY = d3.scaleLinear()
      .range([fillCircleMargin + fillCircleRadius * 2, (fillCircleMargin + textPixels * 0.7)])
      .domain([0, 1]);

  // Center the gauge within the parent SVG.
  var gaugeGroup = gauge.append("g")
      .attr('transform', 'translate(' + locationX + ',' + locationY + ')');

  // Draw the outer circle.
  var gaugeCircleArc = d3.arc()
      .startAngle(gaugeCircleX(0))
      .endAngle(gaugeCircleX(1))
      .outerRadius(gaugeCircleY(radius))
      .innerRadius(gaugeCircleY(radius - circleThickness));
  gaugeGroup.append("path")
      .attr("d", gaugeCircleArc)
      .style("fill", config.circleColor)
      .attr('transform', 'translate(' + radius + ',' + radius + ')');
      
  // Text where the wave does not overlap.
  var text1 = gaugeGroup.append("text")
      .text(textStartValue + percentText)
      .attr("class", "liquidFillGaugeText")
      .attr("text-anchor", "middle")
      .attr("font-size", textPixels + "px")
      .style("fill", config.textColor)
      .attr('transform', 'translate(' + radius + ',' + textRiseScaleY(config.textVertPosition) + ')');

  // The clipping wave area.
  var clipArea = d3.area()
      .x(function(d) { return waveScaleX(d.x); })
      .y0(function(d) { return waveScaleY(Math.sin(Math.PI * 2 * config.waveOffset * (-1) + Math.PI * 2 * (1 - config.waveCount) + d.y * 2 * Math.PI));})
      .y1(function() { return (fillCircleRadius * 2 + waveHeight); });
  var waveGroup = gaugeGroup.append("defs")
      .append("clipPath")
      .attr("id", "clipWave" + elementId);
  var wave = waveGroup.append("path")
      .datum(data)
      .attr("d", clipArea)
      .attr("T", 0);

  // The inner circle with the clipping wave attached.
  var fillCircleGroup = gaugeGroup.append("g")
      .attr("clip-path", "url(#clipWave" + elementId + ")");

  fillCircleGroup.append("circle")
      .attr("cx", radius)
      .attr("cy", radius)
      .attr("r", fillCircleRadius)
      .style("fill", config.waveColor);

  // Text where the wave does overlap.
  var text2 = fillCircleGroup.append("text")
      .text(textStartValue + percentText)
      .attr("class", "liquidFillGaugeText")
      .attr("text-anchor", "middle")
      .attr("font-size", textPixels + "px")
      .style("fill", config.waveTextColor)
      .attr('transform', 'translate(' + radius + ',' + textRiseScaleY(config.textVertPosition) + ')');

  // Make the value count up.
  if(config.valueCountUp) {
      var textTween = function() {
          var self = d3.select(this);
          var i = d3.interpolate(0, textFinalValue);
          return function(t) { self.text(i(t) + percentText); }
      };
      text1.transition()
          .duration(config.waveRiseTime)
          .tween("text", textTween);
      text2.transition()
          .duration(config.waveRiseTime)
          .tween("text", textTween);
  }

  // Make the wave rise. wave and waveGroup are separate so that horizontal and vertical movement can be controlled independently.
  var waveGroupXPosition = fillCircleMargin + fillCircleRadius * 2 - waveClipWidth;
  if(config.waveRise) {
      waveGroup.attr('transform', 'translate(' + waveGroupXPosition + ', ' + waveRiseScale(0) + ')')
          .transition()
          .duration(config.waveRiseTime)
          .attr('transform', 'translate(' + waveGroupXPosition + ', ' + waveRiseScale(fillPercent) + ')')
          .on("start", function() { wave.attr('transform','translate(1, 0)'); }); // This transform is necessary to get the clip wave positioned correctly when waveRise=true and waveAnimate=false. The wave will not position correctly without this, but it's not clear why this is actually necessary.
  } else {
      waveGroup.attr('transform', 'translate(' + waveGroupXPosition + ',' + waveRiseScale(fillPercent) + ')');
  }

  if(config.waveAnimate) animateWave();

  function animateWave() {
      wave.attr('transform', 'translate(' + waveAnimateScale(wave.attr('T')) + ',0)');
      wave.transition()
          .duration(config.waveAnimateTime * (1 - wave.attr('T')))
          .ease(d3.easeLinear)
          .attr('transform', 'translate(' + waveAnimateScale(1) + ',0)')
          .attr('T', 1)
          .on('end', function() {
              wave.attr('T', 0);
              animateWave(config.waveAnimate);
          });
  }

  class GaugeUpdater {
    constructor() {
      this.update = function (value) {
        var textTween = function () {
          var self = d3.select(this);
          var i = d3.interpolate(0, value);
          return function (t) { self.text(i(t) + percentText); };
        };
        text1.transition()
          .duration(config.waveRiseTime)
          .tween("text", textTween);
        text2.transition()
          .duration(config.waveRiseTime)
          .tween("text", textTween);
        var fillPercent = Math.max(config.minValue, Math.min(config.maxValue, value)) / config.maxValue;
        var waveHeight = fillCircleRadius * waveHeightScale(fillPercent * 100);
        var waveRiseScale = d3.scaleLinear()
          // The clipping area size is the height of the fill circle + the wave height, so we position the clip wave
          // such that the it will overlap the fill circle at all when at 0%, and will totally cover the fill
          // circle at 100%.
          .range([(fillCircleMargin + fillCircleRadius * 2 + waveHeight), (fillCircleMargin - waveHeight)])
          .domain([0, 1]);
        var newHeight = waveRiseScale(fillPercent);
        var waveScaleX = d3.scaleLinear().range([0, waveClipWidth]).domain([0, 1]);
        var waveScaleY = d3.scaleLinear().range([0, waveHeight]).domain([0, 1]);
        var newClipArea;
        if (config.waveHeightScaling) {
          newClipArea = d3.area()
            .x(function (d) { return waveScaleX(d.x); })
            .y0(function (d) { return waveScaleY(Math.sin(Math.PI * 2 * config.waveOffset * (-1) + Math.PI * 2 * (1 - config.waveCount) + d.y * 2 * Math.PI)); })
            .y1(function () { return (fillCircleRadius * 2 + waveHeight); });
        }
        else {
          newClipArea = clipArea;
        }
        var newWavePosition = config.waveAnimate ? waveAnimateScale(1) : 0;
        wave.transition()
          .duration(0)
          .transition()
          .duration(config.waveAnimate ? (config.waveAnimateTime * (1 - wave.attr('T'))) : (config.waveRiseTime))
          .ease(d3.easeLinear)
          .attr('d', newClipArea)
          .attr('transform', 'translate(' + newWavePosition + ',0)')
          .attr('T', '1')
          .on("end", function() {
              if(config.waveAnimate) {
                  wave.attr('transform', 'translate(' + waveAnimateScale(0) + ',0)');
                  animateWave();
              }
          });
        waveGroup.transition()
          .duration(config.waveRiseTime)
          .attr('transform', 'translate(' + waveGroupXPosition + ',' + newHeight + ')');
      };
    }
  }

  return new GaugeUpdater();
}

primaryView();