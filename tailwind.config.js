/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                rpg: {
                    bg: '#201533',
                    panel: '#e3ce9c',
                    panelDark: '#c7b280',
                    border: '#4a3c31',
                    primary: '#ff0055',
                    secondary: '#00ccff',
                    accent: '#ffcc00',
                    success: '#00cc66',
                }
            },
            fontFamily: {
                pixel: ['"Press Start 2P"', 'cursive'],
                retro: ['"VT323"', '"DotGothic16"', 'monospace'],
            },
            boxShadow: {
                'pixel': 'inset 4px 4px 0px 0px rgba(255,255,255,0.5), inset -4px -4px 0px 0px rgba(0,0,0,0.3)',
                'pixel-pressed': 'inset 4px 4px 0px 0px rgba(0,0,0,0.3)',
            },
            animation: {
                'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
                'float': 'float 3s ease-in-out infinite',
                'bounce-pixel': 'bounce-pixel 1s infinite steps(2)',
                'scale-in': 'scale-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
            },
            keyframes: {
                shake: {
                    '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
                    '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
                    '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
                    '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                'bounce-pixel': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-4px)' },
                },
                'scale-in': {
                    '0%': { transform: 'scale(0) rotate(-45deg)', opacity: '0' },
                    '100%': { transform: 'scale(1) rotate(-12deg)', opacity: '1' },
                },
            },
        }
    },
    plugins: [],
}
