# SE330-PZ01: Life Admin Tracker

This project is designed to help individuals **track, organize, and manage various recurring "life administration" tasks** such as registrations, appointments, or just daily routines. It aims to provide a centralized place for these often-overlooked but crucial personal responsibilities.

Done by Arkadii Semenov 5833 SI FIT

## Project Stack

This project leverages a modern web development stack to deliver a responsive and intuitive user experience:

  * **Framework**: [React](https://react.dev/) (v19)
  * **State Management**: [Zustand](https://www.google.com/search?q=https://zustand-bear.github.io/zustand/) for a simple and powerful state management solution, with [Immer](https://immerjs.github.io/immer/) middleware for immutable state updates.
  * **Drag and Drop**: [Dnd Kit](https://dndkit.com/) for a highly customizable and accessible drag-and-drop experience.
  * **Styling**:
      * [Tailwind CSS](https://tailwindcss.com/) (v4)
      * [DaisyUI](https://daisyui.com/) (v5) - Tailwind CSS component library for beautiful and ready-to-use UI components.
  * **Build Tool**: [Vite](https://vitejs.dev/) (v7)
  * **Language**: [TypeScript](https://www.typescriptlang.org/) (v5)
  * **Testing**: [Vitest](https://vitest.dev/) for unit and integration testing.
  * **Linting/Formatting**: [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/) for code consistency and quality.

## Initial Setup

To get this project up and running on your local machine, follow these steps:

1.  **Clone the Repository:**

    ```bash
    git clone https://github.com/sem0ark/met_projects.git
    cd SE330-PZ01
    ```

2.  **Install Dependencies:**
    This project uses `npm` as its package manager.

    ```bash
    pnpm install
    ```

    This command will download and install all the necessary libraries and tools listed in `package.json`.

## How to Run Locally

Once you've completed the initial setup, you can start the development server:

```bash
pnpm run dev
```

This command will:

  * Start the Vite development server.
  * Compile your TypeScript and React code.
  * Open the application in your default web browser (usually at `http://localhost:5173/` or a similar port).

Any changes you make to the source code will trigger a hot reload, instantly updating your browser without needing a manual refresh.

## How to Build for Production

When you're ready to deploy your application, you can create an optimized production build:

```bash
pnpm run build

pnpm run preview
# to check the build locally
```

This command will:

  * Run the TypeScript compiler (`tsc -b`) to check for type errors and generate declaration files.
  * Use Vite to build the project, optimizing and minifying all assets (HTML, CSS, JavaScript, etc.) into the `dist/` directory.

The `dist/` folder will contain the static files that can be served by any web server.

## Linting and Formatting

To maintain code quality and consistency, you can run the linting and formatting scripts:

  * **Format Code (Prettier):**
    ```bash
    pnpm run lint
    ```
    This command will automatically format your source code files using Prettier, fixing common style issues.

## Running Tests

To run the project's tests using Vitest:

```bash
pnpm run test
```

This command will execute all test files in your project, providing feedback on their pass/fail status.
