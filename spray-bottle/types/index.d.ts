declare module 'claude-code' {
  interface PluginState {
    'spray-bottle': { sprayAt: number | null; lastAt: number; count: number; combo: number }
  }
}
export type SprayState = { sprayAt: number | null; lastAt: number; count: number; combo: number }
