# wavyjs
javascript RIFF Wav file manipulation routines

# Status
Working for several trial Wav files, performance with large files (40 MB) is an issue.

# Usage
These routines allow creation and manipulation of Wav file structures in browser memory. The intended use is to generate sounds from algorithms and use them with sounds loaded from files or URLs. Merged results can be saved as Wav files for whatever use.

There is an example HTML file that shows intended use with a Wav file loader and a tremelo generator. The loaded sound is amplitude modulated by a sin wave with a user selected frequency. The original and "tremulated" sounds can be played and the modulated sound saved to a file.
