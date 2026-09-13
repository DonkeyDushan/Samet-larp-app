'use client'

import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import { FormDialog } from '@/components'
import { useDisclosure } from '@/core/hooks/useDisclosure'
import { common } from '@/locales/cs/common'
import { runsText } from '@/locales/cs/runs'
import { renameRunAction } from '../../../../actions/rename-run'
import { RUN_FIELDS, RUN_LABEL_MAX_LENGTH } from '../../../../constants/run-fields'

interface RenameRunButtonProps {
  runId: string
  label: string | null
}

export const RenameRunButton = ({ runId, label }: RenameRunButtonProps) => {
  const { isOpen, open, close } = useDisclosure()

  return (
    <>
      <Button onClick={open} color="inherit" data-testid={`run-list--rename--${runId}`}>
        {runsText.rename}
      </Button>

      {isOpen && (
        <FormDialog
          title={runsText.renameTitle(runId)}
          intro={runsText.renameIntro}
          action={renameRunAction}
          submitLabel={common.save}
          onClose={close}
          testId="rename-run"
        >
          <input type="hidden" name={RUN_FIELDS.runId} value={runId} />
          <TextField
            name={RUN_FIELDS.label}
            label={runsText.labelLabel}
            placeholder={runsText.labelPlaceholder}
            defaultValue={label ?? ''}
            autoFocus
            fullWidth
            slotProps={{ htmlInput: { maxLength: RUN_LABEL_MAX_LENGTH, 'data-testid': 'rename-run--label' } }}
          />
        </FormDialog>
      )}
    </>
  )
}
