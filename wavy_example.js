// License information: The MIT License
//
// Copyright (c) 2016 Chris Schalick All Rights Reserved.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of 
// this software and associated documentation files (the "Software"), to deal in 
// the Software without restriction, including without limitation the rights to use, 
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the 
// Software, and to permit persons to whom the Software is furnished to do so, 
// subject to the following conditions:
//
//   The above copyright notice and this permission notice shall be included in all 
//   copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION 
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE 
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

function err(e){
  var msg = document.getElementById("msg");
  msg.innerHTML += e + "<br>";
}

var html5_snd = function(){};
html5_snd.prototype.audio_ctx = null;
html5_snd.prototype.init = function(err_cb){
  try{
    window.AudioContext = window.AudioContext||window.webkitAudioContext;
    html5_snd.prototype.audio_ctx = new AudioContext();
  } catch(e){
    err_cb(e);
  }
};

html5_snd.prototype.play = function(snd){
  var ctx = this.audio_ctx;
  var me = this;
  this.audio_ctx.decodeAudioData(snd).then(
    function(bfr){
      if(me.is_playing)
        me.stop();
      me.is_playing = true;
      me.src = ctx.createBufferSource();
      me.src.buffer = bfr;
      me.src.connect(ctx.destination);
      me.src.loop = false;
      me.src.start();
    },
    function(e){out.innerHTML += "decoding failed: " + e + "<br>";}
  );
};

html5_snd.prototype.stop = function(){
  if(typeof this.src != "undefined"){
    this.src.stop();
  }
  this.is_playing = false;
};

var sound = new html5_snd;
sound.init(err);

var user = new wavyjs; 
var tremelo = new wavyjs;

document.getElementById("user").onchange = function(){
  var f = document.getElementById("user");
  var start = new Date();
  user.load_file(f, function(){console.log("wav file loaded");show_params();});
  elapsed_time(start);
};

function do_tremelo(){
  tremelo = new wavyjs;
  tremelo.make(user.channels, user.rate, user.bits, user.samples, user.type);
  var p1 = document.getElementById("period1").value * user.rate;
  var len = tremelo.samples;
  var amp = user.get_sample(0, 0);
  var ch;
  for(var ch = 0; ch < user.channels; ch++){
    for(var x = 0; x < len; x++){
      amp = user.get_sample(x, ch);
      amp = amp * Math.cos(x / p1 * 2 * 3.14159);
      if(user.type == 0x1)
        amp = parseInt(amp);
      tremelo.set_sample(x, ch, amp);
    }
  }
}

function process(){
  out.innerHTML += "creating tremelo...<br>";
  var start = new Date();
  function do_tr(){
    do_tremelo();
    out.innerHTML += "tremelo ready<br>";
    elapsed_time(start);
  };
  setTimeout(do_tr, 10);
};

function play(name){
  if(name == "user"){
    out.innerHTML += "playing sound...<br>";
    sound.play(user.audio());
  } if(name == "tremelo"){
    out.innerHTML += "playing sound<br>";
    sound.play(tremelo.audio());
    out.innerHTML += "playing sound...<br>";
  }
};

function stop(){
  sound.stop();
  out.innerHTML += "sound stopped<br>";
};

function save(name){
  console.log("saving wav file");
  tremelo.save(tremelo.raw, name);
  console.log("saved");
};

function show_params(){
  out.innerHTML = "File: " + document.getElementById("user").name + "<br>";
  out.innerHTML += "Audio Channels: " + user.channels + "<br>";
  out.innerHTML += "Bits / Sample: " + user.bits + "<br>";
  out.innerHTML += "Samples: " + user.samples + "<br>";
  var max = user.get_sample(0, 0);
  var data;
  for(var x = 0; x < user.samples; x++){
    data = user.pop_sample();
    if(data > max)
      max = data;
  }

  var lim = Math.pow(2, (user.bits - 1));
  out.innerHTML += "Peak: " + max + " of " + lim + "<br>";
}

function elapsed_time(start){
  var end = new Date();
  out.innerHTML += "elapsed time: " + (end - start) / 1000.0 + " seconds<br>";
}
