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

- [x] Initial POC implementation -> make a graph viz with keyboard controls and just colors as stubs.
  - [x] Get graph highlight implementation working.
  - [x] Make a connector of the Graph instance to React through Zustand.
  - [x] Make highligh movable with keyboard.
  - [x] Allow multiple pointers, attaching to the graph instance.

- [ ] Intial implementation
	- [ ] Change force-graph rendering logic
		- [ ] Render selection as a separate layer
	- [ ] Add simple stitches
	- [ ] Add joined rendering
	- [ ] Add undo/redo functionality
	- [ ] Add copy-paste functionality -> copying actions, but applying to different nodes
	- [ ] Add autorotation, based on center of the work

- [ ] Moving from the custom webassembly implementation
  - [ ] Make it parallel, otherwise webassembly is mainly pointless...
- [ ] Performance improvements:
  - [ ] Change implementation to use webassembly only in case of trying to run in firefox-based browsers
  - [ ] Use WebAssembly for graph simulation, see https://github.com/ColinEberhardt/d3-wasm-force
  - [ ] Consider using WebGL or something like pixi.js -> https://blog.scottlogic.com/2020/05/01/rendering-one-million-points-with-d3.html


```
Yes, it is possible to improve performance using WebAssembly (Wasm) for computationally intensive tasks like physics simulations, but you are right to be concerned: the overhead of communication and serialization can easily negate any gains if not managed properly. The key is to minimize the number of times data crosses the JavaScript/WebAssembly boundary. 
Strategies for Optimal Performance
The primary strategy is to offload entire, self-contained, CPU-intensive tasks to Wasm and communicate data efficiently.
1. Minimize JS-Wasm Boundary Crossings 
The biggest bottleneck is frequent communication between JavaScript and Wasm.
Batch operations: Instead of calling a Wasm function for every single node in the simulation loop, call a single Wasm function that iterates through all nodes and performs the entire simulation step (force calculations, velocity updates, position updates) internally in Wasm. The results are then accessed by JavaScript only after the entire batch is complete.
Transfer large data chunks: Pass large data structures (like the entire array of node positions and velocities) once per tick to Wasm, rather than passing individual node data back and forth. 
2. Use Shared Memory (Typed Arrays)
Avoid data serialization by using a shared memory space (an ArrayBuffer or SharedArrayBuffer for Web Workers).
Direct Memory Access: Wasm can directly read from and write to this shared memory. In JavaScript, you can use Float32Array or Float64Array views to access the same memory location, eliminating the need for costly copying or serialization of JSON objects.
Structure Data for Wasm: Organize your node data into flat, typed arrays (positionsX: Float32Array, positionsY: Float32Array, velocitiesX: Float32Array, etc.) which Wasm can process efficiently. 
3. Leverage Web Workers
Move the entire simulation logic (the Wasm module execution) into a Web Worker.
This prevents the complex calculations from blocking the main UI thread, ensuring a smooth user experience and responsive rendering.
Communication with the worker can use postMessage with transferable objects (the ArrayBuffers) to avoid copying data, further reducing overhead. 
4. Optimize the Rendering Loop
Wasm cannot directly access the DOM. JavaScript must handle the final rendering. 
Use Canvas or WebGL: When dealing with hundreds or thousands of elements (as is common in complex force simulations), using SVG for rendering often becomes a bottleneck. Switch to a <canvas> element or WebGL (using libraries like Pixi.js) for faster rendering, as these methods are much better suited for high-frequency updates and large datasets.
JavaScript receives the updated positions from Wasm and quickly draws them using the canvas API. 
Summary: Is it worth it?
For typical D3 force layouts with a few hundred or a few thousand nodes, a well-optimized JavaScript implementation is often sufficient and might not see significant benefits from Wasm due to the interop overhead. The JavaScript JIT compilers are very fast. 
However, for very large-scale simulations (tens of thousands of nodes/links) or computationally complex forces (e.g., N-body simulations), Wasm can provide a performance boost of 2-5x for the computation part, provided you follow the strategies above to minimize the communication penalty. The performance gain comes from Wasm's static typing and predictable performance characteristics. 



Are there bindings/libraries that will allow rendering to canvas and interactions with lower overhead directly from webassembly?
There are no direct, low-overhead bindings that allow WebAssembly to interact with the HTML Canvas or the DOM without going through a JavaScript bridge. The browser's APIs are fundamentally JavaScript APIs. 
However, you can use existing libraries to manage the interop efficiently and minimize the overhead by leveraging data transfer strategies.
Existing Libraries and Approaches
Languages like Rust and C/C++ provide robust bindings and libraries that abstract away the JavaScript "glue" code, making the interaction feel more direct from the Wasm side.
Rust and wasm-bindgen
Rust is a popular choice for Wasm development, and its tooling is highly mature.
wasm-bindgen: This essential library automates the generation of the necessary JavaScript and Wasm glue code. It allows you to call JavaScript functions (like canvas.getContext('2d'), ctx.fillRect(), etc.) directly from your Rust code.
web-sys: Used with wasm-bindgen, this crate provides raw bindings to all Web APIs, including the Canvas API and event listeners for user input. You write Rust code that calls these bindings, which under the hood makes optimized JavaScript calls. 
C/C++ and Emscripten
Emscripten is the traditional toolchain for C/C++ to Wasm compilation and offers similar functionality.
Embind: Emscripten's binding system allows you to operate on arbitrary JavaScript values and call functions with minimal effort.
ccall / cwrap: These functions allow you to define C functions that can be called from JavaScript, and vice-versa, allowing interaction with the canvas API. 
How to Achieve Minimal Overhead
The libraries mentioned above handle the "how" but the performance "overhead" you're concerned about still exists. The key is how you structure your code:
Rendering: Instead of calling beginPath(), lineTo(), stroke(), etc., for every element from Wasm (which involves many small JS interop calls), you can:
Direct Pixel Manipulation: Have Wasm write pixel data directly to a shared ArrayBuffer (memory) and use JavaScript's ImageData.putImageData() method once per frame to update the entire canvas area. This minimizes interop calls to just one per frame.
WebGL: For highly complex 2D/3D graphics, use Wasm to manage the data and call WebGL functions (via bindings) to leverage GPU acceleration. This is more complex but significantly faster for large visualizations.
Interactions: Use standard JavaScript event listeners (e.g., onclick, onmousemove) attached to the canvas element. When an event occurs, the JavaScript handler calls a specific Wasm function (via bindings), passing the relevant low-level data (e.g., coordinates) into Wasm memory for processing. 
By structuring your application around large data transfers and batch processing, you mitigate the overhead and realize the performance gains of Wasm.



Are there libraries already working with webgl? Are there bindings to webgl from d3?
Yes, there are several libraries that work with WebGL, both for general graphics programming and in combination with D3. 
Libraries Working with WebGL
For general high-performance rendering in JavaScript and WebAssembly, several powerful libraries are available: 
Three.js: A very popular, high-level library for creating and displaying 3D graphics in the browser with WebGL. It abstracts much of the complexity of raw WebGL.
Pixi.js: A fast 2D rendering engine that defaults to using WebGL for hardware acceleration, with a canvas fallback. It is often used for high-performance 2D visualizations and games.
Babylon.js: A powerful, open-source 3D rendering engine and game framework. 
These libraries are implemented in JavaScript, but you can integrate them with a WebAssembly core by using the strategies mentioned previously (e.g., Wasm calculates positions, JS uses the library to render). Languages like Rust have bindings (wasm-bindgen, web-sys) to call these Web APIs efficiently. 
Bindings to WebGL from D3
D3 itself is primarily a data-visualization framework that works by binding data to elements (typically SVG or Canvas) and is not inherently a rendering engine like WebGL. However, the D3 ecosystem offers libraries that bridge this gap: 
D3FC: This suite of components extends D3's vocabulary to work with Canvas and WebGL. It provides "series" components that use GPU-accelerated graphics for rendering, making it easy to create high-performance charts that can handle millions of data points.
You can use D3's powerful data utilities (scales, layouts, force simulations) for the logic, and then use the D3FC WebGL series components for the actual drawing.
Custom Integrations: Many developers integrate D3's data handling with a separate WebGL library like Pixi.js or Three.js. D3 is used to calculate positions and scales, and the external library handles the high-performance, GPU-accelerated rendering. 
In summary, you won't find direct "D3 bindings to WebGL" in the core D3 library, but robust companion libraries and integration patterns exist to leverage the power of WebGL alongside D3's data-driven approach.




From what I see the d3-force implementation is quite small, but has dependencies, please, check github. What do you think, is it possible to migrate it to something like pixi.js?
It is absolutely possible to combine d3-force with a high-performance renderer like Pixi.js. The existing d3-force module is designed to be modular and independent from any specific rendering library (like SVG or Canvas). 

You don't typically "migrate" the d3-force implementation into Pixi.js; rather, you use them in tandem:
D3-Force: Used solely for the heavy lifting of the physics simulation (calculating the x and y coordinates for nodes at each tick).
Pixi.js: Used exclusively for the high-performance WebGL/Canvas rendering of the visuals (drawing circles and lines at those calculated x and y positions). 
This architecture is the standard approach for optimizing large-scale D3 force-directed graphs. 
D3-Force Dependencies
The core d3-force library is intentionally small and has few external dependencies:
d3-collection
d3-dispatch
d3-quadtree
d3-timer
These dependencies are also lightweight, pure-JavaScript modules that handle things like event dispatching, data structures for efficient many-body force calculation (quadtrees), and timing mechanisms for the simulation loop. None of these components are tied to DOM rendering, which is why it can be easily decoupled from SVG. 
How to Combine D3-Force and Pixi.js
The integration process involves replacing D3's typical SVG selection and appending logic with Pixi.js's stage and graphics objects.
Here is the general workflow:
Set up Pixi.js: Initialize a Pixi.js Application and stage.
Initialize D3-Force: Create your simulation using d3.forceSimulation(), defining your forces (links, charge, center, etc.) as usual.
Create Visual Elements: Instead of creating SVG elements, create corresponding PIXI.Graphics objects (e.g., PIXI.Sprite or PIXI.Graphics.drawCircle()) and add them to the Pixi stage. Store a reference to the Pixi object within your D3 node data (e.g., node.gfx = new PIXI.Graphics()).
Update on "tick" Event: Add a listener to the D3 simulation's "tick" event.
Inside the tick handler, iterate through your nodes and links.
Update the .x and .y positions of the Pixi.js display objects (node.gfx.x = node.x;) using the coordinates calculated by D3.
Pixi automatically handles the high-performance rendering loop via WebGL (or Canvas fallback) on the main thread. 
Performance Gains
By using this approach, the CPU-intensive force calculation remains in JavaScript (or can be moved to a Web Worker for extra optimization), while the GPU-accelerated rendering in Pixi.js handles the visual updates efficiently, drastically improving performance for large datasets. 


Do you think if it is possible to migrate d3-force to parallelized webassembly and add some event throttling for faster non-mainthread iteration of the simulation?

Yes, it is possible to migrate the d3-force simulation logic to parallelized WebAssembly (Wasm) and utilize event throttling to improve performance for large graphs. This strategy effectively offloads the CPU-intensive calculations from the main thread. 
Migration to Parallelized WebAssembly
Migrating the core simulation involves moving the mathematical loops and data structures into Wasm.
Feasibility: The d3-force implementation is algorithmically straightforward, making it suitable for migration to languages like Rust or C++ that compile to Wasm. A partial re-implementation (d3-wasm-force) has already been demonstrated as a proof of concept.
Data Handling: The main challenge is data transfer. Wasm only supports numeric types directly, so you must write the complex node and link data to Wasm's linear memory (using typed arrays like Float32Array) from JavaScript. This avoids serialization overhead.
Parallelization: True parallelization using WebAssembly requires SharedArrayBuffer and Web Workers with Wasm threads support. This allows different parts of the force calculations (e.g., forces on different sets of nodes) to run concurrently on separate CPU cores, further speeding up the simulation loop. 
Non-Mainthread Iteration and Throttling
Running the simulation in a Web Worker (or multiple workers if parallelized) is essential to prevent freezing the user interface, especially during the initial "cooling down" phase of the simulation. 
Web Workers: The D3 documentation explicitly recommends running static layouts for large graphs in a Web Worker to avoid blocking the UI.
Event Throttling: Instead of receiving a "tick" event from the worker for every single iteration, you can implement a messaging system that sends updates less frequently (e.g., every 10th or 20th tick).
Smooth Rendering: To maintain a fluid user experience despite the throttled updates, the main thread can use interpolation to smoothly animate the nodes between the received position updates. This decouples the simulation framerate from the rendering framerate. 
By combining Wasm for raw computation, Web Workers for off-main-thread execution, and event throttling with interpolation for smooth rendering, you can achieve substantial performance improvements for large-scale force simulations.


Показать все
I suppose the communication can be simplified to two float32 buffers, considering that each node contains specifically 6 floats, configuration changes (force changes for example) can be done through message passing. Is it possible?
Yes, that data communication strategy is entirely possible and is the recommended approach for maximizing performance in a WebAssembly environment.
Structuring your data communication around a minimal, efficient format minimizes the overhead you were initially concerned about. 
Communication Strategy Details
The overhead of message passing via JSON is high. By using Float32Array (or Float64Array) and leveraging SharedArrayBuffer with Web Workers, you eliminate serialization/deserialization costs.
Data Structure (Two Float32Array buffers)
Assuming each node needs 6 floats:
Data Point 	Description	Float Index
x	Current X position	0
y	Current Y position	1
vx	X velocity	2
vy	Y velocity	3
fx	Fixed X position	4
fy	Fixed Y position	5
You would manage this data in flat, typed arrays: 
Input Buffer (Float32Array): JS writes initial state/user interactions here. Wasm reads from here.
Output Buffer (Float32Array): Wasm writes updated positions/velocities here after each tick. JS reads from here for rendering. 
The total size of the buffer would be NUM_NODES * 6 * 4 bytes.
Configuration Changes (Message Passing)
Configuration changes should indeed be done through message passing (e.g., via Worker.postMessage()):
JavaScript (Main Thread) sends: worker.postMessage({ type: 'SET_STRENGTH', forceName: 'link', strength: 0.5 });
Web Worker (Wasm) receives: The Wasm module receives the message, parses the configuration update, and changes the internal parameters used in the next iteration of the simulation loop. 
How this works in practice
This pattern is highly efficient because:
Zero-Copy Transfer: The underlying ArrayBuffers can be transferred to the Web Worker without being copied, allowing instant access by the Wasm module.
Wasm Efficiency: Wasm can read/write this linear memory very quickly using standard C/Rust pointer arithmetic.
Minimized Overhead: You only cross the JS/Wasm boundary once per configuration change and once per batch of simulation updates (e.g., every 10 ticks). 
This approach addresses your initial concerns about overhead and is the most performant way to implement a Wasm-based force simulation.

```