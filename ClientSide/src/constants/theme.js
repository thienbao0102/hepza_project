const palette = {
  primary: {
    50: '#f1f4ff',
    100: '#d8e0ff',
    200: '#b0c1ff',
    300: '#8aa2ff',
    400: '#647fff',
    500: '#4E5BA6',
    600: '#3d488e',
    700: '#2f3772',
    800: '#212555',
    900: '#141739',
  },
  secondary: {
    50: '#f4fbf6',
    100: '#e4f7eb',
    200: '#c4edce',
    300: '#9fdfad',
    400: '#74ce86',
    500: '#3db757',
    600: '#2f8f41',
    700: '#236c30',
    800: '#16471f',
    900: '#0a2811',
  },
  neutral: {
    50: '#f6f7fb',
    100: '#e9ecf6',
    200: '#ccd2e4',
    300: '#afb8d0',
    400: '#8f9aba',
    500: '#6f7ca4',
    600: '#586085',
    700: '#414668',
    800: '#2c2f46',
    900: '#171825',
  },
  info: '#3B82F6',
  warning: '#F98533',
  danger: '#AF0000',
  success: '#3db757',
};

const typography = {
  heading: ['"Poppins"', '"Segoe UI"', 'sans-serif'].join(', '),
  body: ['"Inter"', '"Segoe UI"', 'sans-serif'].join(', '),
  mono: ['"Fira Code"', '"Roboto Mono"', 'monospace'].join(', '),
};

const spacing = {
  xs: '0.5rem',
  sm: '0.75rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
};

const theme = {
  colors: palette,
  fonts: typography,
  spacing,
};

export default theme;
export { palette as colors, typography as fonts, spacing };
