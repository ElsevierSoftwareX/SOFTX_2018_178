var View = require('ampersand-view');
var templates = require('../../templates');
var app = require('ampersand-app');
var SlotView = require('./slot');
var $ = require('jquery');
var FileSaver = require('file-saver');

// NOTE: gridster does not work properly with require()
// workaround via browserify-shim (configured in package.json)
require('gridster');

function removeWidget (view, filter) {
  // Remove the filter from the dataset
  var filters = filter.collection;
  filters.remove(filter);
  filter.off('newData');

  // Remove gridster stuff
  var gridster = $('[id~=widgets]').gridster().data('gridster');
  gridster.remove_widget(view.gridsterHook);

  // Remove ampersand stuff
  var p = view.parent._subviews;
  p.splice(p.indexOf(view), 1);
  view.remove();
}

module.exports = View.extend({
  template: templates.analyze.widgetFrame,
  initialize: function (opts) {
    this.editMode = false;

    // on initialization we have a Filter as model,
    // but we need to have a (chart specific) model instead
    // So, create the proper model and swap it for the filter.
    var filter = this.model;

    this.model = app.widgetFactory.newModel({
      modelType: filter.chartType,
      filter: filter
    });
    this.widgetHeader = filter.chartType;
  },
  props: {
    editMode: 'boolean',
    chartType: 'string'
  },
  derived: {
    'showMenu': {
      deps: ['editMode', 'mouseOver'],
      fn: function () {
        // never show in edit mode
        if (this.editMode) return false;

        // http://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript/4819886#4819886
        var touch = 'ontouchstart' in window || navigator.maxTouchPoints;
        return touch || this.mouseOver;
      }
    }
  },
  session: {
    mouseOver: ['boolean', true, false]
  },
  bindings: {
    'editMode': {
      hook: 'config-view',
      type: 'toggle',
      invert: false
    },
    'showMenu': {
      type: 'toggle',
      hook: 'plot-menu'
    },
    'widgetHeader': {
      hook: 'widgetHeader',
      type: 'text'
    }
  },
  events: {
    'click [data-hook~="close"]': 'closeWidget',
    'click [data-hook~="zoom-in"]': 'zoomIn',
    'click [data-hook~="zoom-out"]': 'zoomOut',
    'click [data-hook~="save"]': 'savePlot',
    'click [data-hook~="edit"]': function () { this.editMode = !this.editMode; },

    'mouseenter .widgetFrame': 'mouseEnter',
    'mouseleave .widgetFrame': 'mouseLeave'
  },
  zoomIn: function (ev) {
    this.model.filter.zoomIn();
    app.me.dataview.getData();
  },
  zoomOut: function () {
    this.model.filter.zoomOut();
    app.me.dataview.getData();
  },
  savePlot: function () {
    // Save the image to disk, but add a white background;
    // for this we need to make temporary copy

    // actual onscreen canvas
    var canvas = this.el.getElementsByTagName('canvas')[0];
    var ctx = canvas.getContext('2d');

    // temporary canvas
    var tempCanvas = document.createElement('canvas');
    var tempCtx = tempCanvas.getContext('2d');

    tempCanvas.width = ctx.canvas.width;
    tempCanvas.height = ctx.canvas.height;
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0);

    // use plot type as filename
    var imageName = this.model.modelType;

    tempCtx.canvas.toBlob(function (blob) {
      FileSaver.saveAs(blob, imageName);
    }, 'image/png');
  },
  mouseEnter: function () {
    this.mouseOver = true;
  },
  mouseLeave: function () {
    this.mouseOver = false;
  },
  closeWidget: function () {
    removeWidget(this, this.model.filter);
  },
  render: function () {
    this.renderWithTemplate(this);
    this.renderCollection(this.model.slots, SlotView, this.queryByHook('slots'));
    return this;
  },
  renderContent: function () {
    // Propagate to subview
    this.widget.renderContent();
  },
  subviews: {
    widget: {
      hook: 'widget',
      constructor: function (options) {
        // NOTE: view type (barchart, bubblechart, ...) is determined from options.model.modelType
        options.model = options.parent.model;
        return app.viewFactory.newView(options);
      }
    }
  }
});
