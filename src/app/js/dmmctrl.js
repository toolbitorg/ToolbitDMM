
class Dmmctrl {

  constructor(id) {
    this.id = id;

    const Dmm=require('toolbit-lib').Dmm;
    this.dmm_ = new Dmm();
    this.plotdat_ = [];
    this.mode;
    this.range;
    this.holdChecked = false;
    this.unit = '';

    this.init();
  }

  get dmm() {
    return this.dmm_;
  }

  get plotdat() {
    return this.plotdat_;
  }

  init() {
    var divElem = document.getElementById(this.id);
    divElem.innerHTML =
    '<div id="top">'+
    '  <div id="top-left">'+
    '    <input id="' + this.id + '-disp-color" class="disp-color" type="text" name="color" readonly="readonly">'+
    '    <div class="stat-parent">'+
    '      <div class="stat">Max:</div>'+
    '      <div class="stat"><p id="' + this.id + '-stat-max"></p></div>'+
    '      <div class="stat">Min:</div>'+
    '      <div class="stat"><p id="' + this.id + '-stat-min"></p></div>'+
    '      <div class="stat">Ave:</div>'+
    '      <div class="stat"><p id="' + this.id + '-stat-ave"></p></div>'+
    '    </div>'+
    '  </div>'+
    '  <div id="top-middle">'+
    '    <p id="' + this.id + '-disp-val" class="disp-val"></p>'+
    '  </div>'+
    '  <div id="top-right">'+
    '    <p id="' + this.id + '-disp-unit" class="disp-unit"></p>'+
    '    <select id="' + this.id + '-range" name="range" class="mode">'+
    '      <option selected="selected">Auto</option>'+
    '      <option></option>'+
    '      <option>m</option>'+
    '      <option>u</option>'+
    '    </select>'+
    '    <br>'+
    '    <select id="' + this.id + '-mode" name="mode" class="mode">'+
    '      <option selected="selected">V</option>'+
    '      <option>A</option>'+
    '    </select>'+
    '  </div>'+
    '</div>'

    this.mode = document.getElementById(this.id + '-mode').value;
    this.range = document.getElementById(this.id + '-range').value;

    document.getElementById(this.id + '-mode').addEventListener('change', (event) => {
      this.mode = event.target.value;
      clearGraph();
    });
    document.getElementById(this.id + '-range').addEventListener('change', (event) => {
      this.range = event.target.value;
    });
  }

  hold(val) {
    this.holdChecked = val;
  }

  clearPlotdat() {
    delete this.plotdat_;
    this.plotdat_ = [];
  }

  acquisition(tdiff, isItRecording) {
    var val;

    if(this.mode=='V') {
      val = this.dmm_.getVoltage();
    } else if(this.mode=='A') {
      val = this.dmm_.getCurrent();
    };

    if(isItRecording) {
      this.plotdat_.push({x: tdiff, y: val});
    }

    if(!this.holdChecked) {
      this.showVal(val);
    }
  }

  getUnit(val) {
    var unit = '';

    if(this.range=='u') {
      unit = 'u';
    } else if(this.range=='m') {
      unit = 'm';
    } else if(this.range=='Auto') {
      if(Math.abs(val)<0.001) {
        unit = 'u';
      }
      else if(Math.abs(val)<1.0) {
        unit = 'm';
      }
    }

    return unit;
  }

  getDispVal(val, unit) {

    if(this.range=='u') {
      val = val*1000000.0;
    } else if(this.range=='m') {
      val = val*1000.0;
    }

    var splitVal = String(Math.abs(val)).split('.');
    if(!splitVal[1]) {
      return val.toFixed(3);
    } else {
      var len = splitVal[0].length;
      if(len>4) {
        return Math.round(val);
      } else {
        return val.toFixed(4-len);
      }
    }
  }


  showVal(val) {

    var dispVal = document.getElementById(this.id + '-disp-val');
    var dispUnit = document.getElementById(this.id + '-disp-unit');

    this.unit = this.getUnit(val);
    dispUnit.innerHTML = this.unit + this.mode;
    dispVal.innerHTML = this.getDispVal(val, this.unit);
  }

  clearStat() {
    var dispMax = document.getElementById(this.id + '-stat-max');
    var dispMin = document.getElementById(this.id + '-stat-min');
    var dispAve = document.getElementById(this.id + '-stat-ave');
    dispMax.innerHTML = '';
    dispMin.innerHTML = '';
    dispAve.innerHTML = '';
  }

  showStat(x1, x2) {

    var dispMax = document.getElementById(this.id + '-stat-max');
    var dispMin = document.getElementById(this.id + '-stat-min');
    var dispAve = document.getElementById(this.id + '-stat-ave');

    let i = 0;
    let len = this.plotdat_.length;

    while(i<len && this.plotdat_[i]['x']<x1) {
      i++;
    }

    var max=this.plotdat_[i]['y'];
    var min=this.plotdat_[i]['y'];
    var ave=this.plotdat_[i]['y'];
    var num = 1;
    i++;

    while(i<len && this.plotdat_[i]['x']<x2) {
      ave += this.plotdat_[i]['y'];
      num++;
      if(max<this.plotdat_[i]['y']) {
        max=this.plotdat_[i]['y'];
      } else if (min>this.plotdat_[i]['y']) {
        min=this.plotdat_[i]['y'];
      }
      i++;
    }

    ave = ave / num;
    console.log('Max:' + max);
    console.log('Min:' + min);
    console.log('Ave:' + ave);
    console.log('Num:' + num);


    dispMax.innerHTML = this.getDispVal(max, this.unit);
    dispMin.innerHTML = this.getDispVal(min, this.unit);
    dispAve.innerHTML = this.getDispVal(ave, this.unit);
  }

}

module.exports = Dmmctrl;
