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
	- Passing a hook through an existing part of work -> `X` 
- Based on that we can construct different condigurations with different ends, including complex triples, etc.


**Version 2**: entering elements as if crocheting a real thing, but not completely:
-> z/x/c + insertion selection + space should be enough.

What are the actions we can do with a hook?
- place a loop from the thread
- pass hook through/around rl/around lr another stitch and pull out a loop from the thread
- pull a loop from the thread through a loop already on the hook


Description:
- User will be able to control a pointer with arrows that will basically traverse the graph of the crochet work and also be able to select the types of stitches they can make.
- Considering that in complex stitches we want to potentially connect multiple places, we need to make an intuitive way of controlling where the sitch goes, better with some kind of pointer. -> just a combination of 2 pointers (end of thread, where to make a sitch)
- We can differentiate the kinds of stitches, based on the type such as:
	- Adding a loop on the hook -> `C`
	- Passing a hook through an existing part of work -> `X` 
- Based on that we can construct different condigurations with different ends, including complex triples, etc.


### Mouse controls (closer to tablet controls)
Possible implementation will be something like selecting buttons and clicking where each time the crochet should go, but it won't be straightforward to implement intuitive controls for complex stitches, the only idea that comes to mind is making custom configurations in advance, which is complicated.

User should be able to simply "draw" elements with a mouse without using the keyboard too much, just circular menu + Ctrl-Z/Ctrl-Shift-Z + mouse buttons and gestures.

### Graph implementation

Supposed approach for preview (edit view)

- We are using d3's implementation of physics for a graph.
- Different links will have force value and distance based on its type. -> should be set through a function accessor for force/distance, based on d3 docs.
- Problem: how should we keep in sync all the information about the graph, while still making sure all the data is in place? Looks like placing all the data in the node looks the most promising, but still annoying in some cases, I suppose making it external should be better...

Implemented something like an "observable graph", which will allow subscribing to the specific changes in the graph.

Process of making a stitch:
- Simple chain
	- user clicks a button "Z"
	- user click a button
	- create a new node of type chain sticth
	- add a link between previous start node and new node of transparent type
	- set new node to be a start node

- N crochet
	- user clicks a button "C"
	- create a new node of type single crochet
	- add a link between previous start node and new node of transparent type
	- add a link between target node and new node of N crochet type

- multi-N crochet
	- user clicks a button and keeps target to be the same
	- create a new node of type single crochet
	- add a link between previous start node and new node of transparent type
	- add a link between target node and new node of N crochet type
	- set new node to be a start node




# Tasks
- [x] Migrate deps from force-graph to lower the bundle -> reworked some of the dependencies and changed their implementation to lower the amount of downloaded libraries, because multiple deps of force-graph were loading something like preact just for a single utility function.

- [x] Initial POC implementation -> make a graph viz with keyboard controls and just colors as stubs.
- [x] 	Get graph highlight implementation working.
- [x] 	Make a connector of the Graph instance to React through Zustand.
- [x] 	Make highligh movable with keyboard.
- [x] 	Allow multiple pointers, attaching to the graph instance.

- [ ] Initial implementation
- [x]   Refactor and stabilize force-graph implementation -> removed most of the hooks and niceties and kept only main rendering pipeline and simulation bindings, decouples simulation logic from rendering to later optimize
- [x] 	Change force-graph rendering logic
- [x] 		Render selection as a separate layer
- [x] 	Add simple stitches
- [x] 	Add joined stitch rendering

- [ ] Physics simulation implementation
- [ ] 	Check the implementation from crochetPARADE
- [ ]   Check whether it is possible to integrate standard gauge metric into simulation
- [ ]   Connect strain simulation to the graph engine and make it iterative + background
				Forces: top/bottom strain of a stitch, 

Links to check:
- https://arxiv.org/html/2501.07567v3 (https://arxiv.org/html/2501.07567v1)
- https://www.researchgate.net/publication/365380334_Topology_based_modelling_of_crochet_structures
- https://www.researchgate.net/publication/318175297_Computing_Stitches_and_Crocheting_Geometry
- https://dl.acm.org/doi/pdf/10.1145/3424630.3425409
- https://www.researchgate.net/publication/366430363_FROM_STITCHES_TO_DIGITS_AND_BACK_COMPUTATIONAL_CROCHETING_OF_BRANCHING_GEOMETRIES
- https://github.com/virtualtextiles/pytexlib/


- [ ] UX improvements
- [ ] 	Add visual selection of the stich insertion type (crochet-specific)
				something like https://github.com/9inpachi/react-circular-menu/tree/master/src, but with keyboard controls
