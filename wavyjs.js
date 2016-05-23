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

function wavyjs(){
  this.me = wavyjs.count++;
  this.rptr = 0;
  this.wptr = 0;
  this.fmt = 0;
  this.data = 0;
  this.rate = 0;
  this.channels = 0;
  this.bits = 0;
  this.bytes = 0;
  this.inc = 0;
  this.samples = 0;
  this.raw = null;
  this.sound = null;
};

// instance counter
wavyjs.count = 0;

// This method allocates space for waveform data in the 
// object and sets up the wav file headers. The headers
// describe the size and content of the file in the 1st 
// 44 bytes. Wav files are split into "chunks" that have a 
// name, size and data. This only uses one RIFF, fmt and 
// data chunk. The fmt and data chunk are contained in 
// children of the RIFF chunk. All numeric and data values
// are stored little endian (LSB first) because this is 
// a Windows format.
wavyjs.prototype.make = function(channels, smprate, bits, samples){
  this.channels = channels;
  this.rate     = smprate;
  this.bits     = bits;
  this.inc      = bits / 8;
  this.bytes    = this.inc * channels;
  this.inc      = bits / 8;
  this.samples  = samples;
  var total     = 44 + samples * channels * bits / 8;
  var byterate  = smprate * bits / 8 * channels;
  this.raw      = new ArrayBuffer(total);
  this.sound    = new DataView(this.raw);
  this.fmt      = 12;
  this.data     = 36;
  this.rptr     = 40;
  this.wptr     = 40;
                                              // content                endian-ness
  this.sound.setInt32(0,  0x52494646, false); // "RIFF"                 big     |
  this.sound.setInt32(4,  total - 8, true);   // file size - 8 (bytes)  little  |
  this.sound.setInt32(8,  0x57415645, false); // "WAVE"                 big     L____ up to here must match exact
  this.sound.setInt32(12, 0x666d7420, false); // "fmt "                 big     <---- might not be fmt chunk, skip unknown
  this.sound.setInt16(16, 16, true);          // header size            little        LIST chunk in ex, len = 180(xb4)
  this.sound.setInt16(20, 1, true);           // format tag 1 = PCM     little  <---- len of fmt chunk in ex is 18, not 16
  this.sound.setInt16(22, channels, true);    // channels 1 = mono      little  <---- force invsible INFO? chunk w/"wavyjs" 
  this.sound.setInt32(24, smprate, true);     // sample rate            little  <---- sort out info/list headers: title in plyr
  this.sound.setInt32(28, byterate, true);    // bytes/sec              little
  this.sound.setInt16(32, this.bytes, true);  // bytes/sample           little
  this.sound.setInt16(34, bits, true);        // bits/sample            little
  this.sound.setInt32(36, 0x64617461, false); // "data"                 big
  this.sound.setInt32(40, total - 44, true);  // data length            little
};

// waveform setters / getters
wavyjs.prototype.set_sample = function(idx, chan, data){
  var offset = (this.channels * this.bits / 8) * idx + this.data + 4 + chan * this.bits / 8;
  this.wptr = offset;
  if((offset >= this.raw.byteLength) ||
     (offset == undefined))
    return;
  if(this.bits == 8)
    this.sound.setInt8(offset, data);
  else if(this.bits == 16)
    this.sound.setInt16(offset, data, true);
  else if(this.bits == 32)
    this.sound.setInt32(offset, data, true);
};

wavyjs.prototype.push_sample = function(data){
  if((this.wptr >= this.raw.byteLength) ||
     (this.wptr == undefined))
    return;

  if(this.bits == 8)
    this.sound.setInt8(this.wptr, data);
  else if(this.bits == 16)
    this.sound.setInt16(this.wptr, data, true);
  else if(this.bits == 32)
    this.sound.setInt32(this.wptr, data, true);
  this.wptr += this.inc;
};

wavyjs.prototype.get_sample = function(idx, chan){
  var offset = (this.channels * this.bits / 8) * idx + this.data + 4 + chan * this.bits / 8;
  this.rptr = offset;
  if(offset > (this.raw.byteLength - (this.bits / 8)))
    return 0;
  var data;
  if(this.bits == 8)
    data = this.sound.getInt8(offset);
  else if(this.bits == 16)
    data = this.sound.getInt16(offset, true);
  else if(this.bits == 32)
    data = this.sound.setInt32(offset, true);

  return data;
};

wavyjs.prototype.pop_sample = function(){
  if((this.rptr >= this.raw.byteLength) ||
     (this.rptr == undefined))
    return NaN;

  var data;
  if(this.bits == 8)
    data = this.sound.getInt8(this.rptr);
  else if(this.bits == 16)
    data = this.sound.getInt16(this.rptr, true);
  else if(this.bits == 32)
    data = this.sound.setInt32(this.rptr, true);

  this.rptr += this.inc;
  return data;
};

wavyjs.prototype.audio = function(){
  var cp = new ArrayBuffer(this.raw.byteLength);
  var dst = new Uint8Array(cp);
  var src = new Uint8Array(this.raw);
  for(x = 0; x < cp.byteLength; x++)
    dst[x] = src[x];
  return cp;
};

// file i/o routines
wavyjs.prototype.save = function(data, name) {
  var a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";
  var blob = new Blob([data], {type: "octet/stream"});
  var url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = name;
  a.click();
//  window.URL.revokeObjectURL(url);
};

wavyjs.prototype.load_url = function(url, ok_callb, err_callb) {
  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';

  request.onload = function() {
    if(typeof request.response.byteLength == "undefined")
      return;

    context.decodeAudioData(request.response).then(
      function(buffer){ok_callb(buffer);}, 
      function(e){err_callb(e)});
  }
  request.send();
}

wavyjs.prototype.load_file = function(selected, ok_callb, err_callb) {
  if(window.File && window.FileReader && window.FileList && window.Blob){
    var files = selected.files;
    for(var x = 0; x < files.length; x++){
      var size = files[x].size;
      var reader = new FileReader;
      var wavptr = this;
      reader.onload = (function(afile){
        return function(e){
          wavptr.raw = e.target.result;
          wavptr.sound = new DataView(wavptr.raw);
          wavptr.fmt = 12;
          wavptr.data = 36;
          for(var y = 0; y < 1024; y++){
            var sig = wavptr.sound.getInt32(y, false);
            if(sig == 0x666d7420)
              wavptr.fmt = y;
            if(sig == 0x64617461)
              wavptr.data = y;
	  }
          wavptr.parse_header();
          ok_callb();
	};
      })(files[x]);
      reader.readAsArrayBuffer(files[x]);
    }
  } else {
    err_callb("File reader not supported by your browser.");
  }
}

wavyjs.prototype.parse_header = function(){
  if(this.raw == null)
    return 0;
  this.sound = new DataView(this.raw);
  this.bytes = this.sound.getInt16(this.fmt + 20, true);
  this.channels = this.sound.getInt16(this.fmt + 10, true);
  this.rate = this.sound.getInt32(this.fmt + 12, true);
  this.bits = this.sound.getInt16(this.fmt + 22, true);
  this.inc = this.bits / 8;
  var len = this.sound.getInt32(4, true) - this.data - 4;
  this.samples = len / this.channels / (this.bits / 8);
  this.rptr = this.data + 4;
  this.wptr = this.data + 4;
}
