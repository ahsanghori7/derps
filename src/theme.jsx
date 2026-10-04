// src/theme.js
import { createTheme } from '@mui/material/styles';

// Custom overlays (AddEvent etc.) use zIndex ~9999.
// MUI Date/Time pickers + Menus use theme.zIndex.modal — must be higher.
const zIndex = {
  mobileStepper: 1000,
  fab: 1050,
  speedDial: 1050,
  appBar: 1100,
  drawer: 1200,
  modal: 20000,
  snackbar: 20100,
  tooltip: 20200,
};

const typography = {
  fontFamily: 'Nunito, sans-serif',
};

const lightPalette = {
  mode: 'light',
  primary: {
    main: '#0C79F7',
    contrastText: '#FFFFFF',
  },
};

const darkPalette = {
  mode: 'dark',
  primary: {
    main: '#3B94F8',
    dark: '#0C79F7',
    light: '#3B94F8',
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#16181D',
    paper: '#2C3138',
  },
  text: {
    primary: '#F4F6F8',
    secondary: '#A7B0BA',
  },
  divider: 'rgba(255, 255, 255, 0.08)',
  action: {
    hover: 'rgba(255, 255, 255, 0.06)',
    selected: 'rgba(12, 121, 247, 0.18)',
  },
};

export function createAppTheme(mode = 'light') {
  const isDark = mode === 'dark';
  return createTheme({
    palette: isDark ? darkPalette : lightPalette,
    typography,
    zIndex,
    components: isDark
      ? {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                backgroundColor: '#16181D',
                color: '#F4F6F8',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
              },
            },
          },
          MuiDialog: {
            styleOverrides: {
              paper: {
                backgroundColor: '#2C3138',
                backgroundImage: 'none',
                color: '#F4F6F8',
              },
            },
          },
          MuiMenu: {
            styleOverrides: {
              paper: {
                backgroundColor: '#353B44',
                backgroundImage: 'none',
                color: '#F4F6F8',
              },
            },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                backgroundColor: '#353B44',
                color: '#F4F6F8',
              },
              notchedOutline: {
                borderColor: 'rgba(255, 255, 255, 0.08)',
              },
            },
          },
        }
      : {},
  });
}

const theme = createAppTheme('light');

export default theme;