- [ ] 	Add undo/redo functionality
- [ ] 	Add copy-paste functionality -> copying actions, but applying to different nodes
- [ ] 	Add autorotation, based on center of the work
- [ ] 	Add annotations
- [ ] 		Add "turn" annotation
- [ ] 		Add knitting direction line and row line
- [ ]		View modes
- [ ]			Physical view (use something closer to the bounding box of an element)
- [ ]			Strain view
- [ ]			Direction + is face/back of the stitch view
- [ ]   Color support

- [ ] Experiments/ideas
- [ ]		Implementing form constraints -> allow the last row's nodes move only along some 1D trail -> should allow testing models of shape support
- [ ]			Add shape planning/import (on top of standard circle/square/oval/hexagon add clothing piece planning logic, should be something existing, I suppose)
- [ ]		Moving engine from flat 2D to constrained surface 2D 
- [ ]		Working in actual 3D is hard, same with 3D knitting (difficult to navigate with just keyboard)
				-> make something like a pseudo 3D (simulation is still on a curved surface, but user can view 3D form of the work)
- [ ]		Augment curved surface simulation with 


Improving the custom webassembly implementation

- [ ] Core Architecture & Worker Setup
	- Implement Simulation in a Web Worker (C/Wasm Thread):
		- [ ] Initialize the Emscripten-compiled C/Wasm module within a dedicated Web Worker.
		- [ ] Configure the worker to handle the simulation loop (`tick` function) and manage Wasm linear memory.
	- Establish Configuration Messaging:
		- [ ] Use standard `Worker.postMessage()` from the main thread to send all non-time-critical configuration updates (e.g., setting force strengths, gravity, or link parameters) to the Wasm module.
		- [ ] Wasm receives the message and updates its internal C variables before the next tick.

- [ ] Zero-Copy Data Communication -> utilizing Shared Array Buffer memory for zero-copy data transfer.
	- Define C Data Structure:
		- [ ] Define a value-based C `struct Node` containing 6 float fields for position, velocity, fixed forces (`x, y, vx, vy, fx, fy`).
		- [ ] Define the entire node dataset as a single, contiguous C array of `Node` structs: `Node nodes[MAX_NODES];`.
	- Wasm Memory Export:
		- [ ] Export a C function (e.g., `get_nodes_data_ptr()`) that returns the *base memory address (pointer)* of the `nodes` array.
		- [ ] Ensure the Wasm module uses SharedArrayBuffer memory if parallel threading is planned.
	- JavaScript Memory Mapping:
		- [ ] On the main thread, use the exported pointer to create a single `Float32Array` view over the Wasm linear memory buffer.
		- [ ] This view must cover the entire dataset: `MAX_NODES * 6` total floats.

- [ ] C/Wasm Simulation Logic
	- Batch Simulation Calls:
		- [ ] Ensure the worker calls a single Wasm function (e.g., `run_simulation_step()`) once per tick.
		- [ ] This function must *iterate through all nodes* and perform entire physics calculation (force application, velocity updates, position updates) *internally* in C/Wasm.
	- *Implement Synchronization (if needed):*
		- [ ] If using *SharedArrayBuffer* (for multi-threading), implement an *Atomic flag* mechanism for the main thread to poll, ensuring it only reads the data after the Wasm simulation tick is complete.
	- *Parallelization:*
		- [ ] If pursuing Wasm threads, partition the `nodes` array and assign sections to different C threads running in separate Web Workers/Wasm threads.

Rendering enhancements
- [ ] Pixi.js Integration
	- *Adopt Pixi.js Renderer:*
		- [ ] Integrate *Pixi.js* into the main thread application to replace the current SVG/Canvas rendering logic, utilizing WebGL for rendering.
	- *Update Rendering Loop:*
		- [ ] On the main thread, use the browser's `requestAnimationFrame` for the rendering loop.
		- [ ] In the loop, read the updated positions (`x` and `y` values) directly from the *shared `Float32Array` view*.
		- [ ] Apply the calculated coordinates to the `.x` and `.y` properties of the corresponding *PIXI.Graphics* or *PIXI.Sprite* display objects.
	- *Implement Smooth Rendering (Optional):*
		- [ ] If the simulation is throttled, use interpolation on the main thread to smoothly animate the Pixi objects between the less frequent updates received from the worker.
- [ ] Interaction & Input Handling
	- *JavaScript Event Listener:*
		- [ ] Attach standard JavaScript event listeners (e.g., `onmousemove`, `onclick`) to the Pixi.js Canvas element.
	- *Wasm Input Bridge:*
		- [ ] When an event is triggered (e.g., dragging a node), the JS handler should read the necessary low-level data (coordinates, node ID).
		- [ ] Use the *Emscripten bindings (`ccall` or Embind)* to call a specific Wasm function (e.g., `set_fixed_node(node_id, x, y)`) and pass the relevant data into Wasm memory for processing in the next tick.