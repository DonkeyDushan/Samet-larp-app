/** Per-run colours in the palette (§3.3); CSS reads them as `--mui-palette-run-<key>-<part>`. */
export interface RunColors {
  /** Top bar background — the colour recognised in peripheral vision. */
  header: string
  /** Text on `header`. */
  ink: string
  /** Swatches and panel edges on the page background. */
  accent: string
}

export interface RunPalette {
  a: RunColors
  b: RunColors
  other: RunColors
  none: RunColors
}

declare module '@mui/material/styles' {
  interface Palette {
    run: RunPalette
  }

  interface PaletteOptions {
    run?: RunPalette
  }
}
