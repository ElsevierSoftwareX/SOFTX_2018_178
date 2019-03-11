var Spot = require('spot-framework');
var app = require('ampersand-app');
var Router = require('./router');
var MainView = require('./pages/main');
var domReady = require('domready');
var widgetFactory = require('./widgets/widget-factory');
var viewFactory = require('./widgets/view-factory');
var Collection = require('ampersand-collection');

var SessionModel = require('./pages/datasets/session-model');

var Help = require('intro.js');
var templates = require('./templates');
var $ = require('jquery');

require('babel-polyfill');

// NOTE: material-design-light does not work properly with require()
// workaround via browserify-shim (configured in package.json)
require('mdl');



var sessionCollection = Collection.extend({
  mainIndex: 'id',
  indexes: ['name'],
  model: SessionModel
});

// attach our app to `window` so we can
// easily access it from the console.
window.app = app;

// Extends our main app singleton
app.extend({
  /**
   * [fullscreenMode description]
   * @type {Boolean}
   */
  fullscreenMode: false,
  /**
   * [demoSession description]
   * @type {Boolean}
   */
  demoSession: false,
  /**
   * [mobileBrowser description]
   * @type {Boolean}
   */
  mobileBrowser: false,
  /**
   * [me description]
   * @type {Spot}
   */
  me: new Spot(),
  /**
   * [widgetFactory description]
   * @type {any}
   */
  widgetFactory: widgetFactory,
  /**
   * [viewFactory description]
   * @type {any}
   */
  viewFactory: viewFactory,
  /**
   * [router description]
   * @type {Router}
   */
  router: new Router(),
  /**
   * [CSVSeparator description]
   * @type {String}
   */
  CSVSeparator: ',',
  /**
   * [CSVHeaders description]
   * @type {Boolean}
   */
  CSVHeaders: true,
  /**
   * [CSVQuote description]
   * @type {String}
   */
  CSVQuote: '"',
  /**
   * [CSVComment description]
   * @type {String}
   */
  CSVComment: '#',
  /**
   * [sessions description]
   * @type {any}
   */
  sessions: new sessionCollection(),
  // sessions: new Collection([]),
  /**
   * This is where it all starts
   */
  init: function () {
    // Create and attach our main view
    this.mainView = new MainView({
      model: this.me,
      el: document.body
    });

    // this kicks off our backbutton tracking (browser history)
    // and will cause the first matching handler in the router
    // to fire.
    this.router.history.start({
      root: '/',
      pushState: true
    });
  },
  /**
   * This is a helper for navigating around the app.
     this gets called by a global click handler that handles
     all the <a> tags in the app.
     it expects a url pathname for example: "/costello/settings"
   * @param  {any} page [description]
   */
  navigate: function (page) {
    var url = (page.charAt(0) === '/') ? page.slice(1) : page;
    this.router.history.navigate(url, {
      trigger: true
    });
  },
  /**
   * [description]
   * @param  {any} percentage [description]
   */
  progress: function (percentage) {
    var progressBar = document.getElementById('progress-bar');
    progressBar.MaterialProgress.setProgress(percentage);

    progressBar.style.display = 'inherit';
  },

  /**
   * [description]
   * @param  {boolean} status [description]
   */
  busy: function (status) {
    console.log('Change spinner status:', status);
    var spinner = document.getElementById('spinner');
    if (status === true) {
      spinner.style.display = 'inline';
    } else {
      spinner.style.display = 'none';
    }
  },
  /**
   * [description]
   * @param  {any} options [description]
   */
  message: function (options) {
    var snackbarContainer = document.getElementById('snack-bar');
    var snackData = { message: options.text };

    // BUGFIX: during app initialization, the snackbar is not always ready yet
    if (!snackbarContainer.MaterialSnackbar) {
      return;
    }

    var progressBar = document.getElementById('progress-bar');
    progressBar.style.display = 'none';

    if (options.type === 'error') {
      console.warn(options.text, options.error);
      snackData.timeout = 10000; // show error for 10 seconds
    } else {
      console.log(options.text);
      snackData.timeout = 2750;
    }
    snackbarContainer.MaterialSnackbar.showSnackbar(snackData);
  },
  /**
   * [description]
   * @param  {any} sessionUrl [description]
   */
  downloadRemoteSession: function (sessionUrl) {
    console.log('spot.js: Getting the remote session.');
    var request = new window.XMLHttpRequest();

    request.addEventListener('progress', updateProgress);
    request.addEventListener('load', transferComplete);
    request.addEventListener('error', transferFailed);
    request.addEventListener('abort', transferCanceled);

    request.open('GET', sessionUrl, true);
    request.responseType = 'json';

    function updateProgress (evt) {
      if (evt.lengthComputable) {
        var percentComplete = evt.loaded / evt.total;
        console.log('progress:', percentComplete);
        app.message({
          text: 'Progress: ' + percentComplete,
          type: 'ok'
        });
      }
    }

    function transferComplete (evt) {
      console.log('The transfer is complete.');
      app.message({
        text: 'Remote session was downloaded succesfully.',
        type: 'ok'
      });
      app.loadSessionBlob(request.response);
    }

    function transferFailed (evt) {
      console.log('An error occurred while transferring the file.');
      app.message({
        text: 'Remote session download problem.',
        type: 'error'
      });
    }

    function transferCanceled (evt) {
      console.log('The transfer has been canceled by the user.');
    }

    request.send();
  },
  /**
   * [description]
   * @param  {any} data [description]
   */
  loadSessionBlob: function (data) {
    console.log('Loading the session.');
    app.me = new Spot(data);

    if (data.sessionType === 'server') {
      app.me.connectToServer(data.address);
    } else if (data.sessionType === 'client') {
      // add data from the session file to the dataset
      data.datasets.forEach(function (d, i) {
        app.me.datasets.models[i].crossfilter.add(d.data);
        app.me.datasets.models[i].isActive = false; // we'll turn it on later
      });
      // merge all the data into the app.me.dataview
      // by toggling the active datasets back on
      data.datasets.forEach(function (d, i) {
        if (d.isActive) {
          app.me.toggleDataset(app.me.datasets.models[i]);
        }
      });
    }
    // and automatically go to the analyze page
    app.navigate('/analyze');
  },
  /**
   * [description]
   */
  startHelp: function () {
    var helper = Help();
    helper.setOptions({
      'showStepNumbers': false,
      'showBullets': true,
      'showProgress': true,
      'skipLabel': 'Exit',
      'doneLabel': 'Close',
      'tooltipPosition': 'auto'
    });

    if (app.currentPage.helpTemplate && app.currentPage.helpTemplate !== '') {
      helper.setOptions({
        steps: [
          {
            intro: window[app.currentPage.helpTemplate]()
          }
        ]
      });
    }

    helper.start();
  },
  /**
   * [description]
   */
  startWelcome: function () {
    var welcome = Help();
    welcome.setOption('tooltipClass', 'welcome-dialog');
    welcome.setOptions({
      'showStepNumbers': false,
      'showBullets': false,
      'showProgress': false,
      'skipLabel': 'Exit',
      'doneLabel': 'Start demo',
      'tooltipPosition': 'auto',
      steps: [
        {
          intro: templates.help.welcome()
        },
        {
          intro: templates.help.menuButtons()
        },
        {
          intro: 'You can click the button below to start a demo session. The demo session has Kaggle <b>Titanic Survival</b> dataset. <br>You can also start this session later using the button at the bottom of this page. <br><br> Happy SPOTTING!<br>'
        }
      ]
    });

    welcome.onchange(function (targetElement) {
      if (this._currentStep === this._introItems.length - 1) {
        $('.introjs-skipbutton').css('color', 'green');
      }
    });

    welcome.oncomplete(function () {
      window.localStorage.setItem('spotWelcome', 'done');
      app.message({
        text: 'Starting the demo session.',
        type: 'ok'
      });
      app.downloadRemoteSession('https://raw.githubusercontent.com/NLeSC/spot/master/dist/demo.json');
    });

    // add a flag when we exit
    welcome.onexit(function () {
      window.localStorage.setItem('spotWelcome', 'done');
    });

    var spotWelcome = window.localStorage.getItem('spotWelcome') === 'done';
    if (spotWelcome) {
      // console.log('No need to show welcome dialog again.');
    } else {
      console.log('Starting the welcome dialog.');
      welcome.start();
    }
  },
  /**
   * [description]
   * @return {boolean} [description]
   */
  detectMobile: function () {
    var check = false;
    if (navigator.userAgent.match(/Android/i) ||
    navigator.userAgent.match(/webOS/i) ||
    navigator.userAgent.match(/iPhone/i) ||
    navigator.userAgent.match(/iPad/i) ||
    navigator.userAgent.match(/iPod/i) ||
    navigator.userAgent.match(/BlackBerry/i) ||
    navigator.userAgent.match(/Windows Phone/i)
   ) {
      check = true;
    } else {
      check = false;
    }
    app.mobileBrowser = check;
    return check;
  },
  /**
   * [description]
   * @return {} [description]
   */
  addDatasetToLocalStorage: function(dataset) {
    console.log('Adding a dataset to the local storage');
    console.log(dataset);
    var allDatasets = this.getDatasetsFromLocalStorage();
    // allDatasets.forEach(function(dset, index) {
    //   console.log("[" + index + "]: " + dset.id + '  ', dset.name);
    // });
    allDatasets.push(dataset);
    localStorage.setItem('datasets', JSON.stringify(allDatasets));
  },
    /**
   * [description]
   * @return {} [description]
   */
  removeDatasetFromLocalStorage: function(dataset) {
    console.log('Removing a dataset from the local storage');
    console.log(dataset);
    var allDatasets = this.getDatasetsFromLocalStorage();
    allDatasets.forEach(function(dset, index) {
      console.log("[" + index + "]: " + dset.id + '  ', dset.name);
      if ( dataset.id === dset.id ) 
        allDatasets.splice(index, 1);
    });
    // var index = allDatasets.indexOf(dataset);
    // if (index > -1) {
    //   allDatasets.splice(index, 1);
    // }
    localStorage.setItem('datasets', allDatasets);
  },
    /**
   * [description]
   * @return {} [description]
   */
  getDatasetsFromLocalStorage: function() {
    console.log('Getting a list of datasets from the local storage');
    var allDatasets = JSON.parse(localStorage.getItem('datasets') || "[]");
    return allDatasets;
  },
  /**
   * [description]
   * @return {} [description]
   */
  addSessionToLocalStorage: function(session) {
    console.log('Adding a session to the local storage');
    console.log(session);
    var allSessions = this.getSessionsFromLocalStorage();
    // allDatasets.forEach(function(dset, index) {
    //   console.log("[" + index + "]: " + dset.id + '  ', dset.name);
    // });
    allSessions.push(session);
    localStorage.setItem('sessions', JSON.stringify(allSessions));
  },
    /**
   * [description]
   * @return {} [description]
   */
  removeSessionFromLocalStorage: function(sessionId) {
    console.log('Removing a session from the local storage');
    console.log(session);
    var allSessions = this.getSessionsFromLocalStorage();
    allSessions.forEach(function(sess, index) {
      console.log("[" + index + "]: " + sess.id + '  ', sess.name);
      if ( sessionId === sess.id ) 
        allSessions.splice(index, 1);
    });
    // var index = allDatasets.indexOf(dataset);
    // if (index > -1) {
    //   allDatasets.splice(index, 1);
    // }
    localStorage.setItem('sessions', allSessions);
  },
    /**
   * [description]
   * @return {} [description]
   */
  getSessionsFromLocalStorage: function() {
    console.log('Getting a list of sessions from the local storage');
    var allSessions = JSON.parse(localStorage.getItem('sessions') || "[]");
    return allSessions;
  },
  getCurrentSession: function () {
    var json = app.me.toJSON();
    // if (app.me.sessionType === 'client') {
    //   // for client datasets, also save the data in the session file
    //   app.me.datasets.forEach(function (dataset, i) {
    //     json.datasets[i].data = dataset.data;
    //   });
    // }
    // json.saveDate = Date().toLocaleString();
    var currentSession = json;
    return currentSession;
  },
  saveCurrentSession: function () {
    var currentSession = this.getCurrentSession();
    this.addSessionToLocalStorage(currentSession);
  }

});

/**
 * run it on domReady
 */
domReady(function () {
  app.init();

  if ( process.env.MODE === 'server' ) {
    console.log('connecting to database at', process.env.DB_SERVER + ":" + process.env.DB_SERVER_PORT);
    app.me.isLockedDown = true;
    app.me.connectToServer(process.env.DB_SERVER + ":" + process.env.DB_SERVER_PORT);
    app.me.socket.emit('getDatasets');
  }
});

