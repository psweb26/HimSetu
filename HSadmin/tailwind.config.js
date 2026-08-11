export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        him: {
          pine: "#1a3b31",
          slate: "#344451",
          mist: "#eef3f1",
          crimson: "#8f2134",
          marigold: "#d89a23",
          river: "#256f8f",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        command: "0 18px 55px rgba(22, 34, 46, 0.12)",
      },
    },
  },
  plugins: [],
};
