import type { PaletteOptions } from '@mui/material/styles'

/**
 * Muted, slightly faded tones with a nod to 1980s Czechoslovak print (§6.4) —
 * carried by colour only, no paper textures. Primary actions stay neutral:
 * colour is reserved for the run (§3.3) and for severity, so a blue button
 * never reads as "run A".
 */
export const LIGHT_PALETTE: PaletteOptions = {
  primary: { main: '#2f2d29' },
  error: { main: '#a3412f' },
  warning: { main: '#9a6a17' },
  success: { main: '#4d7250' },
  info: { main: '#4a6582' },
  background: { default: '#f2efe8', paper: '#faf8f3' },
  text: { primary: '#26241f', secondary: '#645f55' },
  divider: 'rgba(38, 36, 31, 0.14)',
  run: {
    a: { header: '#35557d', ink: '#f7f4ec', accent: '#4b6f9c' },
    b: { header: '#a86f1f', ink: '#fffaf0', accent: '#c48a36' },
    other: { header: '#4a5560', ink: '#f7f4ec', accent: '#6b7784' },
    none: { header: '#3a3833', ink: '#f7f4ec', accent: '#8a857a' },
  },
}

export const DARK_PALETTE: PaletteOptions = {
  primary: { main: '#e4dfd4' },
  error: { main: '#d7806d' },
  warning: { main: '#d9a650' },
  success: { main: '#8fb58f' },
  info: { main: '#8ea8c6' },
  background: { default: '#191816', paper: '#22211e' },
  text: { primary: '#e9e5dc', secondary: '#a8a296' },
  divider: 'rgba(233, 229, 220, 0.14)',
  run: {
    a: { header: '#2c4666', ink: '#eef2f7', accent: '#7d9fc9' },
    b: { header: '#85561a', ink: '#fdf6ea', accent: '#dba55a' },
    other: { header: '#3b444d', ink: '#eceae4', accent: '#9aa5b1' },
    none: { header: '#2c2a26', ink: '#eceae4', accent: '#8a857a' },
  },
}
