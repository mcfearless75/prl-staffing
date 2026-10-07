/**
 * What each profile section exposes to the single button at the bottom of the
 * page (profile-flow.tsx). Sections no longer have save buttons of their own.
 */
export type SaveResult = { ok: true; daBlocked?: boolean } | { ok: false; error: string };

export interface SectionHandle<V = unknown> {
  /** Current answers, for the whole-page "still needed" check. null = section not shown. */
  values(): V | null;
  /** Anything changed since it was loaded or last saved. */
  dirty(): boolean;
  /** Save this section. `final` = the worker pressed Submit, not "finish later". */
  save(final: boolean): Promise<SaveResult>;
}
