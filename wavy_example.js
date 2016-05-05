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
  this.audio_ctx.decodeAudioData(snd).then(
    function(bfr){
      var src = ctx.createBufferSource();
      src.buffer = bfr;
      src.connect(ctx.destination);
      src.start();
    },
    function(e){out.innerHTML += "decoding failed: " + e + "<br>";}
  );
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
  delete tremelo;
  tremelo = new wavyjs;
  tremelo.make(user.channels, user.rate, user.bits, user.samples);
  var p1 = document.getElementById("period1").value * user.rate;
  var len = tremelo.samples;
  var amp = user.get_sample(0, 0);
  for(var x = 0; x < len; x++){
    amp = user.pop_sample();
    amp = parseInt(amp * Math.cos(x / p1 * 2 * 3.14159));
    tremelo.push_sample(amp);
    for(var ch = 1; ch < user.channels; ch++){
      amp = user.pop_sample();
      tremelo.push_sample(amp);
    }
  }
}

function process(){
  console.log("creating tremelo");
  var start = new Date();
  do_tremelo();
  console.log("tremelo ready");
  elapsed_time(start);
};

function play(name){
  if(name == "user")
    sound.play(user.audio());
  if(name == "tremelo"){
    console.log("playing sound");
    sound.play(tremelo.audio());
    console.log("sound playing");
  }
};

function save(name){
  console.log("saving wav file");
  tremelo.save(name);
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
  console.log("elapsed time: " + (end - start) / 1000.0 + " seconds");
}
