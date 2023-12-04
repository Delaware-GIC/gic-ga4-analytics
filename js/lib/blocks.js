import d3 from 'd3';

import renderBlock from './renderblock';
import { exceptions, titleExceptions } from './exceptions';
import barChart from './barchart';
import buildTimeSeries from './timeseries';
import formatters from './formatters';
import transformers from './transformers';

/*
 * Define block renderers for each of the different data types.
 */
export default {

  // the realtime block is just `data.totals.activeUsers` formatted with commas
  realtime: renderBlock.loadAndRender()
    .render((selection, data) => {
      const totals = data.totals;
      selection.text(formatters.addCommas(+totals.activeUsers));
    }),

  today: renderBlock.loadAndRender()
    .transform(data => data)
    .render((svg, data) => {
      const days = data.data;
      days.forEach((d) => {
        d.visits = +d.visits;
      });

      const y = function (d) { return d.visits; };


      const series = buildTimeSeries()
        .series([data.data])
        .y(y)
        .label(d => formatters.formatHour(d.hour))
        .title(d => `${formatters.addCommas(d.visits)} visits during the hour of ${formatters.formatHour(d.hour)}m`);

      series.xScale()
        .domain(d3.range(0, days.length + 1));

      series.yScale()
        .domain([0, d3.max(days, y)]);

      series.yAxis()
        .tickFormat(formatters.formatVisits());

      svg.call(series);
    }),

  // the OS block is a stack layout
  os: renderBlock.buildBarBasicChart('os'),

  // the windows block is a stack layout
  windows: renderBlock.buildBarBasicChart('windows'),

  // the devices block is a stack layout
  devices: renderBlock.loadAndRender()
    .transform((d) => {
      console.log(d)
      const devices = transformers.listify(d.totals.devices);
      return transformers.findProportionsOfMetricFromValue(devices);
    })
    .render(barChart()
      .value(d => d.proportion)
      .format(formatters.floatToPercent))
    .on('render', (selection, data) => {
      /*
         * XXX this is an optimization. Rather than loading
         * users.json, we total up the device numbers to get the "big
         * number", saving us an extra XHR load.
         */
      const total = d3.sum(data.map(d => d.value));
      d3.select('#total_visitors')
        .text(formatters.readableBigNumber(total));
    }),

  // the browsers block is a table
  browsers: renderBlock.buildBarBasicChart('browser'),

  // the IE block is a stack, but with some extra work done to transform the
  // data beforehand to match the expected object format
  ie: renderBlock.buildBarBasicChart('ie_version'),

  cities: renderBlock.buildBarChartWithLabel((d) => {
    // remove "(not set) from the data"
    const cityList = d.data;
    const cityListFiltered = cityList.filter(c => (c.city !== '(not set)') && (c.city !== 'zz'));
    const proportions = transformers.findProportionsOfMetric(
      cityListFiltered,
      list => list.map(x => x.activeUsers),
    );
    return proportions.slice(0, 10);
  }, 'city'),

  countries: renderBlock.buildBarChart((d) => {
    let totalVisits = 0;
    let USVisits = 0;
    d.data.forEach((c) => {
      totalVisits += parseInt(c.activeUsers, 10);
      if (c.country === 'United States') {
        USVisits = c.activeUsers;
      }
    });
    const international = totalVisits - USVisits;
    const data = {
      'United States': USVisits,
      'International &amp; Territories': international,
    };
    return transformers.findProportionsOfMetricFromValue(transformers.listify(data));
  }),

  international_visits: renderBlock.buildBarChartWithLabel((d) => {
    let values = transformers.findProportionsOfMetric(
      d.data,
      list => list.map(x => x.activeUsers),
    );
    values = values.filter(c => c.country !== 'United States');
    return values.slice(0, 15);
  }, 'country'),

  'top-downloads': renderBlock.loadAndRender()
    .transform(d => d.data.slice(0, 10))
    .render(
      barChart()
        .value(d => +d.total_events)
        .label(d => [
          '<span class="name"><a class="top-download-page" target="_blank" href=http://', d.page, '>', d.page_title, '</a></span> ',
          '<span class="domain" >', formatters.formatURL(d.page), '</span> ',
          '<span class="divider">/</span> ',
          '<span class="filename"><a class="top-download-file" target="_blank" href=', d.event_label, '>',
          formatters.formatFile(d.event_label), '</a></span>',
        ].join(''))
        .scale(values => d3.scale.linear()
          .domain([0, 1, d3.max(values)])
          .rangeRound([0, 1, 100]))
        .format(formatters.addCommas),
    ),

  // the top pages block(s)
  'top-pages': renderBlock.loadAndRender()
    .transform(d => d.data)
    .on('render', (selection) => {
      // turn the labels into links
      selection.selectAll('.label')
        .each(function (d) {
          d.text = this.innerText;
        })
        .html('')
        .append('a')
        .attr('target', '_blank')
        .attr('href', d => exceptions[d.domain] || (`http://${d.domain}`))
        .text(d => titleExceptions[d.domain] || d.domain);
    })
    .render(barChart()
      .label(d => d.domain)
      .value(d => +d.visits)
      .scale(values => d3.scale.linear()
        .domain([0, 1, d3.max(values)])
        .rangeRound([0, 1, 100]))
      .format(formatters.addCommas)),

  // the top pages block(s)
  'top-pages-realtime': renderBlock.loadAndRender()
    .transform(d => d.data)
    .on('render', (selection) => {
      // turn the labels into links
      selection.selectAll('.label')
        .each(function (d) {
          d.text = this.innerText;
        })
        .html('')
        .append('a')
        .attr('target', '_blank')
        .attr('title', d => d.page_title)
        .attr('href', d => exceptions[d.page] || (`http://${d.page}`))
        .text(d => titleExceptions[d.page] || d.page_title);
    })
    .render(barChart()
      .label(d => d.page_title)
      .value(d => +d.activeUsers)
      .scale(values => d3.scale.linear()
        .domain([0, 1, d3.max(values)])
        .rangeRound([0, 1, 100]))
      .format(formatters.addCommas)),

};
