/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'primary': 'var(--primary-color)',
                'primary-light': 'var(--primary-light)',
                'primary-dark': 'var(--primary-dark)',
            },
            fontFamily: {
                sans: ['var(--font-family)', 'sans-serif'],
            },
            padding: {
                'safe': 'env(safe-area-inset-bottom)',
            }
        },
    },
    plugins: [],
}
