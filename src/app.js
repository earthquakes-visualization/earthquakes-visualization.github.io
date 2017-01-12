// TODO SRC: http://bl.ocks.org/jasondavies/4188334

const width = 960;
const height = 600;

var projection = d3.geoMercator(),
    color = d3.scaleOrdinal(d3.schemeCategory20),
    graticule = d3.geoGraticule();

var path = d3.geoPath()
    .projection(projection);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

svg.append("path")
    .datum(graticule)
    .attr("class", "graticule")
    .attr("d", path);

svg.append("path")
    .datum(graticule.outline)
    .attr("class", "graticule outline")
    .attr("d", path);

d3.json("worldmap.json", function(error, world) {
  var countries = topojson.feature(world, world.objects.countries).features,
      neighbors = topojson.neighbors(world.objects.countries.geometries);

  svg.selectAll(".country")
      .data(countries)
    .enter().insert("path", ".graticule")
      .attr("class", "country")
      .attr("d", path)
      // .style("fill", function(d, i) { return color(d.color = d3.max(neighbors[i], function(n) { return countries[n].color; }) + 1 | 0); });
      .style("fill", function(d, i) { return color(Math.random(7)) });
});


// d3.csv('quakes.csv', (error, data) => {
//   if (error) {
//     console.error("Can't load data");
//   } else {
//     update2(data);
//   }
// });

// const svg = d3.select('body').append('svg')
//   .attr('width', width+margin.left+margin.right)
//   .attr('height', height+margin.top+margin.bottom);

// // Group used to enforce margin
// const g = svg.append('g')
//   .attr('transform', `translate(${margin.left},${margin.top})`);

// function update2(data) {
//   console.log("data loaded, length: " + data.length);
//   console.log(data);

//   const rect = g.selectAll('rect').data(data);

//   const rect_enter = rect.enter()
//     .append('rect')
//     .attr('width', 50);

//   rect.merge(rect_enter)
//     .attr('height', 50)
//     .attr('y', (d,i) => i*(50+5));

//   rect.exit().remove();
// }

/*
// -- Example Code --
const margin = {top: 40, bottom: 10, left: 120, right: 20};
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Creates sources <svg> element
const svg = d3.select('body').append('svg')
.attr('width', width+margin.left+margin.right)
.attr('height', height+margin.top+margin.bottom);

// Group used to enforce margin
const g = svg.append('g')
.attr('transform', `translate(${margin.left},${margin.top})`);

// Global variable for all data
var data;

// Scales setup
const xscale = d3.scaleLinear().range([0, width]);
const yscale = d3.scaleBand().rangeRound([0, height]).paddingInner(0.1);

// Axis setup
const xaxis = d3.axisTop().scale(xscale);
const g_xaxis = g.append('g').attr('class','x axis');
const yaxis = d3.axisLeft().scale(yscale);
const g_yaxis = g.append('g').attr('class','y axis');

/////////////////////////
// TODO use animated transtion between filtering changes

d3.json('https://rawgit.com/sgratzl/d3tutorial/master/examples/weather.json', (error, json) => {
  data = json;

  update(data);
});

function update(new_data) {
  //update the scales
  xscale.domain([0, d3.max(new_data, (d) => d.temperature)]);
  yscale.domain(new_data.map((d) => d.location.city));
  //render the axis
  g_xaxis.call(xaxis);
  g_yaxis.call(yaxis);


  // Render the chart with new data

  // DATA JOIN use the key argument for ensurign that the same DOM element is bound to the same data-item
  const rect = g.selectAll('rect').data(new_data, (d) => d.location.city); // das "Key Agrgument" ist ganz wichtig, damit DOM-Elemente 1:1 auf Daten gemappt werden.

  // ENTER
  // new elements
  const rect_enter = rect.enter().append('rect')
  .attr('x', 0)
  rect_enter.append('title');

  // ENTER + UPDATE
  // both old and new elements
  rect.merge(rect_enter)
    .transition()
    .attr('height', yscale.bandwidth())
    .attr('width', (d) => xscale(d.temperature))
    .attr('y', (d) => yscale(d.location.city));

  rect.merge(rect_enter).select('title').text((d) => d.location.city);

  // EXIT
  // elements that aren't associated with data
  rect.exit().remove();

}

//interactivity
d3.select('#filter-us-only').on('change', function() {
  // This will be triggered when the user selects or unselects the checkbox
  const checked = d3.select(this).property('checked');
  if (checked === true) {
    // Checkbox was just checked

    // Keep only data element whose country is US
    const filtered_data = data.filter((d) => d.location.country === 'US');

    update(filtered_data);  // Update the chart with the filtered data
  } else {
    // Checkbox was just unchecked
    update(data);  // Update the chart with all the data we have
  }
});*/