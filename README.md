# wavyjs
javascript RIFF Wav file manipulation routines

# Status
Working for all the Wav files I tried with Chrome v.50, IE11 does not work.

Performance with large files (40 MB) is an issue - traversing a 40.9 MB file from begin to end takes roughly 66 seconds on a dual core N2840 running Chrome 50 and traversing, manipulating and writing a modified version of the same file in memory takes 110 seconds. Current performance is ~700 KB/s. For small Wav files (samples) it's reasonable, for larger files (songs) this may not be an ideal solution.

There is a live demo here: http://northeastnerd.net/northeastnerd.html?post=2

# Usage
These routines allow creation and manipulation of Wav file structures in browser memory. The intended use is to generate sounds from algorithms and use them with sounds loaded from files or URLs. Merged results can be saved as Wav files for whatever use.

There is an example HTML file that shows intended use with a Wav file loader and a tremelo generator. The loaded sound is amplitude modulated by a sin wave with a user selected frequency. The original and "tremulated" sounds can be played and the modulated sound saved to a file.

The example reads a Wav file and traverses it to find the peak amplitude which is reported with sampling information. You can enter a tremelo frequency (try 0.3) and click Play Tremelo to here how it sounds and save it to a Wav file with the Save button. This isn't a useful app, just a way to try the Wav library.
