import { createTheme } from '@mui/material/styles'
import { DARK_PRIMARY_COLOR, LIGHT_PRIMARY_COLOR } from './constants/palette'

/**
 * CSS variables let CSS Modules read the palette (`var(--mui-palette-…)`), and
 * the `media` selector follows the system light/dark setting without a script.
 */
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'media' },
  colorSchemes: {
    light: { palette: { primary: { main: LIGHT_PRIMARY_COLOR } } },
    dark: { palette: { primary: { main: DARK_PRIMARY_COLOR } } },
  },
  components: {
    // Dense by default: the org works under time pressure (§6.4).
    MuiButton: { defaultProps: { size: 'small', disableElevation: true } },
    MuiTextField: { defaultProps: { size: 'small' } },
  },
})
