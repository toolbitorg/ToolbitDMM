
class Dmmctrl {

  constructor(id) {
    this.id = id;

    const Dmm=require('toolbit-lib').Dmm;
    this.dmm_ = new Dmm();
    this.mode;
    this.range;
    this.holdChecked = false;

    this.init();
  }

  get dmm() {
    return this.dmm_;
  }

  init() {
    var divElem = document.getElementById(this.id);
    divElem.innerHTML =
    '<div id="top" class="clearfix">'+
    '  <div>'+
    '    <input id="' + this.id + 'disp-val" class="disp-val" type="text" name="value" readonly="readonly">'+
    '    <input id="' + this.id + 'disp-unit" class="disp-unit" type="text" name="unit" readonly="readonly">'+
    '  </div>'+
    '  <div class="top-right">'+
    '    <select id="' + this.id + 'range" name="range" class="mode">'+
    '      <option selected="selected">Auto</option>'+
    '      <option></option>'+
    '      <option>m</option>'+
    '      <option>u</option>'+
    '    </select>'+
    '    <br>'+
    '    <select id="' + this.id + 'mode" name="mode" class="mode">'+
    '      <option selected="selected">V</option>'+
    '      <option>A</option>'+
    '    </select>'+
    '  </div>'+
    '</div>';

    this.mode = document.getElementById(this.id + 'mode').value;
    this.range = document.getElementById(this.id + 'range').value;

    document.getElementById(this.id + 'mode').addEventListener('change', (event) => {
      this.mode = event.target.value;
      clearGraph = true;
    });
    document.getElementById(this.id + 'range').addEventListener('change', (event) => {
      this.range = event.target.value;
    });
  }

  hold(val) {
    this.holdChecked = val;
  }

  acquisition() {
    var val;

    if(this.mode=='V') {
      val = this.dmm_.getVoltage();
    } else if(this.mode=='A') {
      val = this.dmm_.getCurrent();
    };

    if(!this.holdChecked) {
      this.showVal(val);
    }

    return val;
  }

  showVal(val) {

    var unit = '';
    var dispVal = document.getElementById(this.id + 'disp-val');
    var dispUnit = document.getElementById(this.id + 'disp-unit');

    if(this.range=='u') {
      val = val*1000000.0;
      unit = 'u';
    } else if(this.range=='m') {
      val = val*1000.0;
      unit = 'm';
    } else if(this.range=='Auto') {
      if(Math.abs(val)<0.001) {
        val = val*1000000.0;
        unit = 'u';
      }
      else if(Math.abs(val)<1.0) {
        val = val*1000.0;
        unit = 'm';
      }
    }

    var splitVal = String(Math.abs(val)).split('.');
    if(!splitVal[1]) {
      dispVal.value = val.toFixed(3);
    } else {
      var len = splitVal[0].length;
      if(len>4) {
        dispVal.value = Math.round(val);
      } else {
        dispVal.value = val.toFixed(4-len);
      }
    }
    dispUnit.value = unit + this.mode;
  }
}

module.exports = Dmmctrl;
