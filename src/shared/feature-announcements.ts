import { createFeatureAnnouncement } from '@/shared/feature-announcement'

export const SUBTITLE_OPTIONS_HASH = '#subtitle-navigation'

export const subtitleNavigationAnnouncement = createFeatureAnnouncement({
  id: 'subtitle-navigation',
  introducedIn: '0.6.3',
  isEnabled: settings => settings.subtitlePractice.enabled,
})

// Register every feature here so NEW reflects all unread announcements.
export const FEATURE_ANNOUNCEMENTS = [subtitleNavigationAnnouncement] as const
