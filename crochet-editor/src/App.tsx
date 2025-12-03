import clsx from "clsx";
import { HashRouter, NavLink, Outlet, Route, Routes } from "react-router";
import { Manual } from "./pages/Manual";
import { About } from "./pages/About";
import { Home } from "./pages/Home";

const AppIcon = () => (
  <img className="size-16 h-full" src="logo.png" alt="CrochetPARADE Home" />
);

const Layout = () => {
  return (
    <>
      <div className="mx-auto mb-1 max-w-7xl">
        <nav className="flex flex-row gap-2 border-b-2 border-b-slate-300 p-2">
          <NavLink to="/">
            <AppIcon />
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              clsx(
                "flex flex-row items-center gap-2 hover:text-blue-500 transition-colors duration-300ms",
                isActive && "font-bold",
              )
            }
            to="/"
          >
            Home
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              clsx(
                "flex flex-row items-center gap-2 hover:text-blue-500 transition-colors duration-300ms",
                isActive && "font-bold",
              )
            }
            to="/about"
          >
            About
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              clsx(
                "flex flex-row items-center gap-2 hover:text-blue-500 transition-colors duration-300ms",
                isActive && "font-bold",
              )
            }
            to="/manual"
          >
            Manual
          </NavLink>
        </nav>
      </div>

      <main className="mx-auto my-0 max-w-7xl w-3xl p-6">
        <Outlet />
      </main>
    </>
  );
};

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="home" element={<Home />} />
          <Route path="manual" element={<Manual />} />
          <Route path="about" element={<About />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
