var app = require('ampersand-app');
var Router = require('ampersand-router');
var HomePage = require('./pages/home');
var DatasetsPage = require('./pages/datasets');
var ExportPage = require('./pages/export');
var SharePage = require('./pages/share');
var ConfigureDatasetPage = require('./pages/configure-dataset');
var ConfigureFacetPage = require('./pages/configure-facet');
var ConfigurePartitionPage = require('./pages/configure-partition');
var AnalyzePage = require('./pages/analyze');

module.exports = Router.extend({
  routes: {
    '': 'home',
    'home': 'home',
    'datasets': 'datasets',
    'analyze': 'analyze',
    'export': 'export',
    'share': 'share',

    'dataset/:id': 'configureDataset',
    'facet/:id': 'configureFacet',
    'partition/:id': 'configurePartition',
    '(*path)': 'catchAll'
  },

  // ------- ROUTE HANDLERS ---------
  home: function () {
    app.trigger('page', new HomePage({
      model: app.me
    }));
  },

  datasets: function () {
    app.trigger('page', new DatasetsPage({
      model: app.me
    }));
  },

  analyze: function () {
    app.trigger('page', new AnalyzePage({
      model: app.me.dataset,
      collection: app.me.dataset.filters
    }));
  },

  export: function () {
    app.trigger('page', new ExportPage({
      model: app.me
    }));
  },

  share: function () {
    app.trigger('page', new SharePage({
      model: app.me
    }));
  },

  configureDataset: function (id) {
    var dataset = app.me.datasets.get(id);
    if (dataset) {
      app.trigger('page', new ConfigureDatasetPage({
        model: dataset,
        collection: dataset.facets
      }));
    }
  },

  configureFacet: function (id) {
    app.trigger('page', new ConfigureFacetPage({
      dataset: app.me.dataset,
      model: app.me.dataset.facets.get(id)
    }));
  },

  configurePartition: function (id) {
    // Search over all filters and partitions in this dataset to find the right partition
    // Not very pretty, but the number of filters and filters per partition are small
    var partitionToEdit;
    var found = false;
    app.me.dataset.filters.forEach(function (filter) {
      filter.partitions.forEach(function (partition) {
        if (partition.getId() === id) {
          found = true;
          partitionToEdit = partition;
        }
      });
    });

    if (found) {
      app.trigger('page', new ConfigurePartitionPage({ model: partitionToEdit }));
    } else {
      app.trigger('page', new HomePage({ model: app.me }));
    }
  },

  catchAll: function () {
    this.redirectTo('');
  }
});
