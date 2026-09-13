/** Result of a form server action, read through `useActionState`. */
export type FormState = { _type: 'idle' } | { _type: 'done' } | { _type: 'failed'; message: string }

export const IDLE_FORM_STATE: FormState = Object.freeze({ _type: 'idle' })

export const DONE_FORM_STATE: FormState = Object.freeze({ _type: 'done' })

export const failedFormState = (message: string): FormState => ({ _type: 'failed', message })
