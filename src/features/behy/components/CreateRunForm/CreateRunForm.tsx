'use client'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useActionState, useCallback, useState, type ChangeEvent } from 'react'
import { RunBadge } from '@/components'
import { IDLE_FORM_STATE, isCalendarDate, nextRunLetter, runIdFor, type RunLetterUse } from '@/core'
import { errors } from '@/locales/cs/errors'
import { runsText } from '@/locales/cs/runs'
import { createRunAction } from '../../actions/create-run'
import { RUN_FIELDS, RUN_LABEL_MAX_LENGTH } from '../../constants/run-fields'
import styles from './CreateRunForm.module.css'

interface CreateRunFormProps {
  runs: RunLetterUse[]
  /** Today in the game's time zone, computed on the server. */
  defaultStartDate: string
}

/** The preview uses the same letter rule as the server; the server's pick is what counts. */
export const CreateRunForm = ({ runs, defaultStartDate }: CreateRunFormProps) => {
  const [startDate, setStartDate] = useState(defaultStartDate)
  const [state, formAction, pending] = useActionState(createRunAction, IDLE_FORM_STATE)

  const isDateValid = isCalendarDate(startDate)
  const letter = isDateValid ? nextRunLetter(runs, startDate) : undefined

  const handleDateChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setStartDate(event.target.value),
    [],
  )

  return (
    <Paper variant="outlined" component="section" className={styles.panel} data-testid="create-run">
      <Typography variant="h6" component="h2">
        {runsText.createTitle}
      </Typography>
      <Typography variant="body2" className={styles.hint}>
        {runsText.createIntro}
      </Typography>

      <form action={formAction} className={styles.form}>
        <div className={styles.fields}>
          <TextField
            type="date"
            name={RUN_FIELDS.startDate}
            label={runsText.startDateLabel}
            value={startDate}
            onChange={handleDateChange}
            required
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { 'data-testid': 'create-run--start-date' } }}
          />
          <TextField
            name={RUN_FIELDS.label}
            label={runsText.labelLabel}
            placeholder={runsText.labelPlaceholder}
            className={styles.label}
            slotProps={{ htmlInput: { maxLength: RUN_LABEL_MAX_LENGTH, 'data-testid': 'create-run--label' } }}
          />
        </div>

        <Typography variant="body2" component="p" data-testid="create-run--preview">
          {!isDateValid && errors.invalidStartDate}
          {isDateValid && !letter && runsText.idPreviewUnavailable}
          {letter && runsText.idPreviewBefore}
          {letter && <RunBadge runId={runIdFor(startDate, letter)} letter={letter} />}
        </Typography>

        {state._type === 'failed' && (
          <Alert severity="error" data-testid="create-run--failure">
            {state.message}
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          disabled={pending || !letter}
          className={styles.submit}
          data-testid="create-run--submit"
        >
          {pending ? runsText.creating : runsText.create}
        </Button>
      </form>
    </Paper>
  )
}
