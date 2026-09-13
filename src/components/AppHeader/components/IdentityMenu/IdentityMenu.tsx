'use client'

import Button from '@mui/material/Button'
import { useState } from 'react'
import { AUTHOR_MAX_LENGTH } from '@/core'
import { useDisclosure } from '@/core/hooks/useDisclosure'
import { logOut } from '@/core/actions/log-out'
import { setAuthor } from '@/core/actions/set-author'
import { ACCESS_FIELDS } from '@/core/constants/access'
import { access } from '@/locales/cs/access'
import { AuthorField } from '../../../AuthorField/AuthorField'
import { FormDialog } from '../../../FormDialog/FormDialog'

/** The name is always visible, so an org who took over the laptop notices it is not theirs. */
export const IdentityMenu = ({ author }: { author: string }) => {
  const { isOpen, open, close } = useDisclosure()
  const [name, setName] = useState(author)

  return (
    <>
      <Button color="inherit" onClick={open} title={access.changeIdentity(author)} data-testid="identity-menu--open">
        {author}
      </Button>

      {isOpen && (
        <FormDialog
          title={access.identityTitle}
          intro={access.identityIntro}
          action={setAuthor}
          submitLabel={access.saveIdentity}
          onClose={close}
          testId="identity-dialog"
          extraActions={
            <Button formAction={logOut} formNoValidate color="inherit" data-testid="identity-dialog--log-out">
              {access.logOut}
            </Button>
          }
        >
          <AuthorField
            name={ACCESS_FIELDS.author}
            value={name}
            onChange={setName}
            maxLength={AUTHOR_MAX_LENGTH}
            testId="identity-dialog--author"
          />
        </FormDialog>
      )}
    </>
  )
}
