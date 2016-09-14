var View = require('ampersand-view');
var util = require('../util-time');

var TimePartView = View.extend({
  template: '<option data-hook="option"> </option>',
  render: function () {
    this.renderWithTemplate(this);
  },
  bindings: {
    'model.description': {
      hook: 'option',
      type: 'text'
    },
    'model.format': {
      hook: 'option',
      type: 'attribute',
      name: 'value'
    }
  }
});

module.exports = View.extend({
  template: '<select data-hook="options"> </select>',
  render: function () {
    this.renderWithTemplate(this);
    this.renderCollection(util.clientTimeParts, TimePartView, this.queryByHook('options'));

    var timeTransform = this.parent.model.timeTransform;
    var select = this.queryByHook('options');
    select.value = timeTransform.transformedFormat;
  },
  events: {
    'change [data-hook="options"]': 'changeTimePart'
  },
  changeTimePart: function () {
    var timeTransform = this.parent.model.timeTransform;

    var select = this.queryByHook('options');
    timeTransform.transformedFormat = select.value;
  }
});
