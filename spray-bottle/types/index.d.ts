declare module 'claude-code' {
  interface PluginState {
    'spray-bottle': { sprayAt: number | null; count: number }
  }
}
export type SprayState = { sprayAt: number | null; count: number }
