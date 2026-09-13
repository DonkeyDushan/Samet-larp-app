/** A text field of a submitted form, `''` when absent. */
export const readFormField = (formData: FormData, name: string): string => String(formData.get(name) ?? '')

/** Non-empty files of a multi-file input. */
export const readFormFiles = (formData: FormData, name: string): File[] => {
  const files: File[] = []
  for (const entry of formData.getAll(name)) {
    if (entry instanceof File && entry.size > 0) files.push(entry)
  }

  return files
}
