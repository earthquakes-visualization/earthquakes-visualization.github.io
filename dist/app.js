'use strict';

d3.csv('quakes.csv', function (error, data) {
  if (error) {
    console.error("Can't load data");
  } else {
    update2(data);
  }
});

var svg = d3.select('body').append('svg').attr('width', width + margin.left + margin.right).attr('height', height + margin.top + margin.bottom);

// Group used to enforce margin
var g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

function update2(data) {
  console.log("data loaded, length: " + data.length);
  console.log(data);

  var rect = g.selectAll('rect').data(data);

  var rect_enter = rect.enter().append('rect').attr('width', 50);

  rect.merge(rect_enter).attr('height', 50).attr('y', function (d, i) {
    return i * (50 + 5);
  });

  rect.exit().remove();
}

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