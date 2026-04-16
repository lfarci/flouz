type NodeLikeError = Error & {
  code?: string
}

export function isBrokenPipeError(error: unknown): boolean {
  return error instanceof Error && (error as NodeLikeError).code === 'EPIPE'
}

export function writeStdout(output: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      cleanup()
      reject(error)
    }

    const cleanup = () => {
      process.stdout.off('error', onError)
    }

    process.stdout.once('error', onError)
    process.stdout.write(output, (error) => {
      cleanup()
      if (error != null) {
        reject(error)
        return
      }

      resolve()
    })
  })
}
