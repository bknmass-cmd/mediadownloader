export type Platform = 'instagram' | 'youtube' | 'threads' | 'twitter' | 'tiktok' | 'facebook' | 'generic';
export type MediaType = 'single_image' | 'carousel' | 'video';

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  thumbnailUrl: string;
  mediaUrl: string;
  duration?: number;
  width?: number;
  height?: number;
  selected?: boolean;
}

export interface ExtractResponse {
  platform: Platform;
  mediaType: MediaType;
  title: string;
  items: MediaItem[];
  thumbnail?: string;
}

export interface SavedMedia {
  id: string;
  fileName: string;
  folder: 'SnapVid/Images' | 'SnapVid/Videos' | string;
  type: 'image' | 'video' | 'audio';
  thumbnailUrl: string;
  fileUri?: string;
  sizeBytes: number;
  savedAt: string;
  platform: Platform;
  isMuted?: boolean;
}
