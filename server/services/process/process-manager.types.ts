export type ManagedProcess = {
  instanceSlug: string
  process: {
    pid?: number
    stdout?: NodeJS.ReadableStream | null
    stderr?: NodeJS.ReadableStream | null
    kill: (signal?: NodeJS.Signals | number, error?: Error) => boolean | void
    on: (event: 'exit', listener: () => void) => unknown
  }
  stdoutBuffer: string
  stderrBuffer: string
}
