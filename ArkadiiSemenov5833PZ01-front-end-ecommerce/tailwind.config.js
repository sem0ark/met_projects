const colors = require("tailwindcss/colors");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        transparent: "transparent",
        current: "currentColor",
        white: "rgb(255, 255, 255)",

        gray: colors.slate,
        accent: colors.orange,
        error: colors.red,
        warning: colors.yellow,
        success: colors.lime,
      },
    },
  },
};
