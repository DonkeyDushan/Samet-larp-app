/**
 * The parser is a library (`jsep`), never a hand-written grammar (§4.5). This
 * is the one place its setup lives, so the import's syntax check and the
 * engine's evaluation cannot read an expression differently.
 */
import jsep from 'jsep'
import { AND_OPERATOR, AND_PRECEDENCE, OR_OPERATOR, OR_PRECEDENCE } from '../constants/expressionLanguage'

// jsep keeps operators globally; registering at module load covers every caller.
jsep.addBinaryOp(AND_OPERATOR, AND_PRECEDENCE)
jsep.addBinaryOp(OR_OPERATOR, OR_PRECEDENCE)

/** The author's lone `=` becomes jsep's `==`; `<=`, `>=`, `!=` and `==` stay. */
const normalizeEquals = (source: string): string => source.replace(/(^|[^<>=!])=(?!=)/g, '$1==')

/** Throws jsep's error on bad syntax; callers word it for their audience. */
export const parseExpressionTree = (source: string): jsep.Expression => jsep(normalizeEquals(source))
