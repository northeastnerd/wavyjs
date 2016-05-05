# wavyjs
javascript RIFF Wav file manipulation routines

# Usage
These routines allow creation and manipulation of Wav file structures in browser memory. The intended use is to generate sounds from algorithms and use them with sounds loaded from files or URLs. Merged results can be saved as Wav files for whatever use.

There is an example HTML file that shows intended use with a Wav file loader and a tremelo generator. The loaded sound is amplitude modulated by a sin wave with a user selected frequency on the first audio channel (ie, left in a stereo file). The original and "tremulated" sounds can be played and the modulated sound saved to a file.

There are methods to set and get individual samples called set_sample and get_sample. These take index and channel number arguments so you can random access read and write sample data. Those routines also set pointers used for auto-increment routines used to traverse the waveforms called push_sample() and pop_sample(). Pop doesn't actually remove the sample, it returns sample data and advances the read pointer. The push and pop methods operate on single samples so the caller has to deal with unique channels (ie, if you push the left channel data in a stereo file the write pointer advances to the right channel not the next left channel sample). Typical expected sequencing is to call set_sample(0, 0, 0) then iterate through sample data with push_sample(new_values).

The example reads a Wav file and traverses it to find the peak amplitude which is reported with sampling information. You can enter a tremelo frequency (try 0.3) and click Make Tremelo, then Play Tremelo to here how it sounds and save it to a Wav file with the Save button. This isn't a useful app, just a way to try the Wav library.

Have fun!

# Status
## Version 0.1
Performance enhancements done, roughly 3x faster now, it is usable for song length material. Traversing a 4 minute CD quality track takes about 10 seconds on the machine described below (not speedy). Read-modify-write on the same track takes 20 seconds (done in the demo).  On a desktop quad core Q8400 cpu with 8 gB of memory it takes about 7 seconds for the r-m-w (I guess it's time for a new laptop :).

The interface changed to include push and pop sample routines that auto-increment write and read pointers. They operate on single samples so the caller has to deal with unique channels (ie, if you push the left channel data in a stereo file the write pointer advances to the right channel not the next left channel sample). You can set the pointers by calling set_sample() or get_sample() and providing an index. 

## Version 0.0
The library works in all browsers, the demo is working for all the Wav files I tried with Chrome v.50, Firefox 46 and Edge v25.10586.0.0. No formal testing and I believe there are functional gaps (all permutations of Wav formats).

Performance with large files (40 MB) is an issue - traversing a 40.9 MB file from begin to end takes roughly 66 seconds on a dual core N2840 running Chrome 50 and traversing, manipulating and writing a modified version of the same file in memory takes 110 seconds. Current performance is ~700 KB/s. For small Wav files (samples) it's reasonable, for larger files (songs) this may not be an ideal solution.

There is a live demo here: http://northeastnerd.net/northeastnerd.html?post=2

