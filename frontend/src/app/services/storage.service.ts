import { Injectable, signal, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { MediaStoreService } from './media-store.service';
import { SavedMedia, Platform } from '../models/media.model';

const STORAGE_KEY = 'snapvid_downloads_history_v1';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private mediaStore = inject(MediaStoreService);

  savedMedia = signal<SavedMedia[]>(this.loadSaved());

  /**
   * Called on app boot:
   * Requests permissions and ensures SnapVid/Images and SnapVid/Videos folders exist in phone storage
   */
  async initializeAppFolders(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.requestPermissions().catch(() => {});

        // Ensure Pictures/SnapVid/Images exists
        await Filesystem.mkdir({
          path: 'Pictures/SnapVid/Images',
          directory: Directory.Documents,
          recursive: true
        }).catch(() => {});

        // Ensure Movies/SnapVid/Videos exists
        await Filesystem.mkdir({
          path: 'Movies/SnapVid/Videos',
          directory: Directory.Documents,
          recursive: true
        }).catch(() => {});
      } catch (e) {
        console.warn('Storage initialization warning:', e);
      }
    }
  }

  loadSaved(): SavedMedia[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveToLocalDatabase(item: SavedMedia): void {
    const list = [item, ...this.savedMedia().filter(x => x.id !== item.id)];
    this.savedMedia.set(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  deleteItem(id: string): void {
    const list = this.savedMedia().filter(x => x.id !== id);
    this.savedMedia.set(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  async saveMedia(
    blob: Blob,
    filename: string,
    type: 'image' | 'video' | 'audio',
    platform: Platform,
    previewUrl: string,
    isMuted: boolean = false
  ): Promise<SavedMedia> {
    let subfolder: string;
    let mimeType: string;

    if (type === 'image') {
      subfolder = 'Pictures/SnapVid/Images';
      mimeType = blob.type || 'image/jpeg';
    } else if (type === 'audio') {
      subfolder = 'Movies/SnapVid/Videos';
      mimeType = 'audio/mpeg';
    } else {
      subfolder = 'Movies/SnapVid/Videos';
      mimeType = 'video/mp4';
    }

    let fileUri: string | undefined;

    if (Capacitor.isNativePlatform()) {
      try {
        // Convert Blob to Base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const res = reader.result as string;
            resolve(res.split(',')[1] || res);
          };
        });
        reader.readAsDataURL(blob);
        const base64Data = await base64Promise;

        // Write to filesystem
        const writeRes = await Filesystem.writeFile({
          path: `${subfolder}/${filename}`,
          data: base64Data,
          directory: Directory.Documents,
          recursive: true
        });

        fileUri = writeRes.uri;

        // Register with native Android MediaStore so it appears instantly in phone Gallery
        await this.mediaStore.registerWithMediaStore({
          base64Data,
          fileName: filename,
          mimeType,
          subfolder
        });
      } catch (err) {
        console.error('Failed to write native file:', err);
      }
    } else {
      // Browser fallback: trigger browser download
      try {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      } catch (err) {
        console.error('Browser download trigger failed:', err);
      }
    }

    const savedRecord: SavedMedia = {
      id: `saved-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fileName: filename,
      folder: subfolder,
      type,
      thumbnailUrl: previewUrl,
      fileUri,
      sizeBytes: blob.size,
      savedAt: new Date().toISOString(),
      platform,
      isMuted
    };

    this.saveToLocalDatabase(savedRecord);
    return savedRecord;
  }
}
