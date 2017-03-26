/*
License information: The MIT License

Copyright (c) 2016 Chris Schalick All Rights Reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy of 
this software and associated documentation files (the "Software"), to deal in 
the Software without restriction, including without limitation the rights to use, 
copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the 
Software, and to permit persons to whom the Software is furnished to do so, 
subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all 
  copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION 
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE 
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

function wavyjs(){
  this.me       = wavyjs.count++;
  this.filename = "";
  this.rptr     = 0;
  this.wptr     = 0;
  this.fmt      = 0;
  this.data     = 0;    // location of "data" marker 
  this.rate     = 0;
  this.channels = 0;
  this.bits     = 0;
  this.bytes    = 0;
  this.inc      = 0;
  this.samples  = 0;
  this.raw      = null;
  this.sound    = null;
  this.max      = [];
  this.max_idx  = [];
  this.avg      = [];
};

// instance counter
wavyjs.count    = 0;

// 24 bit typed array access functions
DataView.prototype.getInt24 = function(idx){
  return (this.getInt16(idx) << 8) + this.getInt8(idx + 2);
}
 
DataView.prototype.setInt24 = function(idx, val){
  this.setInt16(idx, val >> 8);
  this.setInt8(idx + 2, val & 0xff);
}

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
  this.samples  = Math.round(samples);
  var total     = 44 + this.samples * channels * bits / 8;
  var byterate  = smprate * bits / 8 * channels;
  this.raw      = new ArrayBuffer(total);
  this.sound    = new DataView(this.raw);
  this.fmt      = 12;
  this.data     = 36;
  this.rptr     = 44;
  this.wptr     = 44;
                                              // content                endian-ness
  this.sound.setInt32(0,  0x52494646, false); // "RIFF"                 big     |
  this.sound.setInt32(4,  total - 8,  true);  // file size - 8 (bytes)  little  |
  this.sound.setInt32(8,  0x57415645, false); // "WAVE"                 big     L____ up to here must match exact
  this.sound.setInt32(12, 0x666d7420, false); // "fmt "                 big     <---- might not be fmt chunk, skip unknown
  this.sound.setInt16(16, 16,         true);  // header size            little        LIST chunk in ex, len = 180(xb4)
  this.sound.setInt16(20, 1,          true);  // format tag 1 = PCM     little  <---- len of fmt chunk in ex is 18, not 16
  this.sound.setInt16(22, channels,   true);  // channels 1 = mono      little  <---- force invsible INFO? chunk w/"wavyjs" 
  this.sound.setInt32(24, smprate,    true);  // sample rate            little  <---- sort out info/list headers: title in plyr
  this.sound.setInt32(28, byterate,   true);  // bytes/sec              little
  this.sound.setInt16(32, this.bytes, true);  // bytes/sample           little
  this.sound.setInt16(34, bits,       true);  // bits/sample            little
  this.sound.setInt32(36, 0x64617461, false); // "data"                 big
  this.sound.setInt32(40, total - 44, true);  // data length            little

  var s, c;
  for(s = 0; s < this.samples; s++)
    for(c = 0; c < channels; c++)
      this.set_sample(s, c, 0);

  this.rptr = 44;
  this.wptr = 44;
};

// waveform setters / getters
wavyjs.prototype.set_sample = function(idx, chan, data){
  var safe_idx = Math.round(idx);
  var safe_chan = (chan > (this.channels - 1)) ? 0 : chan;
  var offset = (this.channels * this.bits / 8) * safe_idx + this.data + 8 + safe_chan * this.bits / 8; 
  this.wptr = offset;
  if((safe_idx > this.samples) || 
     (offset >= this.raw.byteLength) ||
     (offset == undefined))
    return;
  if(this.bits == 8)
    this.sound.setUint8(offset, data + 128);
  else if(this.bits == 16)
    this.sound.setInt16(offset, data, true);
  else if(this.bits == 24)
    this.sound.setInt24(offset, data, true);
  else if(this.bits == 32)
    this.sound.setInt32(offset, data, true);
};

wavyjs.prototype.push_sample = function(data){
  if((this.wptr >= this.raw.byteLength) ||
     (this.wptr == undefined))
    return;

  if(this.bits == 8)
    this.sound.setUint8(this.wptr, data + 128);
  else if(this.bits == 16)
    this.sound.setInt16(this.wptr, data, true);
  else if(this.bits == 24)
    this.sound.setInt24(this.wptr, data, true);
  else if(this.bits == 32)
    this.sound.setInt32(this.wptr, data, true);
  this.wptr += this.inc;
};

wavyjs.prototype.get_sample = function(idx, chan){
  var safe_idx = Math.round(idx);
  var safe_chan = (chan > (this.channels - 1)) ? 0 : chan;
  var offset = (this.channels * this.bits / 8) * safe_idx + this.data + 8 + safe_chan * this.bits / 8; 
  this.rptr = offset;
  if((safe_idx > this.samples) ||
     (offset > (this.raw.byteLength - (this.bits / 8))))
    return 0;
  var data;
  if(this.bits == 8)
    data = this.sound.getUint8(offset) - 128;
  else if(this.bits == 16)
    data = this.sound.getInt16(offset, true);
  else if(this.bits == 24)
    data = this.sound.getInt24(offset, true);
  else if(this.bits == 32)
    data = this.sound.getInt32(offset, true);

  return data;
};

wavyjs.prototype.pop_sample = function(){
  if((this.rptr >= this.raw.byteLength) ||
     (this.rptr == undefined))
    return NaN;

  var data;
  if(this.bits == 8)
    data = this.sound.getUint8(this.rptr) - 128;
  else if(this.bits == 16)
    data = this.sound.getInt16(this.rptr, true);
  else if(this.bits == 24)
    data = this.sound.getInt24(this.rptr, true);
  else if(this.bits == 32)
    data = this.sound.getInt32(this.rptr, true);

  this.rptr += this.inc;
  return data;
};

wavyjs.prototype.audio = function(){
  var cp  = new ArrayBuffer(this.raw.byteLength);
  var dst = new Uint8Array(cp);
  var src = new Uint8Array(this.raw);
  for(x = 0; x < cp.byteLength; x++)
    dst[x] = src[x];
  return cp;
};

// file i/o routines
wavyjs.prototype.save = function(data, name) {
  var a    = document.createElement("a");
  document.body.appendChild(a);
  a.style  = "display: none";
  var blob = new Blob([data], {type: "octet/stream"});
  var url  = window.URL.createObjectURL(blob);
  a.href   = url;
  a.download = name;
  a.click();
//  window.URL.revokeObjectURL(url);
};

wavyjs.prototype.bfr_to_b64 = function(bfr){
  var i, bin = '';
  var bytes = new Uint8Array(bfr);
  var len = bytes.byteLength;

  for(i = 0; i < len; i++)
    bin += String.fromCharCode(bytes[i]);

  return window.btoa(bin);
}

wavyjs.prototype.b64_to_bfr = function(b64){
  var i, bin_str = window.atob(b64);
  var len = bin_str.length;
  var bytes = new Uint8Array(len);

  for(i = 0; i < len; i++)
    bytes[i] = bin_str.charCodeAt(i);

  return bytes.buffer;
}

wavyjs.prototype.to_json = function(){
  var wav, txt;
  wav = this;
  wav.raw = this.bfr_to_b64(this.raw);
  var txt = JSON.stringify(wav);

  return txt;
};

wavyjs.prototype.from_json = function(data){
  var a, wav = new wavyjs;

  for(p in data){
    if(data.hasOwnProperty(p))
    wav[p] = data[p];
  }
  wav.raw = wav.b64_to_bfr(data.raw);
  wav.parse_header();

  return wav;
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
      var size   = files[x].size;
      var reader = new FileReader;
      var wavptr = this;
      var fname  = files[x].name;
      reader.onload = (function(afile){
        return function(e){
          wavptr.raw      = e.target.result;
          wavptr.sound    = new DataView(wavptr.raw);
          wavptr.fmt      = 12;
          wavptr.data     = 36;
          wavptr.filename = fname;
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
  this.sound    = new DataView(this.raw);
  this.bytes    = this.sound.getInt16(this.fmt + 20, true);
  this.channels = this.sound.getInt16(this.fmt + 10, true);
  this.rate     = this.sound.getInt32(this.fmt + 12, true);
  this.bits     = this.sound.getInt16(this.fmt + 22, true);
  this.inc      = this.bits / 8;
  var len       = this.sound.getInt32(this.data + 4, true); 
  this.samples  = len / this.channels / (this.bits / 8);
  this.rptr     = this.data + 8; 
  this.wptr     = this.data + 8; 
}

wavyjs.prototype.get_stats = function(){
  var ch, idx, smp;
  for(ch = 0; ch < this.channels; ch++){
    this.max[ch]     = 0;
    this.max_idx[ch] = 0;
    this.avg[ch]     = 0;
  }
  for(idx = 0; idx < this.samples; idx++){
    for(ch = 0; ch < this.channels; ch++){
      smp  = this.get_sample(idx, ch);
      this.avg[ch] += smp;
      if(Math.abs(smp) > this.max[ch]){
        this.max[ch]     = Math.abs(smp);
        this.max_idx[ch] = idx;
      }
    }
  }
  idx = 0;
  for(ch = 0; ch < this.channels; ch++)
    idx += this.max_idx[ch];
  this.max_idx = idx / this.channels;
}

// wavyjs.prototype.reformat = function(sound1, sound2){} returns sound1 formatted in sound2 format
//   for channel expansion from m to n, m/n amplitude on all n chans
//   re-sample, scale bits as needed
// wavyjs.prototype.pan     = function(start, end){} params are 0-1, 0 = left, 1 = right
// wavyjs.prototype.fade    = function(start, end){} fade from start * amp linear to end * amp
// wavyjs.prototype.tremelo = function(min, max, rate){} sin(rate) * (max - min) + min * amp
// wavyjs.prototype.reverb  = function(?){}

wavyjs.prototype.mix = function(src, dst_offset, src_offset, vol = 1.0){
  var safe_s_off = Math.round(src_offset);
  var safe_d_off = Math.round(dst_offset);
  var ch, id, is, sd, ss;
  for(ch = 0; ch < this.channels; ch++){
    for(is = 0; is < src.samples; is++){
      id = safe_d_off + (is - safe_s_off);
      if((id >= 0) && (id < this.samples)){
        sd = this.get_sample(id, ch);
        ss = src.get_sample(is, ch);
        sd = sd + ss * vol;
        this.set_sample(id, ch, sd);
      }
    }
  }
}
