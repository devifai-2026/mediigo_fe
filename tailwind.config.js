import colors from 'tailwindcss/colors';

/**
 * The three prototypes each carried their own `brand` palette, they conflicted,
 * and both were largely unused in favour of stock Tailwind classes. Rather than
 * maintain a parallel namespace that drifts (brand-teal vs teal-600 being
 * subtly different greens in the same view), we use stock colours and add a
 * thin semantic alias layer so intent stays greppable.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: colors.teal[600], dark: colors.teal[700], pulse: colors.teal[500], soft: colors.teal[50] },
        ink: { DEFAULT: colors.slate[900], deep: colors.slate[950] },
        // Super Admin console palette, carried over verbatim from Admin.html.
        admin: {
          sidebar: '#0F172A',
          card: '#FFFFFF',
          primary: '#4F46E5',
          primaryDark: '#4338CA',
          accent: '#0D9488',
          accentDark: '#0F766E',
          amber: '#D97706',
          rose: '#E11D48',
          slateBg: '#F1F5F9',
        },
        cash: colors.emerald[600],
        upi: colors.blue[600],
        warn: colors.amber[500],
        alert: colors.rose[600],
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      backgroundImage: {
        'hero-dark': 'linear-gradient(to bottom right, #0f172a, #172554, #042f2e)',
        'hero-chamber': 'linear-gradient(to right, #0f172a, #172554, #042f2e)',
      },
      keyframes: {
        'slide-up': { from: { transform: 'translateY(100%)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
      },
      animation: {
        'slide-up': 'slide-up .28s cubic-bezier(.16,1,.3,1)',
        'fade-in': 'fade-in .2s ease-out',
      },
    },
  },
  plugins: [],
};
