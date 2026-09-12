/** One uploaded file with its bytes untouched, for the run's archive (§6.5). */
export interface UploadedFile {
  filename: string
  content: Buffer
}
