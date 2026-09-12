import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // next-env.d.ts generuje Next.js, nemá smysl ho lintovat.
    ignores: ['.next/**', 'node_modules/**', 'drizzle/**', 'next-env.d.ts'],
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

export default config
