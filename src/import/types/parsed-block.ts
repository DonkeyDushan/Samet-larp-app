import type { ExpressionParse } from '../expression'
import type { Sourced } from './sourced'

export interface ParsedVariation extends Sourced {
  externalId: string
  priority: number
  description: string
  text: string
  condition: ExpressionParse
}

export interface ParsedBlock extends Sourced {
  externalId: string
  chapter: number
  characterRef: string
  characterId?: string
  variations: ParsedVariation[]
}
