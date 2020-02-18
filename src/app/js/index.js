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
      document.getElementById('chart-container').className = '';
      document.getElementById('graph-menu').className = '';
      window.resizeBy(0, 436);
    },

    onDisableGraph: function() {
      document.getElementById('chart-container').className = 'hide';
      document.getElementById('graph-menu').className = 'hide';
      window.resizeBy(0, -436);
    },

    onStopLogging: function() {
      document.getElementById('run').checked = false;
    },

    onStartLogging: function(lifecycle) {
      clearGraph();
      if(lifecycle.from=='stop-zoom') {
        resetZoomFunc = null;
        document.getElementById('reset-zoom').disabled = true;
      }
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
      document.getElementById('reset-zoom').disabled = true;
    },

    onLoad: function() {
      let fin = document.createElement('input');
      fin.type = 'file';
      fin.accept = '.json';
      fin.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if(file.type.match('application/json')) {
          var reader = new FileReader();
          reader.addEventListener('load', function() {
            plotData = JSON.parse(this.result);
            plotStart = new Date(0);
            console.log('Loaded plot data');
            initializeGraph();
          })
        reader.readAsText(file);
        document.getElementById('save').disabled = true;
        document.getElementById('reset-zoom').disabled = true;
        }
      });
      fin.click();
    }

  }
});

const TbiDeviceManager=require('toolbit-lib').TbiDeviceManager;
var tbiDeviceManager = new TbiDeviceManager();
var connectedDmmNum = 0;

const Dmmctrl=require('./js/dmmctrl');
var dmmctrl = Array(4);

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
    exportData(plotData);
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
      fsm.startLogging();
    } else {
      fsm.disableGraph()
    }
  });

  document.getElementById('load').addEventListener('click', function() {
    if(fsm.state=='run' || fsm.state=='run-zoom') {
      if(window.confirm("Is it OK to stop recording?")) {
        fsm.stopLogging();
      } else {
        return;
      }
    }
    fsm.load();
  });

  document.getElementById('reset-zoom').addEventListener('click', (event) => {
    fsm.resetZoom();
  });
  document.getElementById('reset-zoom').disabled = true;

  openDevice();
};

var resetZoomFunc;
function onZoom(chart, reset) {
  resetZoomFunc = reset;
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
        data: plotData[1]
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
        data: plotData[0]
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
}

function clearGraph() {
  plotData = [[],[],[],[]];
  initializeGraph();
  chart.update();
}

function update() {
  window.setTimeout(update, timeInterval);

  var val = Array(4);

  for(var i=0; i<connectedDmmNum; i++) {
    val[i] = dmmctrl[i].acquisition();
  }

  var t = new Date();

  console.log('value[' + t.toJSON() + ']:' + val);

  if(plotData[0].length==0) {
    plotStart = t;
  }

  if(fsm.state=='run' || fsm.state=='run-zoom') {
    var tdiff = t.getTime() - plotStart.getTime();

    for(var i=0; i<connectedDmmNum; i++) {
      plotData[i].push({x: tdiff, y: val[i]});
    }
  }

  if(fsm.state=='run') {
    chart.update();
  }
};

document.addEventListener("DOMContentLoaded", function() {
  initialize();
});
