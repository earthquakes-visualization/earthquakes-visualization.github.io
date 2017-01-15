const crg = require('country-reverse-geocoding').country_reverse_geocoding();
const $ = require("jquery");
require("ion-rangeslider");


// Map
const projection = d3.geoMercator();

const mapSvg = d3.select("body").select(".map").append("svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .call(d3.zoom()
    .scaleExtent([1 / 2, 8])
    .on("zoom", () => {
      mapGroup.attr("transform", d3.event.transform);
    })
  );

const mapGroup = mapSvg.append("g");

// BarChart Styling
const barMargin = {top: 50, bottom: 10, left: 150, right: 10};
const barWidth = 960;
const barHeight = 350;

const barSvg = d3.select("body").select(".bar-chart").append("svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .attr("viewBox", `0 0 ${barWidth+barMargin.left+barMargin.right} ${barHeight+barMargin.top+barMargin.bottom}`);
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
let magFrom = 6, magTo = 11;
let dateFrom = 2006, dateTo = 2016;
let countrySelected; // which country is highlighted in map and barchart

// Tooltip
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0)
  .style("width", 600);

/* -- Logic -- */

new Promise((resolve, reject) => {
    loadWorldMapData(resolve, reject);
  }).then(loadTectonicPlatesData)
    .then(loadEarthquakeData);

d3.select('#filter-show-water').on('change', function() {
  updateDataFiltered();
});

d3.select('#filter-show-plates').on('change', function() {
  if (d3.select('#filter-show-plates').property('checked')) {
    $(".plate").show();
  } else {
    $(".plate").hide();
  }
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
  plates.exit().remove();
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
  countries.exit().remove();
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
  let earthquakes = dataFiltered.values().reduce( (acc, cur) => acc.concat(cur), [] );

  // draw earthquakes of selected country on top of others
  // draw bigger earthquakes (magnitude) behind smaller ones
  earthquakes = earthquakes.sort( (a, b) => {
    let order = b.mag - a.mag;
    if (a.country === countrySelected) order -= 1;
    if (b.country === countrySelected) order += 1;
    return order;
  });
  
  const circle = mapGroup.selectAll("circle").data(earthquakes);

  const circle_enter = circle.enter()
    .append("circle")
    .on("click", d => onSelectionChange(d.country))
    .on("mouseover", d => {
      tooltip.transition()
        .duration(500)
        .style("opacity", 0.85);
      let date = new Date(d.time);
      let text = `<strong>Magnitude:</strong> ${d.mag}<br>
        <strong>Depth:</strong> ${d.depth}km<br>
        <strong>Date:</strong> ${date.toUTCString()}<br>
        <strong>Place:</strong> ${d.place}`;
      tooltip.html(text)
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY) + "px");
    })
    .on("mouseout", d => {
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    })

  circle.merge(circle_enter)
    .attr("cx", d => projection([d.longitude, d.latitude])[0] )
    .attr("cy", d => projection([d.longitude, d.latitude])[1] )
    .attr("r", d => d.mag^3 )
    .attr("stroke", d => d.country === countrySelected ? "black" : "transparent")
    .attr("fill", d => {
        if (d.country === countrySelected) {
          return "rgba(255, 165, 0, 0.3)";
        } else {
          return "rgba(255,   0, 0, 0.3)";
        }
      }
    );

  circle.exit().remove();
}

function onSelectionChange(country) {
  // Reset old country selection
  if (barData.length > 10) {
    barData.pop();
  }

  barData.forEach(element => element.selected = false);

  // Update according to new selection
  countrySelected = country;

  const isCountryInBarChart = barData.map(entry => entry.key).includes(country);
  const updatedbarData = [];
  if (!isCountryInBarChart) { // add if not present yet
    const earthquakesOfCountry = dataFiltered.get(country);
    const entry = {
      key: country,
      value: earthquakesOfCountry
    };
    barData.push(entry);
  }

  updateBar();
  updateEarthquakeCircles();
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

  const rect_enter = rect.enter()
    .append('rect')
    .on("click", d => onSelectionChange(d.key));
  rect_enter
    .append("title");

  rect.merge(rect_enter)
    .transition()
    .attr('width', d => xScale(d.value.length))
    .attr('y', d => yScale(d.key))
    .attr('fill', d => {
      if (d.key === countrySelected) {
        return "orange";
      } else {
        return "steelblue";
      }
    })
    .attr('height', yScale.bandwidth());
  rect.merge(rect_enter)
    .select("title").text(d => d.value.length);

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
});

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
});