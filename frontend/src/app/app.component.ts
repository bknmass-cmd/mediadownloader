import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Clipboard } from '@capacitor/clipboard';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { ApiService } from './services/api.service';
import { StorageService } from './services/storage.service';
import { ExtractResponse, MediaItem, SavedMedia, Platform } from './models/media.model';

type ActiveTab = 'home' | 'downloads';
type DownloadFilter = 'all' | 'video' | 'image' | 'audio';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private api = inject(ApiService);
  storage = inject(StorageService);

  // Theme & Navigation
  isDarkMode = signal<boolean>(false);
  activeTab = signal<ActiveTab>('home');
  downloadFilter = signal<DownloadFilter>('all');
  showSettingsModal = signal<boolean>(false);
  howToDownloadOpen = signal<boolean>(false);

  // Input & State
  inputUrl = signal<string>('');
  isLoading = signal<boolean>(false);
  loadingStatus = signal<string>('Extracting media details...');
  errorMessage = signal<string | null>(null);
  successToast = signal<string | null>(null);

  // Extracted Data
  extractedData = signal<ExtractResponse | null>(null);
  selectedImageIds = signal<Set<string>>(new Set<string>());

  // Settings
  customBackendUrl = signal<string>('');

  // Computed
  hasSelectedImages = computed(() => this.selectedImageIds().size > 0);
  selectedImageCount = computed(() => this.selectedImageIds().size);

  filteredDownloads = computed(() => {
    const list = this.storage.savedMedia();
    const filter = this.downloadFilter();
    if (filter === 'all') return list;
    return list.filter(item => item.type === filter);
  });

  ngOnInit(): void {
    // 1. Initialize dark mode preference
    const savedTheme = localStorage.getItem('snapvid_dark_mode');
    if (savedTheme === 'true' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.isDarkMode.set(true);
      document.documentElement.classList.add('dark');
    }

    // 2. Initialize app folders in device storage
    this.storage.initializeAppFolders();

    // 3. Load backend URL
    this.customBackendUrl.set(this.api.getBaseUrl());
  }

  toggleDarkMode(): void {
    const next = !this.isDarkMode();
    this.isDarkMode.set(next);
    localStorage.setItem('snapvid_dark_mode', String(next));
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  async pasteFromClipboard(): Promise<void> {
    try {
      this.errorMessage.set(null);
      if (Capacitor.isNativePlatform()) {
        const { value } = await Clipboard.read();
        if (value) {
          this.inputUrl.set(value.trim());
          this.showToast('Link pasted from clipboard!');
          return;
        }
      }
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          this.inputUrl.set(text.trim());
          this.showToast('Link pasted from clipboard!');
          return;
        }
      }
      this.showToast('Clipboard is empty.');
    } catch {
      this.showToast('Could not read clipboard. Please paste manually.');
    }
  }

  clearInput(): void {
    this.inputUrl.set('');
    this.extractedData.set(null);
    this.errorMessage.set(null);
  }

  async handleDownloadClick(): Promise<void> {
    const url = this.inputUrl().trim();
    if (!url) {
      this.errorMessage.set('Please insert or paste a media link first.');
      return;
    }

    this.isLoading.set(true);
    this.loadingStatus.set('Analyzing link and fetching media info...');
    this.errorMessage.set(null);
    this.extractedData.set(null);

    this.api.extract(url).subscribe({
      next: (res) => {
        this.isLoading.set(false);

        // Normalize fields across snake_case and camelCase
        if (res.items) {
          res.items = res.items.map(item => ({
            ...item,
            thumbnailUrl: item.thumbnailUrl || (item as any).thumbnail_url || (item as any).media_url || item.mediaUrl || '',
            mediaUrl: item.mediaUrl || (item as any).media_url || (item as any).thumbnail_url || item.thumbnailUrl || ''
          }));
        }

        this.extractedData.set(res);

        // Pre-select all images if carousel
        const isCarousel = res.media_type === 'carousel' || (res as any).mediaType === 'carousel';
        if (isCarousel && res.items) {
          const ids = new Set<string>();
          res.items.forEach(item => {
            if (item.type === 'image') ids.add(item.id);
          });
          this.selectedImageIds.set(ids);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err.error?.detail || err.message || 'Failed to extract media. Please verify the URL and backend connection.';
        this.errorMessage.set(msg);
      }
    });
  }

  // Selection handlers for carousel images
  toggleImageSelection(id: string): void {
    const current = new Set(this.selectedImageIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedImageIds.set(current);
  }

  selectAllImages(): void {
    const data = this.extractedData();
    if (!data) return;
    const ids = new Set<string>();
    data.items.forEach(item => {
      if (item.type === 'image') ids.add(item.id);
    });
    this.selectedImageIds.set(ids);
  }

  deselectAllImages(): void {
    this.selectedImageIds.set(new Set<string>());
  }

  // Download actions
  async downloadSingleImage(item: MediaItem): Promise<void> {
    const data = this.extractedData();
    const platform = data ? data.platform : 'generic';
    const filename = `snapvid_img_${Date.now()}.jpg`;

    this.isLoading.set(true);
    this.loadingStatus.set('Downloading image to SnapVid/Images...');

    this.api.downloadBlob(item.mediaUrl, 'image', false, false, filename).subscribe({
      next: async (blob) => {
        await this.storage.saveMedia(blob, filename, 'image', platform, item.thumbnailUrl);
        this.isLoading.set(false);
        this.showToast('Image saved to Pictures/SnapVid/Images!');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set('Download failed: ' + (err.error?.detail || err.message));
      }
    });
  }

  async downloadSelectedImages(): Promise<void> {
    const data = this.extractedData();
    if (!data) return;

    const selectedItems = data.items.filter(item => this.selectedImageIds().has(item.id));
    if (selectedItems.length === 0) {
      this.showToast('Please select at least one image.');
      return;
    }

    this.isLoading.set(true);
    let successCount = 0;

    for (let i = 0; i < selectedItems.length; i++) {
      const item = selectedItems[i];
      this.loadingStatus.set(`Downloading image ${i + 1} of ${selectedItems.length}...`);
      const filename = `snapvid_img_${Date.now()}_${i + 1}.jpg`;

      try {
        const blob = await this.api.downloadBlob(item.mediaUrl, 'image', false, false, filename).toPromise();
        if (blob) {
          await this.storage.saveMedia(blob, filename, 'image', data.platform, item.thumbnailUrl);
          successCount++;
        }
      } catch (e) {
        console.error('Failed to download image item:', e);
      }
    }

    this.isLoading.set(false);
    this.showToast(`Saved ${successCount} images to Pictures/SnapVid/Images!`);
  }

  async downloadVideo(withAudio: boolean = true): Promise<void> {
    const url = this.inputUrl().trim();
    const data = this.extractedData();
    const platform = data ? data.platform : 'generic';
    const filename = withAudio ? `snapvid_video_${Date.now()}.mp4` : `snapvid_muted_${Date.now()}.mp4`;

    this.isLoading.set(true);
    this.loadingStatus.set(withAudio ? 'Downloading video with music to SnapVid/Videos...' : 'Downloading muted video to SnapVid/Videos...');

    this.api.downloadBlob(url, 'video', !withAudio, false, filename).subscribe({
      next: async (blob) => {
        const preview = (data && data.thumbnail) ? data.thumbnail : '';
        await this.storage.saveMedia(blob, filename, 'video', platform, preview, !withAudio);
        this.isLoading.set(false);
        this.showToast(`Video saved to Movies/SnapVid/Videos!`);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set('Video download failed: ' + (err.error?.detail || err.message));
      }
    });
  }

  async downloadAudioOnly(): Promise<void> {
    const url = this.inputUrl().trim();
    const data = this.extractedData();
    const platform = data ? data.platform : 'generic';
    const filename = `snapvid_audio_${Date.now()}.mp3`;

    this.isLoading.set(true);
    this.loadingStatus.set('Extracting audio track as MP3...');

    this.api.downloadBlob(url, 'video', false, true, filename).subscribe({
      next: async (blob) => {
        const preview = (data && data.thumbnail) ? data.thumbnail : '';
        await this.storage.saveMedia(blob, filename, 'audio', platform, preview);
        this.isLoading.set(false);
        this.showToast(`Audio saved to Movies/SnapVid/Videos!`);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set('Audio download failed: ' + (err.error?.detail || err.message));
      }
    });
  }

  async shareItem(item: SavedMedia): Promise<void> {
    try {
      if (Capacitor.isNativePlatform() && item.fileUri) {
        await Share.share({
          title: item.fileName,
          text: `Shared via SnapVid Downloader`,
          url: item.fileUri,
          dialogTitle: 'Share with friends'
        });
      } else {
        await navigator.clipboard.writeText(item.fileName);
        this.showToast('Copied filename to clipboard!');
      }
    } catch (e) {
      console.warn('Share error:', e);
    }
  }

  proxyImg(url: string | undefined): string {
    return this.api.getProxiedImageUrl(url || '');
  }

  saveBackendSetting(): void {
    const url = this.customBackendUrl().trim();
    if (url) {
      this.api.setBaseUrl(url);
      this.showToast('Backend URL updated!');
    }
    this.showSettingsModal.set(false);
  }

  showToast(message: string): void {
    this.successToast.set(message);
    setTimeout(() => {
      this.successToast.set(null);
    }, 3000);
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
