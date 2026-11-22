import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';

export interface MediaStorePlugin {
  saveToGallery(options: {
    base64Data?: string;
    filePath?: string;
    fileName: string;
    mimeType: string;
    subfolder: 'Pictures/SnapVid/Images' | 'Movies/SnapVid/Videos' | string;
  }): Promise<{ success: boolean; uri?: string }>;

  getGalleryMedia(options: {
    subfolder: 'Pictures/SnapVid/Images' | 'Movies/SnapVid/Videos' | string;
  }): Promise<{ items: Array<{ id: string; name: string; uri: string; date: number }> }>;
}

const MediaStore = registerPlugin<MediaStorePlugin>('MediaStore');

@Injectable({
  providedIn: 'root'
})
export class MediaStoreService {
  isNative = Capacitor.isNativePlatform();

  async registerWithMediaStore(options: {
    base64Data?: string;
    filePath?: string;
    fileName: string;
    mimeType: string;
    subfolder: 'Pictures/SnapVid/Images' | 'Movies/SnapVid/Videos' | string;
  }): Promise<{ success: boolean; uri?: string }> {
    if (this.isNative) {
      try {
        return await MediaStore.saveToGallery(options);
      } catch (err) {
        console.warn('Native MediaStore registration fallback:', err);
      }
    }
    return { success: true };
  }
}
