'use strict';

//console.debug = function(){/* NOP */};
//console.info = function(){/* NOP */};
//console.log = function(){/* NOP */};
//console.warn = function(){/* NOP */};
//console.error = function(){/* NOP */};

const moment=require('moment');
const Chartist=require('chartist');
require('./js/chartist-plugin-zoom/dist/chartist-plugin-zoom');
var StateMachine = require('javascript-state-machine');

const ipc = require('electron').ipcRenderer;
var plotInfo = {};
ipc.send('get-app-version');
ipc.on('got-app-version', function(event, version) {
  plotInfo.swVersion = version;
})

var fsm = new StateMachine({
  init: 'nograph',
  transitions: [
    { name: 'enableGraph',    from: 'nograph',  to: 'stop'    },
    { name: 'disableGraph',   from: '*',        to: 'nograph' },
    { name: 'startLogging',   from: ['stop', 'stop-zoom'], to: 'run'     },
    { name: 'stopLogging',    from: 'run',      to: 'stop'    },
    { name: 'stopLogging',    from: 'run-zoom', to: 'stop-zoom' },
    { name: 'zoom',           from: ['run', 'run-zoom'],   to: 'run-zoom'   },
    { name: 'zoom',           from: ['stop', 'stop-zoom'], to: 'stop-zoom'  },
    { name: 'resetZoom',      from: 'run-zoom',  to: 'run'    },
    { name: 'resetZoom',      from: 'stop-zoom', to: 'stop'   },
    { name: 'load',           from: '*',         to: 'stop'   },
  ],
  methods: {
    onTransition: function(lifecycle) {
      console.log('DURING:' + lifecycle.transition + ' (from ' + lifecycle.from + ' to ' + lifecycle.to + ')');
    },

    onEnableGraph: function() {
      clearGraph();
      document.getElementById('chart-container').className = 'clearfix';
      document.getElementById('graph-menu').className = 'clearfix';
      window.resizeBy(0, 450);
    },

    onDisableGraph: function() {
      document.getElementById('chart-container').className = 'hide';
      document.getElementById('graph-menu').className = 'hide';
      document.getElementById('stat-container0').className = 'hide';
      document.getElementById('stat-container1').className = 'hide';
      document.getElementById('stat-container2').className = 'hide';
      document.getElementById('stat-container3').className = 'hide';
      window.resizeBy(0, -450 -34*waveformsNum);
    },

    onStopLogging: function() {
      document.getElementById('run').checked = false;
    },

    onStartLogging: function(lifecycle) {
      clearGraph();
      document.getElementById('run').checked = true;
      document.getElementById('save').disabled = false;
      document.getElementById('reset-zoom').disabled = true;
    },

    onZoom: function() {
      document.getElementById('reset-zoom').disabled = false;
    },

    onResetZoom: function() {
      resetZoomFunc && resetZoomFunc();
      resetZoomFunc = null;
      for(var i=0; i<waveformsNum; i++) {
        stat[i].clearStat();
      }

      document.getElementById('reset-zoom').disabled = true;
    },

    onLoad: function() {
      document.getElementById('save').disabled = true;
      document.getElementById('reset-zoom').disabled = true;
    }

  }
});

const TbiDeviceManager=require('toolbit-lib').TbiDeviceManager;
var tbiDeviceManager = new TbiDeviceManager();
var connectedDmmNum = 0;
var waveformsNum = 0;

const Dmmctrl=require('./js/dmmctrl');
const Stat=require('./js/stat');

var dmmctrl = Array(4);
var stat = Array(4);
var plotOptions = [{}, {}, {}, {}];

var timeInterval;
var plotData = [[],[],[],[]];
var plotStart = new Date();
var chart;


var setTimeInterval = function(t) {
  if(t=='Fast') {
    timeInterval = 99;
  } else if(t=='Mid') {
    timeInterval = 999;
  } else if(t=='Slow') {
    timeInterval = 2999;
  };
  console.log('timeInterval:' + t);
};

var dmmContainers = ['dmm-container0', 'dmm-container1', 'dmm-container2', 'dmm-container3'];
var statContainers = ['stat-container0', 'stat-container1', 'stat-container2', 'stat-container3'];
var chartContainer = document.getElementById('chart-container');
var chart = new Chartist.Line(chartContainer, {}, {});

