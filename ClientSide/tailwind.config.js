import theme from "./src/constants/theme.js";

export default {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html",
    ],
    theme: {
        extend: {
            colors: theme.colors,
            fontFamily: {
                heading: theme.fonts.heading.split(',').map(part => part.trim().replace(/^"(.*)"$/, '$1')),
                body: theme.fonts.body.split(',').map(part => part.trim().replace(/^"(.*)"$/, '$1')),
                mono: theme.fonts.mono.split(',').map(part => part.trim().replace(/^"(.*)"$/, '$1')),
            },
            spacing: theme.spacing,
        },
    },
    corePlugins: {
        preflight: true,
    },
    plugins: [
        require('@tailwindcss/container-queries'),
        require('@tailwindcss/line-clamp'),
    ],
}
