var Chart = require('./chart');

module.exports = Chart.extend({
  initialize: function () {
    this.minPartitions = 2;
    this.maxPartitions = 2;
  },
  chartjsConfig: function () {
    return {
      type: 'bubble',
      data: {
        datasets: []
      },
      options: {
        responsive: true,
        legend: {
          display: false
        },
        scales: {
          xAxes: [{
            type: 'linear',
            position: 'bottom',
            gridLines: {
              zeroLineColor: 'rgba(0,255,0,1)'
            }
          }],
          yAxes: [{
            type: 'linear',
            position: 'left',
            gridLines: {
              zeroLineColor: 'rgba(0,255,0,1)'
            }
          }]
        },
        tooltips: {
          enabled: false
        }
      }
    };
  }
});
