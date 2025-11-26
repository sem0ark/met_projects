While being a rather interesting idea of making an actual simulation of how the crocheted work will behave based on joints simulation, it is still far from perfect, so I want to structure the project a bit more and make that thing actually usable in the browser for a standard crochet entusiast.


Current issues of CrochetPARADE as a web tool
- Requiring using a custom langauge to even model anything with its own quite turse syntax.
	- No intuitive button controls
	- No keyboard controls
- Modeling is now allows only 3D without any constraints, while 2D crochet works are usually done in constraints of some shape and surface (not only flat, for clothing for example). In the end the model shown is rather hard to understand or navigate...
	- No 2D mode right now enabled
	- No shape constraints (simple, custom)
- Results can take minutes/hours to complete even for works that can be done in less then an hour and only after clicking a button, recomputing everything each time.
	- No preview
	- No iterative recomputations
- Not so appealing UI, which looks like a quickly compiled set of buttons with custom CSS.
	- No consistency in colors
- Force graph modeling is implemented as a custom C++ WebAssenbly module with a straightforward single thread algorithm.
	- Allow concurrency
	- Potentially migrate to premade cloth strain modeling library
- Code is a mess
	- All UI and part of business logic is written in the HTML file directly as a bunch of JS scripts
	- Code was, basically, not using versioning because of using file names as a version number. At least each file contains a copyright notice, which is funny...
	- C++ code is also written in a single file and manually compiled, all binaries are placed in the same folder as everything else and stored on the codeberg, which is also not recommended.

Implementing / Improving collision detection and force calculations
- General force-first engine https://github.com/vasturiano/d3-force-3d
- Graph visualizer
	- https://github.com/vasturiano/force-graph/blob/master/example/highlight/index.html
	- https://github.com/vasturiano/force-graph?tab=readme-ov-file

How to merge everything https://gfscott.com/blog/merge-git-repos-and-keep-commit-history/

## Controls

### Keyboard controls
Keyboard controls are supposed to be the most efficient to use, considering that here we can replicate the same logic, as when crocheting.

**Version 1**: entering elements as if crocheting a real thing.
What are the actions we can do with a hook?
- place a loop from the thread
- pass hook through/around rl/around lr another stitch and pull out a loop from the thread
- pull a loop from the thread through a loop already on the hook


Description:
- User will be able to control a pointer with arrows that will basically traverse the graph of the crochet work and also be able to select the types of stitches they can make.
- Considering that in complex stitches we want to potentially connect multiple places, we need to make an intuitive way of controlling where the sitch goes, better with some kind of pointer. -> just a combination of 2 pointers (end of thread, where to make a sitch)
- We can differentiate the kinds of stitches, based on the type such as:
	- Adding a loop on the hook -> `C`
	- Passing a hook throug an existing part of work -> `X` 
- Based on that we can construct different condigurations with different ends, including complex triples, etc.

### Mouse controls
Possible implementation will be something like selecting buttons and clicking where each time the crochet should go, but it won't be straightforward to implement intuitive controls for complex stitches, the only idea that comes to mind is making custom configurations in advance, which is complicated.

# Tasks
- [x] Migrate deps from force-graph to lower the bundle -> reworked some of the dependencies and changed their implementation to lower the amount of downloaded libraries, because multiple deps of force-graph were loading something like preact just for a single utility function.
- [ ] Initial POC implementation -> make a graph viz with keyboard controls and just colors as stubs.
  - [x] Get graph highlight implementation working.
  - [x] Make a connector of the Graph instance to React through Zustand.
  - [ ] Make highligh movable with keyboard.
  - [ ] Allow multiple pointers, attaching to the graph instance.
- [ ] Moving from the custom webassembly implementation
  - [ ] Make it parallel, otherwise webassembly is mainly pointless...
- [ ] Performance improvements:
  - [ ] Change implementation to use webassembly only in case of trying to run in firefox-based browsers
  - [ ] Use WebAssembly for graph simulation, see https://github.com/ColinEberhardt/d3-wasm-force
  - [ ] Consider
