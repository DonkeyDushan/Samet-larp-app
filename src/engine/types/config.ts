/** Third argument of `evaluate`: the run's one config for all chapters (§6.5). */
import type { BlockDefinition } from './block'
import type { CharacterDefinition } from './character'
import type { GroupId } from './ids'
import type { QuestionDefinition } from './question'
import type { Rule } from './rule'
import type { ScaleDefinition } from './scale'

export interface EngineConfig {
  characters: CharacterDefinition[]
  groups: GroupId[]
  scales: ScaleDefinition[]
  /** Every chapter: a condition may read an earlier chapter's answer. */
  questions: QuestionDefinition[]
  blocks: BlockDefinition[]
  /** Layer 4 is optional (§4.5); most configs pass none. */
  rules: Rule[]
}
