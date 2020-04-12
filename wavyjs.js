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
  "use strict";
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
  this.type     = 0;
  this.samples  = 0;
  this.raw      = null;
  this.sound    = null;
  this.max      = [];
  this.max_idx  = [];
  this.avg      = [];
  this.abslim   = 0;
};

// instance counter
wavyjs.count    = 0;

// little endian 24 bit access (ls byte first)
DataView.prototype.getInt24 = function(idx){
  "use strict";
  var val = this.getUint8(idx) + (this.getUint8(idx + 1) << 8) + (this.getUint8(idx + 2) << 16);
  if(val & 0x800000)
    val = val - 0x1000000;
  return val;
}
 
// little endian 24 bit storage (ls byte first)
DataView.prototype.setInt24 = function(idx, val){
  "use strict";
  var pval = val;
  if(val < 0)
    pval = val + 0x1000000;
  this.setUint8(idx, pval & 0xff);
  this.setUint8(idx + 1, (pval & 0xff00) >> 8);
  this.setUint8(idx + 2, (pval & 0xff0000) >> 16);
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
wavyjs.prototype.make = function(channels, smprate, bits, samples, data_enc = 0x1){
  this.channels = channels;
  this.rate     = smprate;
  this.bits     = bits;
  this.abslim   = Math.pow(2, (bits - 1));
  this.inc      = bits / 8;
  this.type     = data_enc;
  this.bytes    = this.inc * channels;
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
  this.sound.setInt16(20, this.type,  true);  // format tag 1 = PCM     little  <---- len of fmt chunk in ex is 18, not 16
                                              // format tag 3 = IEEE floating point
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
  "use strict";
  var safe_idx = Math.round(idx);
  var safe_chan = (chan > (this.channels - 1)) ? 0 : chan;
  var offset = (this.channels * this.inc) * safe_idx + this.data + 8 + safe_chan * this.inc; 
  var safe_data = (this.type == 0x3) ? data : Math.round(data);
  this.wptr = offset;
  if(this.raw == null)
    return;
  if((safe_idx > this.samples) || 
     (offset >= this.raw.byteLength) ||
     (offset == undefined))
    return;
  if(this.bits == 8){
    this.sound.setUint8(offset, safe_data + 128);
  } else if(this.bits == 16){
    this.sound.setInt16(offset, safe_data, true);
  } else if(this.bits == 24){
    this.sound.setInt24(offset, safe_data, true);
  } else if((this.bits == 32) && (this.type == 0x1)){
    this.sound.setInt32(offset, safe_data, true);
  } else if((this.bits == 32) && (this.type == 0x3))
    this.sound.setFloat32(offset, safe_data, true);
};

wavyjs.prototype.push_sample = function(data){
  "use strict";
  if(this.raw == null)
    return;
  if((this.wptr >= this.raw.byteLength) ||
     (this.wptr == undefined))
    return;

  if(this.bits == 8)
    this.sound.setUint8(this.wptr, data + 128);
  else if(this.bits == 16)
    this.sound.setInt16(this.wptr, data, true);
  else if(this.bits == 24)
    this.sound.setInt24(this.wptr, data, true);
  else if((this.bits == 32) && (this.type == 0x1))
    this.sound.setInt32(this.wptr, data, true);
  else if((this.bits == 32) && (this.type == 0x3))
    this.sound.setFloat32(this.wptr, data, true);
  this.wptr += this.inc;
};

wavyjs.prototype.get_sample = function(idx, chan){
  "use strict";
  var safe_idx = Math.round(idx);
  var safe_chan = (chan > (this.channels - 1)) ? 0 : chan;
//  var offset = (this.channels * this.bits / 8) * safe_idx + this.data + 8 + safe_chan * this.bits / 8; 
  var offset = (this.channels * this.inc) * safe_idx + this.data + 8 + safe_chan * this.inc; 
  this.rptr = offset;
  if(this.raw == null)
    return NaN;
  if((safe_idx > this.samples) ||
     (offset > (this.raw.byteLength - this.inc)))
//     (offset > (this.raw.byteLength - (this.bits / 8))))
    return 0;
  var data;
  if(this.bits == 8)
    data = this.sound.getUint8(offset) - 128;
  else if(this.bits == 16)
    data = this.sound.getInt16(offset, true);
  else if(this.bits == 24)
    data = this.sound.getInt24(offset, true);
  else if((this.bits == 32) && (this.type == 0x1))
    data = this.sound.getInt32(offset, true);
  else if((this.bits == 32) && (this.type == 0x3))
    data = this.sound.getFloat32(offset, true);

  return data;
};

wavyjs.prototype.pop_sample = function(){
  "use strict";
  if(this.raw == null)
    return NaN;
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
  else if((this.bits == 32) && (this.type == 0x1))
    data = this.sound.getInt32(this.rptr, true);
  else if((this.bits == 32) && (this.type == 0x3))
    data = this.sound.getFloat32(this.rptr, true);

  this.rptr += this.inc;
  return data;
};

wavyjs.prototype.audio = function(){
  "use strict";
  var len = this.raw == null ? 0 : this.raw.byteLength;
  var cp  = new ArrayBuffer(len);
  var dst = new Uint8Array(cp);
  var src = new Uint8Array(this.raw);
  var x;
  for(x = 0; x < cp.byteLength; x++)
    dst[x] = src[x];
  return cp;
};

// file i/o routines
wavyjs.prototype.save = function(data, name) {
  "use strict";
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
  "use strict";
  var i, bin = '';
  var bytes = new Uint8Array(bfr);
  var len = bytes.byteLength;

  for(i = 0; i < len; i++)
    bin += String.fromCharCode(bytes[i]);

  return window.btoa(bin);
}

wavyjs.prototype.b64_to_bfr = function(b64){
  "use strict";
  var i, bin_str = window.atob(b64);
  var len = bin_str.length;
  var bytes = new Uint8Array(len);

  for(i = 0; i < len; i++)
    bytes[i] = bin_str.charCodeAt(i);

  return bytes.buffer;
}

wavyjs.prototype.to_json = function(){
  "use strict";
  var wav, txt;
  wav = this;
  wav.raw = this.bfr_to_b64(this.raw);
  txt = JSON.stringify(wav);

  return txt;
};

wavyjs.prototype.from_json = function(data){
  "use strict";
  var a, p, wav = new wavyjs;

  for(p in data){
    if(data.hasOwnProperty(p))
    wav[p] = data[p];
  }
  wav.raw = wav.b64_to_bfr(data.raw);
  wav.parse_header();

  return wav;
};

wavyjs.prototype.load_url = function(url, ok_callb, err_callb) {
  "use strict";
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
  "use strict";
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
  "use strict";
  var ch, smp, raw, flt, raw_view, dec;
  if(this.raw == null)
    return 0;
  this.sound    = new DataView(this.raw);
  this.type     = this.sound.getInt16(this.fmt + 8,  true);
  this.bytes    = this.sound.getInt16(this.fmt + 20, true);
  this.channels = this.sound.getInt16(this.fmt + 10, true);
  this.rate     = this.sound.getInt32(this.fmt + 12, true);
  this.bits     = this.sound.getInt16(this.fmt + 22, true);
  if(this.type == 0x3)
    this.abslim = 1.0;
  else
    this.abslim = Math.pow(2, (this.bits - 1));
  this.inc      = this.bits / 8; // this.bytes;
  var len       = this.sound.getInt32(this.data + 4, true); 
  this.samples  = len / this.channels / this.inc; // (this.bits / 8);
  this.rptr     = this.data + 8; 
  this.wptr     = this.data + 8; 

  // check if the imported data is floating point, if so convert it
  if(this.type == 0x3)
    console.log("NOTE: WAV file data is floating point.");
}

wavyjs.prototype.get_stats = function(){
  "use strict";
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

wavyjs.prototype.resample = function(rate, bits){
  "use strict";
  var s, c, s1, s2, sx, dx, si, di, dn, rs, delta, scale;

  // if there's nothing to do just return
  if((rate == this.rate) && (bits == this.bits))
    return this;

  // figure out time increment of new and old formats
  si = 1 / this.rate;
  di = 1 / rate;
  dn = Math.round(this.samples * rate / this.rate);

  // figure out scale factor for old to new format
  scale = Math.pow(2, bits - 1) / Math.pow(2, this.bits - 1);

  // create a new object to hold the resampled data
  rs = new wavyjs;
  rs.make(this.channels, rate, bits, dn);

  // loop through re-sampling to new array
  for(c = 0; c < this.channels; c++){
    for(dx = 0; dx < dn; dx++){
      sx = Math.trunc(dx * di / si);
      s1 = this.get_sample(sx, c);
      s2 = this.get_sample(sx + 1, c);
      delta = dx * di - sx * si;
      s = s1 + (s2 - s1) * delta / si;
      s = s * scale;
      if(this.type == 0x3)
        s = this.float_to_int(s, bits);
      rs.set_sample(dx, c, s);
    }
  }

  // return re-sampled data
  return rs;
}

wavyjs.prototype.float_to_int = function(val, bits){
  "use strict";
  var max = Math.pow(2, (bits - 1));
  var ival = val * max;
  return ival;
}

wavyjs.prototype.int_to_float = function(val, bits){
  "use strict";
  var max = Math.pow(2, (bits - 1));
  var fval = val / max;
  return fval;
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

// this returns an object with a clip of a portion of the sound in 
// the wav file at the given indices
wavyjs.prototype.copy_clip = function(start, end){
  "use strict";
  var safe_start = Math.trunc(start);
  var safe_end = Math.trunc(end);
  var bytes = this.bytes * (safe_end - safe_start);
  var smps = new ArrayBuffer(bytes);
  var dst = new Uint8Array(smps);
  var src = new Uint8Array(this.raw);
  var s, b;
  for(s = safe_start; s < safe_end; s++){
    for(b = 0; b < this.bytes; b++){
      dst[(s - safe_start) * this.bytes + b] = src[44 + s * this.bytes + b];
    }
  }

  var clip = {start: safe_start, end: safe_end, type: this.type, data: smps};
  return clip;
};

// this takes an object in the format of copy_clip and pastes it into 
// the wav file at the given indices
wavyjs.prototype.paste_clip = function(clip){
  "use strict";
  var dst = new Uint8Array(this.raw);
  var src = new Uint8Array(clip.data);
  var bytes = this.bytes * (clip.end - clip.start);
  var s, b;
  for(s = clip.start; s < clip.end; s++){
    for(b = 0; b < this.bytes; b++){
      dst[44 + s * this.bytes + b] = src[(s - clip.start) * this.bytes + b];
    }
  }
};
