export type MediaType = 'image' | 'video';

export interface MediaItem {
  id: string;
  uri: string;
  type: MediaType;
  duration?: number; // seconds, for videos
  width: number;
  height: number;
  thumbnailUri?: string;
}

export interface ReelConfig {
  clipDurationForImages: number; // seconds each photo shows
  maxClipDuration: number;       // max seconds per video clip
  outputWidth: number;
  outputHeight: number;
  transitionDuration: number;    // seconds
}

export type RootStackParamList = {
  Home: undefined;
  Preview: { outputUri: string };
};