function exportData(records) {
   let data = JSON.stringify(records);
   let bom  = new Uint8Array([0xEF, 0xBB, 0xBF]);
   let blob = new Blob([bom, data], {type: 'text'});
   let url = (window.URL || window.webkitURL).createObjectURL(blob);
   let link = document.createElement('a');
   link.download = 'log-' + moment(plotStart).format('YYYYMMDD-HHmm') + '.json';
   link.href = url;
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
};

function disableElements(elems) {
  for(var i=0; i<elems.length; i++) {
    elems[i].disabled = true;
  }
}

function enableElements(elems) {
  for(var i=0; i<elems.length; i++) {
    elems[i].disabled = false;
  }
}

function openDevice() {
  tbiDeviceManager.updateDeviceList();
  var serials = tbiDeviceManager.getSerialList('DMM');
  console.log('The number of detected DMM: ' + serials.size());

  if(serials.size()==0) {
    // Fail to open and then try it later
    window.setTimeout(openDevice, 3000);
    return;
  }
  for(var i=0; i<serials.size(); i++) {

    dmmctrl[i] = new Dmmctrl(dmmContainers[i]);
    if(dmmctrl[i].dmm.open(serials.get(i))) {
      // Fail to open and then try it later
      window.setTimeout(openDevice, 3000);
      return;
    }
    connectedDmmNum++;
    window.resizeBy(0, 63);
  }

  setTimeInterval(document.getElementById('interval').value);

  document.getElementById('interval').addEventListener('change', (event) => {
    setTimeInterval(event.target.value);
    clearGraph();
  });
  document.getElementById('hold').addEventListener('change', function() {
    for(var i=0; i<connectedDmmNum; i++) {
      dmmctrl[i].hold(this.checked);
    }
    console.log('holdChecked:' + this.checked);
  });

  document.getElementById('run').addEventListener('change', function() {
    if(this.checked) {
      fsm.startLogging();
    } else {
      fsm.stopLogging();
    }
  });
  document.getElementById('save').addEventListener('click', function() {
    exportData([plotInfo, plotOptions, plotData]);
  });

  enableElements(document.getElementById('main').getElementsByTagName('input'));
  enableElements(document.getElementById('main').getElementsByTagName('select'));
  enableElements(document.getElementById('main').getElementsByTagName('button'));
  document.getElementById('save').disabled = true;
  document.getElementById('reset-zoom').disabled = true;

  window.setTimeout(update, timeInterval);
}

function initialize() {
  disableElements(document.getElementById('main').getElementsByTagName('input'));
  document.getElementById('graph').disabled = false;
  disableElements(document.getElementById('main').getElementsByTagName('select'));
  disableElements(document.getElementById('main').getElementsByTagName('button'));
  document.getElementById('load').disabled = false;

  document.getElementById('graph').addEventListener('change', function() {
    if(this.checked) {
      fsm.enableGraph();
      if(connectedDmmNum>0) {
        fsm.startLogging();
      }
    } else {
      fsm.disableGraph()
    }
  });

  var fin = document.createElement('input');
  fin.type = 'file';
  fin.accept = '.json';
  fin.addEventListener('change', function(e) {
    document.getElementById('load').disabled = true;
    var file = e.target.files[0];

    if(file.type.match('application/json')) {
      var reader = new FileReader();
      reader.addEventListener('load', function() {
        var data = JSON.parse(this.result);
        if(fsm.state=='run' || fsm.state=='run-zoom') {
          fsm.stopLogging();
        }
        plotInfo = data[0];
        plotOptions = data[1];
        plotData = data[2];
        plotStart = new Date(0);
        fsm.load();
        initializeGraph();
        document.getElementById('load').disabled = false;
      })
      reader.readAsText(file);
      e.target.value = '';   // reset value to load the same file again
    }
  });

  document.getElementById('load').addEventListener('click', function() {
    fin.click();
  });

  document.getElementById('reset-zoom').addEventListener('click', (event) => {
    fsm.resetZoom();
  });
  document.getElementById('reset-zoom').disabled = true;

  openDevice();

  for(var i=0; i<4; i++) {
    stat[i] = new Stat(statContainers[i]);
  }
}

