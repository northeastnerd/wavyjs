# wavyjs
Zero dependency javascript RIFF Wav file manipulation routines.

# Usage
These routines do creation and manipulation of Wav file structures in browser memory. The intended uses are for generating sounds from algorithms and / or manipulating existing sound files loaded from files or URLs. Modified results can be saved as Wav files or played as desired.

The project has an example HTML and script file that shows intended use with a Wav file loader and a tremelo generator. The loaded sound is amplitude modulated by a sin wave with a user selected frequency on the first audio channel (ie, left in a stereo file). The original and "tremulated" sounds can be played and the modulated sound saved to a file.

You can create Wav structures from scratch by calling the make() method with desired waveform parameters. The wave properties are attached to the returned object along with allocated space for waveform data. The same structure is returned when reading a Wav file from disk with the allocated space filled in from audio in the file.

There are methods to set and get individual samples called set_sample() and get_sample(). These take index and channel number arguments so you can random access read and write sample data. Those routines also set pointers used for auto-increment routines used to traverse the waveforms called push_sample() and pop_sample(). Pop doesn't actually remove the sample, it returns sample data and advances the read pointer. Same for push - it doesn't allocate space, it overwrites sample data and advances the write pointer.The push and pop methods operate on single samples so the caller has to deal with unique channels (ie, if you push the left channel data in a stereo file the write pointer advances to the right channel not the next left channel sample). Typical expected sequencing is to call set_sample(0, 0, 0) then iterate through sample data with push_sample(new_values).

The example reads a Wav file and traverses it to find the peak amplitude which is reported with sampling information. You can enter a tremelo frequency (try 0.3) and click Make Tremelo, then Play Tremelo to here how it sounds and save it to a Wav file with the Save button. The demo has some useful information written to the browser console, like how long conversion takes. This isn't a useful app, just a way to try the Wavyjs library.

Have fun!

There is a live demo here: https://rawgit.com/northeastnerd/wavyjs/master/wavyjs.html

# Status
## Version 0.3
32 bit floating point sample support was added, project is stable and in use for a while.

## Version 0.2
There were some problems with consistency in internal function calling parameters that were causing the mix function to generate clicks and distortion, which are now fixed.

Preliminary 24 bit sample support was added.

## Version 0.1
Performance enhancements done, it is 5x-10x faster now, and is usable for song length material. It processes Wav data at roughly 6 mB / Sec. Traversing a 4 minute CD quality track takes about 10 seconds on the machine described below (not speedy). Read-modify-write on the same track takes 20 seconds (done in the demo).  On a desktop quad core Q8400 cpu with 8 gB of memory running Chrome it takes about 7 seconds for the r-m-w (I guess it's time for a new laptop :). Firefox takes 9 seconds on the same conversion and plays fine, the Edge browser takes 45 seconds for the same conversion and is persnickity about playing the result.

The interface changed to include push and pop sample routines that auto-increment write and read pointers. They operate on single samples so the caller has to deal with unique channels (ie, if you push the left channel data in a stereo file the write pointer advances to the right channel not the next left channel sample). You can set the pointers by calling set_sample() or get_sample() and providing an index. 

Still no tests, and expect there are some unsupported formats as a result.

## Version 0.0
The library works in all browsers, the demo is working for all the Wav files I tried with Chrome v.50, Firefox 46 and Edge v25.10586.0.0. No formal testing and I believe there are functional gaps (all permutations of Wav formats).

Performance with large files (40 MB) is an issue - traversing a 40.9 MB file from begin to end takes roughly 66 seconds on a dual core N2840 running Chrome 50 and traversing, manipulating and writing a modified version of the same file in memory takes 110 seconds. Current performance is ~700 KB/s. For small Wav files (samples) it's reasonable, for larger files (songs) this may not be an ideal solution.
