import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', 'node_modules/**', 'drizzle/**'],
  },
  {
    // Architektonické pravidlo 1: engine je čistá funkce bez závislostí na app/ a db/.
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/app/*', '@/db/*', 'next/*', 'react', 'react-dom', 'drizzle-orm', 'postgres'], message: 'src/engine musí zůstat čistý: bez DB, sítě a Reactu (pravidlo 1 v CLAUDE.md).' },
          ],
        },
      ],
    },
  },
]