var resetZoomFunc;
function onZoom(chart, reset) {
  resetZoomFunc = reset;
  console.log(chart.options.axisX.highLow);
  for(var i=0; i<waveformsNum; i++) {
    stat[i].showStat(chart.options.axisX.highLow.low, chart.options.axisX.highLow.high);
  }
}

function ongoingMouseDown() {
  fsm.zoom();
}

function initializeGraph() {
  chart = new Chartist.Line(chartContainer,
  {  // data
    series: [
      {
        name: 'series-1',   // Red
        data: plotData[3]
      },
      {
        name: 'series-2',   // Pink
        data: []
      },
      {
        name: 'series-3',   // Yellow
        data: []
      },
      {
        name: 'series-4',   // Brown
        data: plotData[2]
      },
      {
        name: 'series-5',   // Dark blue
        data: []
      },
      {
        name: 'series-6',   // Green
        data: plotData[0]
      },
      {
        name: 'series-7',   // Blue
        data: plotData[1]
      },
      {
        name: 'to-show-zero-point',
        data: [{x: 0, y: 0}]
      }
    ]
  }, {  // options
    lineSmooth: false,
    showPoint: false,
    axisX: {
      type: Chartist.FixedScaleAxis,
      divisor: 5,
      labelInterpolationFnc: function(value) {
        var mom = moment(value + plotStart.getTimezoneOffset()*1000*60);
        if(moment(plotStart).isDST()) {
          mom.add(1, 'hours');
        }
        if(mom.format("H")!=0) {
          return mom.format("H:m:ss.S");
        } else if(mom.format("m")!=0) {
          return mom.format("m:ss.S");
        }
        return mom.format("s.S");
      }
    },
    plugins: [
      Chartist.plugins.zoom({
//        resetOnRightMouseBtn: true,
        onZoom : onZoom,
        ongoingMouseDown : ongoingMouseDown,
      })
    ]
  });  // end of options

  // Prepare statics area
  waveformsNum = 0;
  for(var i=0; i<4; i++) {
    if(plotData[i].length>1) {
      stat[i].setData(plotData[i], plotOptions[i].mode);
      waveformsNum++;
    }
  }
  if(waveformsNum==0) {
    for(var i=0; i<connectedDmmNum; i++) {
      plotOptions[i].mode = dmmctrl[i].mode;
      stat[i].setData(plotData[i], plotOptions[i].mode);
      waveformsNum++;
    }
  }

  for(var i=0; i<4; i++) {
    var divElem = document.getElementById('stat-container'+ i);
    if(i<waveformsNum && divElem.className=="hide") {
      divElem.className = 'clearfix';
      window.resizeBy(0, 34);
    } else if(i>=waveformsNum && divElem.className=="clearfix") {
      divElem.className = 'hide';
      window.resizeBy(0, -34);
    }

  }
}

function clearGraph() {
  if(fsm.state=='stop-zoom' || fsm.state=='run-zoom') {
    fsm.resetZoom();
  }
  plotData = [[],[],[],[]];
  for(var i=0; i<connectedDmmNum; i++) {
    dmmctrl[i].clearPlotdat();
    plotData[i] = dmmctrl[i].plotdat;
  }
  initializeGraph();
  chart.update();
}

function update() {
  window.setTimeout(update, timeInterval);

  var t = new Date();
  if(plotData[0].length==0) {
    plotStart = t;
  }
  var tdiff = t.getTime() - plotStart.getTime();

  if(fsm.state=='run' || fsm.state=='run-zoom') {
    for(var i=0; i<connectedDmmNum; i++) {
      dmmctrl[i].acquisition(tdiff, true);
    }
  } else {
    for(var i=0; i<connectedDmmNum; i++) {
      dmmctrl[i].acquisition(tdiff, false);
    }
  }
  //console.log('value[' + t.toJSON() + ']:' + val);

  if(fsm.state=='run') {
    chart.update();
  }
};

document.addEventListener("DOMContentLoaded", function() {
  initialize();
});
