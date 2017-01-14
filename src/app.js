// import {country_reverse_geocoding} from 'country-reverse-geocoding';
const crg = require('country-reverse-geocoding').country_reverse_geocoding();

// TODO SRC: http://bl.ocks.org/jasondavies/4188334
const margin = {top: 40, bottom: 10, left: 200, right: 20};
const widthMap = 960;
const heightMap = 600;

const projection = d3.geoMercator();

const path = d3.geoPath()
    .projection(projection);

const svgMap = d3.select("body").select(".map").append("svg")
  .attr("width", widthMap+margin.left+margin.right)
  .attr("height", heightMap+margin.top+margin.bottom);

// Group used to enforce margin
const gMap = svgMap.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

d3.json("worldmap.json", function(error, data) {
  if (error) {
    console.error("Can't load data: worldmap");
  } else {
    updateWorldMap(data);
  }
});

function loadEarthquakeData() {
  d3.csv("quakes.csv", (error, data) => {
    if (error) {
      console.error("Can't load data: earthquakes");
    } else {
      processEarthquakeData(data); // builds the map
      filterEarthquakeData();
      updateEarthquakeCircles(data);
      updateCountryBarChart(countryEarthquakeEntries);
    }
  });
}

let filteredMap;

function filterEarthquakeData() {
  filteredMap = d3.map(countryEarthquakeMap);

  const isInternationalWatersChecked = d3.select('#filter-show-water').property('checked');
  filterByInternationalWatersToggle(isInternationalWatersChecked);


  // updateMapCircleEntries();
  updateBarChartEntries();
}

function filterByInternationalWatersToggle(isInternationalWatersChecked) {
  
}

function updateBarChartEntries() {
  countryEarthquakeEntries = filteredMap.entries();
  countryEarthquakeEntries.sort((a, b) => b.value.length - a.value.length);
  countryEarthquakeEntries = countryEarthquakeEntries.slice(0, 10); // TODO auslagern
}

const countryEarthquakeMap = d3.map();
let countryEarthquakeEntries = [];

function processEarthquakeData(data) {
  // Map earthquakes to countries
  for (let earthquake of data) {
    const country = crg.get_country(Number(earthquake.latitude), Number(earthquake.longitude));
    let name;
    if (country) {
      name = country.name;
    } else {
      name = "International Waters";
    }
    earthquake.country = name;
    if (!countryEarthquakeMap.has(earthquake.country)) {
      countryEarthquakeMap.set(earthquake.country, []);
    }
    countryEarthquakeMap.get(earthquake.country).push(earthquake);
  }
}

function updateWorldMap(data) {
  const countries_geojson = topojson.feature(data, data.objects.countries).features;  // TODO what is this?

  const countries = gMap.selectAll(".country").data(countries_geojson);
  
  const countries_enter = countries.enter()
    .append("path")
    .attr("class", "country")
    .attr("d", path);
  
  loadEarthquakeData(); // TODO beautify: don't use a function here
}

function updateEarthquakeCircles(data) {
  const circle = gMap.selectAll("circle").data(data);

  const circle_enter = circle.enter()
    .append("circle")
    .attr("fill", "rgba(255, 0, 0, 0.3)")
    .on("click", onEarthquakeCircleClick);
  circle_enter
    .append("title");

  circle.merge(circle_enter)
    .attr("cx", d => projection([d.longitude, d.latitude])[0] )
    .attr("cy", d => projection([d.longitude, d.latitude])[1] )
    .attr("r", d => d.mag^2.5 );
  circle.merge(circle_enter)
    .select("title").text(d => `Time: ${d.time}\nMag.: ${d.mag}`);  // TODO format time

  circle.exit().remove();
}

function onEarthquakeCircleClick(earthquake) {
  if (countryEarthquakeEntries.length > 10) {
    countryEarthquakeEntries.pop();
  }

  countryEarthquakeEntries.forEach(element => element.selected = false);

  const isCountryInBarChart = countryEarthquakeEntries.map(entry => entry.key).includes(earthquake.country);
  const updatedCountryEarthquakeEntries = [];
  if (!isCountryInBarChart) { // add if not present yet
    const earthquakesOfCountry = filteredMap.get(earthquake.country);
    const entry = {
      key: earthquake.country,
      value: earthquakesOfCountry
    };
    countryEarthquakeEntries.push(entry);
  }

  countryEarthquakeEntries.find(element => element.key === earthquake.country).selected = true;

  updateCountryBarChart(countryEarthquakeEntries);
}

d3.select('#filter-show-water').on('change', function() {
  filterEarthquakeData();
});

const widthBarChart = 960;
const heightBarChart = 350;

const svgBarChart = d3.select("body").select(".bar-chart").append("svg")
  .attr("width", widthBarChart+margin.left+margin.right)
  .attr("height", heightBarChart+margin.top+margin.bottom);
  

// Group used to enforce margin
const gBarChart = svgBarChart.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const xScale = d3.scaleLinear().range([0, widthBarChart]); // TODO move to better position
const xAxis = d3.axisTop().scale(xScale);
const g_xAxis = gBarChart.append('g').attr('class','x axis');
const yScale = d3.scaleBand().rangeRound([0, heightBarChart]).paddingInner(0.1); // TODO move to better position
const yAxis = d3.axisLeft().scale(yScale);
const g_yAxis = gBarChart.append('g').attr('class','y axis');

function updateCountryBarChart(data) {
  const xMax = data[0].value.length;
  xScale.domain([0, xMax]);
  g_xAxis.call(xAxis);  // render x axis
  yScale.domain(data.map(entry => entry.key));
  g_yAxis.call(yAxis);

  let rect = gBarChart.selectAll('rect')
    .data(data);  // TODO: needed? , d => d

  const rect_enter = rect.enter()
    .append('rect')
    .attr('height', yScale.bandwidth());

  rect.merge(rect_enter)
    .attr('width', d => xScale(d.value.length))
    .attr('y', (d,i) => yScale(d.key))
    .attr('fill', d => {
      if (d.selected) {
        return "red";
      } else {
        return "steelblue";
      }
    });

  rect.exit().remove();
  // sortBars();

  // const xscale = d3.scaleLinear().range([0, width]);
  // const yscale = d3.scaleBand().rangeRound([0, height/2]).paddingInner(0.1);  // TODO height auslagern / trennen von mapHeight

  // //update the scales
  // xscale.domain([0, d3.max(countryEarthquakeMap, earthquakesOfCountry => earthquakesOfCountry.length)]);
  // yscale.domain(countryEarthquakeMap.keys());
  // //render the axis
  // g_xaxis.call(xaxis);
  // g_yaxis.call(yaxis);


  // // Render the chart with new data

  // // DATA JOIN use the key argument for ensurign that the same DOM element is bound to the same data-item
  // const rect = g.selectAll('rect').data(new_data, (d) => d.location.city); // das "Key Agrgument" ist ganz wichtig, damit DOM-Elemente 1:1 auf Daten gemappt werden.

  // // ENTER
  // // new elements
  // const rect_enter = rect.enter().append('rect')
  // .attr('x', 0)
  // rect_enter.append('title');

  // // ENTER + UPDATE
  // // both old and new elements
  // rect.merge(rect_enter)
  //   .transition()
  //   .attr('height', yscale.bandwidth())
  //   .attr('width', (d) => xscale(d.temperature))
  //   .attr('y', (d) => yscale(d.location.city));

  // rect.merge(rect_enter).select('title').text((d) => d.location.city);

  // // EXIT
  // // elements that aren't associated with data
  // rect.exit().remove();
}

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