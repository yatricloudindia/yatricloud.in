import announcementConfig from "./announcement.json";

export interface AnnouncementConfig {
  enabled: boolean;
  badge?: string;
  message: string;
  linkText?: string;
  linkHref?: string;
}

export const ANNOUNCEMENT: AnnouncementConfig = announcementConfig;
