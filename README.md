# wavyjs
javascript RIFF Wav file manipulation routines

# Status
Working for simple Wav files, needs improved support for non-standard headers.

# Usage
These routines allow creation and manipulation of Wav file structures in browser memory. The intended use is to generate sounds from algorithms and use them with sounds loaded from files or URLs. Merged results can be saved as Wav files for whatever use.

The example HTML file has a file loader and a waveform generator. The waveform is used to envelope / amplitude modulate the loaded file and you can play and save the result.
