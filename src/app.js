const crg = require('country-reverse-geocoding').country_reverse_geocoding();
const $ = require("jquery");
require("ion-rangeslider");


// Map
const mapMargin = {top: 0, bottom: 0, left: 0, right: 0}; // TODO delete?
const projection = d3.geoMercator();

const mapSvg = d3.select("body").select(".map").append("svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .call(d3.zoom()
    .on("zoom", () => {
      mapGroup.attr("transform", d3.event.transform);
    })
  );

const mapGroup = mapSvg.append("g")
  .attr("transform", `translate(${mapMargin.left},${mapMargin.top})`);

// BarChart Styling
const barMargin = {top: 50, bottom: 10, left: 150, right: 10};
const barWidth = 960;
const barHeight = 350;

const barSvg = d3.select("body").select(".bar-chart").append("svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .attr("viewBox", `0 0 ${barWidth+barMargin.left+barMargin.right} ${barHeight+barMargin.top+barMargin.bottom}`);
  // .attr("width", barWidth+barMargin.left+barMargin.right)
  // .attr("height", barHeight+barMargin.top+barMargin.bottom);
const barGroup = barSvg.append("g")
  .attr("transform", `translate(${barMargin.left},${barMargin.top})`);
barGroup.append("text")  // Add x axis label           
    .attr("transform",
          `translate(${barWidth/2}, ${-barMargin.top/2})`)
    .style("text-anchor", "middle")
    .text("Number of Earthquakes");

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
let dateFrom = 2006, dateTo = 2016;  // TODO: dynamic

/* -- Logic -- */

// Main: Load data asynchronously
new Promise((resolve, reject) => {
    loadWorldMapData(resolve, reject);
  }).then(loadTectonicPlatesData)
    .then(loadEarthquakeData);

d3.select('#filter-show-water').on('change', function() {
  updateDataFiltered();
});

function loadTectonicPlatesData() {
  d3.json("tectonic_plates.json", function(error, data) {
    if (error) {
      console.error("Can't load data: tectonic_plates");
    } else {
      updateTectonicPlates(data);
    }
  });
}

function updateTectonicPlates(data) {
  const plates_geojson = data;

  const plates = mapGroup.selectAll(".plates").data(plates_geojson.features);

  const path = d3.geoPath()
    .projection(projection);
  const plates_enter = plates.enter()
    .append("path")
    .attr("class", "plate")
    .attr("d", path);
}

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
  const countries_geojson = topojson.feature(data, data.objects.countries);

  const countries = mapGroup.selectAll(".country").data(countries_geojson.features);

  const mapWidth = $('.map').width();
  const mapHeight = $('.map').height();

  projection.fitExtent([[0, -mapHeight/2], [mapWidth, mapHeight*2]], countries_geojson);

  const path = d3.geoPath()
    .projection(projection);
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

  filterByDate();

  updateEarthquakeCircles();
  updateBarChartEntries();
  updateBar();
}

function filterByDate() {
  for (let entry of dataFiltered.entries()) {
    dataFiltered.set(
      entry.key, 
      entry.value.filter(earthquake => {
        const date = new Date(earthquake.time);
        const year = date.getFullYear();
        return year >= dateFrom && year <= dateTo;
      })
    );  
  }
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
    .attr("r", d => d.mag^3 );
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
  if (barData.length === 0) {
    $(".bar-chart-no-data").show();
    $(".bar-chart").hide();
    return;
  }
  $(".bar-chart-no-data").hide();
  $(".bar-chart").show();

  let xMax = barData[0].value.length;
  xScale.domain([0, xMax]);
  xAxis.ticks(Math.min(10, xMax));
  g_xAxis.call(xAxis);  // render x axis
  yScale.domain(barData.map(entry => entry.key));
  g_yAxis.call(yAxis);

  let rect = barGroup.selectAll('rect')
    .data(barData, d => d.key);

    console.log(yScale.bandwidth());
  const rect_enter = rect.enter()
    .append('rect');

  rect.merge(rect_enter)
    .transition()
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
    onChange: data => {
      magFrom = data.from;
      magTo = data.to;
      updateDataFiltered();
    }
}); // TODO : dynamic min max

$("#date-slider").ionRangeSlider({
    type: "double",
    grid: true,
    min: 2006,
    max: 2016,
    from: 2006,
    to: 2016,
    step: 1,
    prettify_enabled: false,
    onChange: data => {
      dateFrom = data.from;
      dateTo = data.to;
      updateDataFiltered();
    }
}); // TODO : dynamic min max