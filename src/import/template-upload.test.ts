import { readFileSync } from 'node:fs'
import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { importXlsx } from './import-config'
import { readTemplateFiles, templateCoverage } from './template-upload'

const marie = () => readFileSync('documents/marie.md')
const config = () => importXlsx(readFileSync('documents/fixture-platny.xlsx')).config

const asFile = (filename: string, text: string | Buffer) => ({
  filename,
  data: typeof text === 'string' ? new TextEncoder().encode(text) : new Uint8Array(text),
})

describe('readTemplateFiles', () => {
  it('reads several .md files at once, keeping diacritics', async () => {
    const templates = await readTemplateFiles([
      asFile('T_Marie.md', marie()),
      asFile('T_Mirek.md', '# Mirek\n{BLOK B_Mirek_2_Historie_1}'),
    ])
    expect(templates.map((t) => t.externalId)).toEqual(['T_Marie', 'T_Mirek'])
    expect(templates[0]?.markdown).toContain('Balážová')
  })

  it('ignores files that are not Markdown', async () => {
    const templates = await readTemplateFiles([asFile('poznamky.txt', 'nic')])
    expect(templates).toEqual([])
  })

  it('unpacks a zip of templates', async () => {
    const zip = new JSZip()
    zip.file('T_Marie.md', marie())
    zip.file('sablony/T_Karel.md', '# Karel\n{BLOK B_Karel_2_Prace_1}')
    const data = await zip.generateAsync({ type: 'uint8array' })

    const templates = await readTemplateFiles([{ filename: 'sablony.zip', data }])
    expect(templates.map((t) => t.externalId).sort()).toEqual(['T_Karel', 'T_Marie'])
  })

  it('skips the shadow tree a macOS zip carries', async () => {
    const zip = new JSZip()
    zip.file('T_Marie.md', marie())
    zip.file('__MACOSX/._T_Marie.md', 'smeti')
    const data = await zip.generateAsync({ type: 'uint8array' })

    const templates = await readTemplateFiles([{ filename: 'sablony.zip', data }])
    expect(templates).toHaveLength(1)
  })

  it('reports the marker problems it found in an uploaded file', async () => {
    const templates = await readTemplateFiles([asFile('T_X.md', '{BLOK B_1}\n{/BLOK}')])
    expect(templates[0]?.problems).toHaveLength(1)
  })
})

describe('templateCoverage', () => {
  it('says who has a template and who does not', async () => {
    const templates = await readTemplateFiles([asFile('T_Marie.md', marie())])
    const coverage = templateCoverage(config(), templates)

    const marieRow = coverage.assignments.find((a) => a.characterExternalId === 'Marie')
    expect(marieRow).toMatchObject({ status: 'prirazena', filename: 'T_Marie.md' })
    expect(coverage.missingCount).toBe(4)
    expect(
      coverage.assignments.filter((a) => a.status === 'chybi').map((a) => a.expected),
    ).toEqual(['T_Mirek', 'T_Karel', 'T_Vera', 'T_Rudi'])
  })

  it('matches a file named after the character rather than the template', async () => {
    const templates = await readTemplateFiles([asFile('marie.md', marie())])
    const coverage = templateCoverage(config(), templates)
    expect(
      coverage.assignments.find((a) => a.characterExternalId === 'Marie')?.status,
    ).toBe('prirazena')
  })

  it('lists uploaded files that belong to nobody', async () => {
    const templates = await readTemplateFiles([asFile('T_Nikdo.md', '# Nikdo')])
    const coverage = templateCoverage(config(), templates)
    expect(coverage.unmatched.map((t) => t.externalId)).toEqual(['T_Nikdo'])
  })

  it('uses the full character name in the overview', async () => {
    const coverage = templateCoverage(config(), [])
    expect(coverage.assignments[0]?.characterName).toBe('Marie Balážová')
  })
})
