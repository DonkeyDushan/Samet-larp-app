'use client'

import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'
import { isRunSection, RUN_SECTIONS, runRoute } from '@/core'
import { navigation } from '@/locales/cs/navigation'
import styles from './SectionNav.module.css'

/** The five sections (§6.4); links, so a section opens in a new tab like any page. */
export const SectionNav = ({ runId }: { runId: string }) => {
  const segment = useSelectedLayoutSegment()

  return (
    <nav aria-label={navigation.sectionsLabel} className={styles.nav}>
      <Tabs
        value={isRunSection(segment) ? segment : false}
        textColor="inherit"
        variant="scrollable"
        scrollButtons={false}
        slotProps={{ indicator: { className: styles.indicator } }}
      >
        {RUN_SECTIONS.map((section) => (
          <Tab
            key={section}
            value={section}
            label={navigation.sections[section]}
            component={Link}
            href={runRoute(runId, section)}
            data-testid={`section-nav--${section}`}
          />
        ))}
      </Tabs>
    </nav>
  )
}
