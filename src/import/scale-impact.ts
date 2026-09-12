/**
 * The `Scale Impact` column (§4.2).
 *
 * A separated list of `S_<Postava>_<Skala><znaménko><číslo>`, e.g.
 * `S_Marie_Wealth_osobni+3, S_Marie_Regime-2`. An empty cell means no impact.
 *
 * `scale_direct` questions write an absolute value instead of a shift and are
 * spelled `S_Marie_Wealth_osobni=VALUE`: the number comes from the org's answer,
 * not from the sheet, and lands at the start of the value phase (§6.7).
 *
 * A pure function with tests on purpose: it is small, it is called everywhere,
 * and a bug in it shows up as wrong numbers in a printed document.
 */

/** One parsed impact. */
export interface ScaleImpact {
  /** Full source ID, e.g. `S_Marie_Wealth_osobni`. */
  externalId: string
  /** Character part, e.g. `Marie`. */
  character: string
  /** Scale part, e.g. `Wealth_osobni`. */
  scale: string
  /** `posun` shifts by `delta`; `absolutni` sets a value (§6.7). */
  mode: 'posun' | 'absolutni'
  /** Signed shift; set when `mode = 'posun'`. */
  delta?: number
  /** Set when `mode = 'absolutni'` and the sheet gives a literal number. */
  value?: number
  /** `=VALUE`: the number comes from the answer, not from the sheet. */
  fromAnswer?: boolean
  /** The exact text this came from, for error messages. */
  raw: string
}

export interface ScaleImpactProblem {
  raw: string
  reason:
    | 'chybi_znamenko'
    | 'chybi_prefix'
    | 'chybi_skala'
    | 'necislo'
    | 'prazdna_polozka'
    | 'nezname'
  /** Czech explanation, ready to drop into an issue message. */
  detail: string
}

export interface ScaleImpactParse {
  impacts: ScaleImpact[]
  problems: ScaleImpactProblem[]
}

/**
 * Items are separated by a comma or a semicolon: the real sheet uses both,
 * sometimes in one cell, and rejecting one of them would only annoy the author.
 */
const SEPARATOR = /[,;]/

/** `S_<Postava>_<Skala>` — the scale part may itself contain `_` (`Wealth_osobni`). */
const IMPACT = /^S_([^_\s]+)_(.+?)\s*(=|\+|-)\s*(.+)$/

export const parseScaleImpact = (cell: string | undefined | null): ScaleImpactParse => {
  const impacts: ScaleImpact[] = []
  const problems: ScaleImpactProblem[] = []

  const text = (cell ?? '').trim()
  if (text === '') return { impacts, problems }

  for (const part of text.split(SEPARATOR)) {
    const raw = part.trim()
    if (raw === '') continue

    const match = IMPACT.exec(raw)
    if (!match) {
      problems.push(describeFailure(raw))
      continue
    }

    const character = match[1] ?? ''
    const scale = match[2] ?? ''
    const sign = match[3] ?? ''
    const externalId = `S_${character}_${scale}`
    const operand = (match[4] ?? '').trim()

    if (sign === '=') {
      if (operand === 'VALUE') {
        impacts.push({ externalId, character, scale, mode: 'absolutni', fromAnswer: true, raw })
        continue
      }
      const value = Number(operand)
      if (!Number.isInteger(value)) {
        problems.push({
          raw,
          reason: 'necislo',
          detail: `za rovnítkem se čeká celé číslo nebo klíčové slovo VALUE, je tam „${operand}"`,
        })
        continue
      }
      impacts.push({ externalId, character, scale, mode: 'absolutni', value, raw })
      continue
    }

    const magnitude = Number(operand)
    if (!Number.isInteger(magnitude)) {
      problems.push({
        raw,
        reason: 'necislo',
        detail: `za znaménkem se čeká celé číslo, je tam „${operand}"`,
      })
      continue
    }
    impacts.push({
      externalId,
      character,
      scale,
      mode: 'posun',
      delta: sign === '-' ? -magnitude : magnitude,
      raw,
    })
  }

  return { impacts, problems }
}

/** Says what is wrong rather than just "invalid", so the author can fix it blind. */
const describeFailure = (raw: string): ScaleImpactProblem => {
  if (!raw.startsWith('S_')) {
    return {
      raw,
      reason: 'chybi_prefix',
      detail: 'ID škály musí začínat na `S_`, například `S_Marie_Wealth_osobni+3`',
    }
  }
  if (!/[=+-]/.test(raw)) {
    return {
      raw,
      reason: 'chybi_znamenko',
      detail: 'chybí znaménko — čeká se `+`, `-` nebo `=`, například `S_Marie_Regime-2`',
    }
  }
  if (/^S_[^_\s]+[=+-]/.test(raw)) {
    return {
      raw,
      reason: 'chybi_skala',
      detail: 'ID škály má tvar `S_<Postava>_<Skala>`, chybí část se jménem škály',
    }
  }

  return { raw, reason: 'nezname', detail: 'nedá se přečíst jako dopad na škálu' }
}

/** Splits `S_Marie_Wealth_osobni` into its parts; undefined when it is not a scale ID. */
export const splitScaleId = (
  externalId: string,
): { character: string; scale: string } | undefined => {
  const match = /^S_([^_\s]+)_(.+)$/.exec(externalId.trim())
  if (!match) return undefined

  return { character: match[1] ?? '', scale: match[2] ?? '' }
}

/**
 * The `_osobni` / `_spolecny` pair (§4.4). A chapter where answers touch one
 * half and never the other is almost certainly a typo in a scale ID, which is
 * why it is worth a warning of its own.
 */
export const accountCounterpart = (scaleKey: string): string | undefined => {
  if (scaleKey.endsWith('_osobni')) return `${scaleKey.slice(0, -'_osobni'.length)}_spolecny`
  if (scaleKey.endsWith('_spolecny')) return `${scaleKey.slice(0, -'_spolecny'.length)}_osobni`

  return undefined
}
