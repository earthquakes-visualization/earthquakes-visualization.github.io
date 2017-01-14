const crg = require('country-reverse-geocoding').country_reverse_geocoding();
const $ = require("jquery");
require("ion-rangeslider");


// Map
const mapMargin = {top: 40, bottom: 10, left: 200, right: 20};
const mapWidth = 960;
const mapHeight = 600;

const projection = d3.geoMercator();

const path = d3.geoPath()
    .projection(projection);

const mapSvg = d3.select("body").select(".map").append("svg")
  .attr("width", mapWidth+mapMargin.left+mapMargin.right)
  .attr("height", mapHeight+mapMargin.top+mapMargin.bottom);
const mapGroup = mapSvg.append("g")
  .attr("transform", `translate(${mapMargin.left},${mapMargin.top})`);

// BarChart Styling
const barMargin = {top: 40, bottom: 10, left: 200, right: 20};
const barWidth = 960;
const barHeight = 350;

const barSvg = d3.select("body").select(".bar-chart").append("svg")
  .attr("width", barWidth+barMargin.left+barMargin.right)
  .attr("height", barHeight+barMargin.top+barMargin.bottom);
const barGroup = barSvg.append("g")
  .attr("transform", `translate(${barMargin.left},${barMargin.top})`);

// BarChart Scales & axis
const xScale = d3.scaleLinear().range([0, barWidth]);
const xAxis = d3.axisTop().scale(xScale);
const g_xAxis = barGroup.append('g').attr('class','x axis');
const yScale = d3.scaleBand().rangeRound([0, barHeight]).paddingInner(0.1);
const yAxis = d3.axisLeft().scale(yScale);
const g_yAxis = barGroup.append('g').attr('class','y axis');

// Global Data
const dataOriginal = d3.map();
let dataFiltered; // this is a d3.map
let barData = []; // this is drawn in the bar chart
let magFrom = 6, magTo = 11;  // TODO: dynamic

/* -- Logic -- */

// Main: Load data asynchronously
new Promise((resolve, reject) => {
    loadWorldMapData(resolve, reject);
  }).then(loadEarthquakeData);

d3.select('#filter-show-water').on('change', function() {
  updateDataFiltered();
});

function loadWorldMapData(resolve, reject) {
  d3.json("worldmap.json", function(error, data) {
    if (error) {
      console.error("Can't load data: worldmap");
    } else {
      initMap(data);
      resolve();
    }
  });
}

function loadEarthquakeData() {
  d3.csv("quakes.csv", (error, data) => {
    if (error) {
      console.error("Can't load data: earthquakes");
    } else {
      processDataOriginal(data);
      updateDataFiltered();
      updateEarthquakeCircles();
      updateBar();
    }
  });
}

function initMap(data) {
  const countries_geojson = topojson.feature(data, data.objects.countries).features;  // TODO what is this?

  const countries = mapGroup.selectAll(".country").data(countries_geojson);
  
  const countries_enter = countries.enter()
    .append("path")
    .attr("class", "country")
    .attr("d", path);
}


function updateDataFiltered() {
  dataFiltered = d3.map(dataOriginal);

  const isInternationalWatersChecked = d3.select('#filter-show-water').property('checked');
  filterByInternationalWatersToggle(isInternationalWatersChecked);
 
  filterByMagnitude();

  updateEarthquakeCircles();
  updateBarChartEntries();
  updateBar();
}

function filterByMagnitude() {
  for (let entry of dataFiltered.entries()) {
    dataFiltered.set(
      entry.key, 
      entry.value.filter(earthquake => earthquake.mag >= magFrom && earthquake.mag <= magTo)
    );  
  }
}

function filterByInternationalWatersToggle(isInternationalWatersChecked) {
  if (!isInternationalWatersChecked) {
    dataFiltered.remove("International Waters");
  }
}

function updateBarChartEntries() {
  barData = dataFiltered.entries();
  barData = barData.filter(entry => entry.value.length > 0);
  barData.sort((a, b) => b.value.length - a.value.length);
  barData = barData.slice(0, 10);
}

function processDataOriginal(data) {
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
    if (!dataOriginal.has(earthquake.country)) {
      dataOriginal.set(earthquake.country, []);
    }
    dataOriginal.get(earthquake.country).push(earthquake);
  }
}

function updateEarthquakeCircles() {
  const earthquakes = dataFiltered.values().reduce( (acc, cur) => acc.concat(cur), [] );
  const circle = mapGroup.selectAll("circle").data(earthquakes);

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
  if (barData.length > 10) {
    barData.pop();
  }

  barData.forEach(element => element.selected = false);

  const isCountryInBarChart = barData.map(entry => entry.key).includes(earthquake.country);
  const updatedbarData = [];
  if (!isCountryInBarChart) { // add if not present yet
    const earthquakesOfCountry = dataFiltered.get(earthquake.country);
    const entry = {
      key: earthquake.country,
      value: earthquakesOfCountry
    };
    barData.push(entry);
  }

  barData.find(element => element.key === earthquake.country).selected = true;

  updateBar();
}

function updateBar() {
  const xMax = barData[0].value.length;
  xScale.domain([0, xMax]);
  g_xAxis.call(xAxis);  // render x axis
  yScale.domain(barData.map(entry => entry.key));
  g_yAxis.call(yAxis);

  let rect = barGroup.selectAll('rect')
    .data(barData);  // TODO: needed? , d => d

    console.log(yScale.bandwidth());
  const rect_enter = rect.enter()
    .append('rect');

  rect.merge(rect_enter)
    .attr('width', d => xScale(d.value.length))
    .attr('y', (d,i) => yScale(d.key))
    .attr('fill', d => {
      if (d.selected) {
        return "red";
      } else {
        return "steelblue";
      }
    })
    .attr('height', yScale.bandwidth());

  rect.exit().remove();
}

$("#mag-slider").ionRangeSlider({
    type: "double",
    grid: true,
    min: 6,
    max: 11,
    from: 6,
    to: 11,
    step: 0.1,
    from_max: 7.9,
    onChange: data => {
      magFrom = data.from;
      magTo = data.to;
      updateDataFiltered();
    }
}); // TODO : dynamic min max