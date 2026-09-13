import { createTheme } from '@mui/material/styles'
import { DARK_PALETTE, LIGHT_PALETTE } from './constants/palette'
import { BASE_FONT_SIZE_PX, BORDER_RADIUS_PX, FONT_STACK, TAB_MIN_HEIGHT_PX } from './constants/typography'
import type {} from './types/run-palette'

/**
 * CSS variables let CSS Modules read the palette (`var(--mui-palette-…)`), and
 * the `media` selector follows the system light/dark setting without a script.
 * Look changes belong here, not on individual components (§15.1).
 */
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'media' },
  colorSchemes: {
    light: { palette: LIGHT_PALETTE },
    dark: { palette: DARK_PALETTE },
  },
  shape: { borderRadius: BORDER_RADIUS_PX },
  typography: {
    fontSize: BASE_FONT_SIZE_PX,
    fontFamily: FONT_STACK,
    button: { textTransform: 'none' },
  },
  components: {
    MuiAppBar: { defaultProps: { elevation: 0, color: 'inherit' } },
    MuiToolbar: { defaultProps: { variant: 'dense' } },
    MuiButton: { defaultProps: { size: 'small', disableElevation: true } },
    MuiIconButton: { defaultProps: { size: 'small' } },
    MuiTextField: { defaultProps: { size: 'small', margin: 'dense' } },
    MuiFormControl: { defaultProps: { size: 'small', margin: 'dense' } },
    MuiChip: { defaultProps: { size: 'small' } },
    MuiList: { defaultProps: { dense: true } },
    MuiTable: { defaultProps: { size: 'small' } },
    MuiDialog: { defaultProps: { fullWidth: true, maxWidth: 'xs' } },
    MuiTabs: { styleOverrides: { root: { minHeight: TAB_MIN_HEIGHT_PX } } },
    MuiTab: { styleOverrides: { root: { minHeight: TAB_MIN_HEIGHT_PX, textTransform: 'none' } } },
  },
})
