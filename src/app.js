const crg = require('country-reverse-geocoding').country_reverse_geocoding();

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
const xScale = d3.scaleLinear().range([0, barWidth]); // TODO move to better position
const xAxis = d3.axisTop().scale(xScale);
const g_xAxis = barGroup.append('g').attr('class','x axis');
const yScale = d3.scaleBand().rangeRound([0, barHeight]).paddingInner(0.1); // TODO move to better position
const yAxis = d3.axisLeft().scale(yScale);
const g_yAxis = barGroup.append('g').attr('class','y axis');

// Global Data
const dataOriginal = d3.map();
let dataFiltered; // this is a d3.map
let barData = []; // this is drawn in the bar chart


d3.json("worldmap.json", function(error, data) {
  if (error) {
    console.error("Can't load data: worldmap");
  } else {
    updateMap(data);
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
      updateCountryBarChart(barData);
    }
  });
}



function filterEarthquakeData() {
  dataFiltered = d3.map(dataOriginal);

  const isInternationalWatersChecked = d3.select('#filter-show-water').property('checked');
  filterByInternationalWatersToggle(isInternationalWatersChecked);


  // updateMapCircleEntries();
  updateBarChartEntries();
}

function filterByInternationalWatersToggle(isInternationalWatersChecked) {
  
}

function updateBarChartEntries() {
  barData = dataFiltered.entries();
  barData.sort((a, b) => b.value.length - a.value.length);
  barData = barData.slice(0, 10); // TODO auslagern
}



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
    if (!dataOriginal.has(earthquake.country)) {
      dataOriginal.set(earthquake.country, []);
    }
    dataOriginal.get(earthquake.country).push(earthquake);
  }
}

function updateMap(data) {
  const countries_geojson = topojson.feature(data, data.objects.countries).features;  // TODO what is this?

  const countries = mapGroup.selectAll(".country").data(countries_geojson);
  
  const countries_enter = countries.enter()
    .append("path")
    .attr("class", "country")
    .attr("d", path);
  
  loadEarthquakeData(); // TODO beautify: don't use a function here
}

function updateEarthquakeCircles(data) {
  const circle = mapGroup.selectAll("circle").data(data);

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

  updateCountryBarChart(barData);
}

d3.select('#filter-show-water').on('change', function() {
  filterEarthquakeData();
});

function updateCountryBarChart(data) {
  const xMax = data[0].value.length;
  xScale.domain([0, xMax]);
  g_xAxis.call(xAxis);  // render x axis
  yScale.domain(data.map(entry => entry.key));
  g_yAxis.call(yAxis);

  let rect = barGroup.selectAll('rect')
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
}