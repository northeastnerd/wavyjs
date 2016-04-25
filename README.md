# wavyjs
javascript RIFF Wav file manipulation routines

# Status
Working for several trial Wav files, performance with large files (40 MB) is an issue - traversing a 40.9 MB file from begin to end takes roughly 66 seconds on a dual core N2840 running Chrome 50 and traversing, manipulating and writing a modified version of the same file in memory takes 110 seconds. Current performance is ~700 KB/s. For small Wav files (samples) it's reasonable, for larger files this may not be the right solution.

# Usage
These routines allow creation and manipulation of Wav file structures in browser memory. The intended use is to generate sounds from algorithms and use them with sounds loaded from files or URLs. Merged results can be saved as Wav files for whatever use.

There is an example HTML file that shows intended use with a Wav file loader and a tremelo generator. The loaded sound is amplitude modulated by a sin wave with a user selected frequency. The original and "tremulated" sounds can be played and the modulated sound saved to a file.
