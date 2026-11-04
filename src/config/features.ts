/**
 * Feature Flags Configuration
 * Override any flag via VITE_FEATURE_* env var (set to "true").
 * Defaults to false so production stays clean until a feature is promoted.
 */
export const FEATURE_FLAGS = {
  myDashboard: import.meta.env.VITE_FEATURE_DASHBOARD !== 'false',
  events:      import.meta.env.VITE_FEATURE_EVENTS     !== 'false',
  trainings:   import.meta.env.VITE_FEATURE_TRAININGS  !== 'false',
  userGuide:   import.meta.env.VITE_FEATURE_USERGUIDE  === 'true',
  userSitemap: import.meta.env.VITE_FEATURE_SITEMAP    === 'true',
  myBlogs:     import.meta.env.VITE_FEATURE_BLOGS      !== 'false',
} as const;
