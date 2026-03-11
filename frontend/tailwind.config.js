/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
            },
            colors: {
                'below': '#d9534f',
                'meets': '#f0ad4e',
                'good': '#5cb85c',
                'very-good': '#28a745',
                'exceptional': '#1e7b34',
                'primary': '#B5333D',
                'primary-dark': '#8E2830',
                'secondary': '#B0B0B0',
                'accent-yellow': '#FACE68',
                'accent-red': '#B5333D',
            }
        },
    },
    plugins: [],
}