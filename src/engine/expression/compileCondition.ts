/**
 * Expression text to a resolved `CompiledCondition`.
 *
 * Every reference is resolved here, before anything is evaluated: evaluation
 * short-circuits, and a typo behind an `AND` that happens to be false must fail
 * just as loudly. An unknown identifier is an error, never `false`.
 */
import type jsep from 'jsep'
import type { Catalog } from '../catalog/buildCatalog'
import {
  AND_OPERATOR,
  ANSWER_PREFIX,
  COMPARISON_OPERATORS,
  DEFAULT_CONDITION,
  FLAG_PREFIX,
  NOT_OPERATOR,
  OR_OPERATOR,
  RANDOM_FUNCTION,
  RANDOM_MAX_PERCENT,
  RANDOM_MIN_PERCENT,
  SCALE_PREFIX,
} from '../constants/expressionLanguage'
import { fail } from '../errors/engineInputError'
import type { CompiledCondition, CompiledNumber, ComparisonOperator } from '../types/condition'
import type { ChapterNumber } from '../types/ids'
import { parseExpressionTree } from './parseExpressionTree'

export interface CompileScope {
  catalog: Catalog
  chapter: ChapterNumber
  /** Variation or rule the expression belongs to, for the error. */
  ownerId: string
}

interface NodeScope extends CompileScope {
  expression: string
}

export const compileCondition = (source: string, scope: CompileScope): CompiledCondition => {
  const expression = source.trim()
  if (expression === DEFAULT_CONDITION) return { kind: 'always' }

  let tree: jsep.Expression
  try {
    tree = parseExpressionTree(expression)
  } catch (cause) {
    return fail('neplatny_vyraz', scope.ownerId, `cannot parse "${expression}": ${String(cause)}`)
  }

  return toCondition(tree, { ...scope, expression })
}

const invalid = (scope: NodeScope, detail: string): never =>
  fail('neplatny_vyraz', scope.ownerId, `"${scope.expression}": ${detail}`)

const unknown = (scope: NodeScope, name: string, detail: string): never =>
  fail('neznamy_identifikator', scope.ownerId, `"${scope.expression}": ${name} ${detail}`)

const isComparison = (operator: string): operator is ComparisonOperator =>
  (COMPARISON_OPERATORS as readonly string[]).includes(operator)

const toCondition = (node: jsep.Expression, scope: NodeScope): CompiledCondition => {
  switch (node.type) {
    case 'Identifier':
      return identifierCondition(String((node as jsep.Identifier).name), scope)
    case 'UnaryExpression': {
      const unary = node as jsep.UnaryExpression
      if (unary.operator !== NOT_OPERATOR) return invalid(scope, `unsupported operator ${unary.operator}`)

      return { kind: 'not', operand: toCondition(unary.argument, scope) }
    }
    case 'BinaryExpression': {
      const binary = node as jsep.BinaryExpression
      if (binary.operator === AND_OPERATOR || binary.operator === OR_OPERATOR) {
        const kind = binary.operator === AND_OPERATOR ? 'and' : 'or'

        return { kind, left: toCondition(binary.left, scope), right: toCondition(binary.right, scope) }
      }
      if (isComparison(binary.operator)) {
        return {
          kind: 'compare',
          operator: binary.operator,
          left: toNumber(binary.left, scope),
          right: toNumber(binary.right, scope),
        }
      }

      return invalid(scope, `unsupported operator ${binary.operator}`)
    }
    case 'CallExpression':
      return randomCondition(node as jsep.CallExpression, scope)
    default:
      return invalid(scope, `${node.type} is not a condition`)
  }
}

const identifierCondition = (name: string, scope: NodeScope): CompiledCondition => {
  if (name === DEFAULT_CONDITION) return invalid(scope, `${DEFAULT_CONDITION} must stand alone`)

  if (name.startsWith(ANSWER_PREFIX)) {
    const entry = scope.catalog.options.get(name) ?? unknown(scope, name, 'is not an answer option')
    if (entry.question.chapter > scope.chapter) {
      return unknown(scope, name, `belongs to chapter ${entry.question.chapter}, which comes later`)
    }

    return { kind: 'answer', optionId: name, questionId: entry.question.id }
  }

  if (name.startsWith(FLAG_PREFIX)) {
    if (!scope.catalog.flags.has(name)) return unknown(scope, name, 'is set by no answer and no rule')

    return { kind: 'flag', flagId: name }
  }

  if (name.startsWith(SCALE_PREFIX) && scope.catalog.scaleReferences.has(name)) {
    return invalid(scope, `scale ${name} must be compared with a number`)
  }

  return unknown(scope, name, 'is not an answer, scale or flag')
}

const toNumber = (node: jsep.Expression, scope: NodeScope): CompiledNumber => {
  if (node.type === 'Literal' && typeof (node as jsep.Literal).value === 'number') {
    return { kind: 'number', value: (node as jsep.Literal).value as number }
  }

  if (node.type === 'Identifier') {
    const name = String((node as jsep.Identifier).name)
    const reference = scope.catalog.scaleReferences.get(name) ?? unknown(scope, name, 'is not a scale')

    return { kind: 'scale', reference: name, characterId: reference.characterId, scaleKey: reference.scaleKey }
  }

  return invalid(scope, 'a comparison takes a scale or a number on each side')
}

const randomCondition = (call: jsep.CallExpression, scope: NodeScope): CompiledCondition => {
  const callee = call.callee.type === 'Identifier' ? String((call.callee as jsep.Identifier).name) : ''
  if (callee !== RANDOM_FUNCTION) return invalid(scope, `unknown function ${callee}`)

  const [argument, ...extra] = call.arguments
  const percent = argument?.type === 'Literal' ? (argument as jsep.Literal).value : undefined
  if (typeof percent !== 'number' || extra.length > 0) {
    return invalid(scope, `${RANDOM_FUNCTION} takes exactly one number`)
  }
  if (percent < RANDOM_MIN_PERCENT || percent > RANDOM_MAX_PERCENT) {
    return invalid(scope, `${RANDOM_FUNCTION}(${percent}) is outside ${RANDOM_MIN_PERCENT}–${RANDOM_MAX_PERCENT}`)
  }

  return { kind: 'random', reference: `${RANDOM_FUNCTION}(${percent})`, percent }
}
