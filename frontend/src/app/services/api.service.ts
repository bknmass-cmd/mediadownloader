import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { ExtractResponse } from '../models/media.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);

  // Default backend URL detection
  getBaseUrl(): string {
    const saved = localStorage.getItem('snapvid_custom_backend');
    if (saved && saved.trim().length > 0) {
      return saved.trim().replace(/\/$/, '');
    }

    // On physical Android phone connected via Wi-Fi:
    if (Capacitor.isNativePlatform()) {
      return 'http://192.168.1.4:8000';
    }

    // In desktop browser:
    return 'http://localhost:8000';
  }

  setBaseUrl(url: string): void {
    localStorage.setItem('snapvid_custom_backend', url.trim());
  }

  extract(targetUrl: string): Observable<ExtractResponse> {
    const baseUrl = this.getBaseUrl();
    return this.http.post<ExtractResponse>(`${baseUrl}/api/extract`, { url: targetUrl });
  }

  getProxiedImageUrl(originalUrl: string): string {
    if (!originalUrl) return '';
    // If it's already a data: URI or blob:, don't proxy
    if (originalUrl.startsWith('data:') || originalUrl.startsWith('blob:')) {
      return originalUrl;
    }
    const baseUrl = this.getBaseUrl();
    return `${baseUrl}/api/proxy-image?url=${encodeURIComponent(originalUrl)}`;
  }

  getDownloadUrl(sourceUrl: string, type: 'video' | 'image', mute: boolean = false, audioOnly: boolean = false, filename?: string): string {
    const baseUrl = this.getBaseUrl();
    const params = new URLSearchParams({
      url: sourceUrl,
      type,
      mute: mute ? 'true' : 'false',
      audio_only: audioOnly ? 'true' : 'false'
    });
    if (filename) {
      params.append('filename', filename);
    }
    return `${baseUrl}/api/download?${params.toString()}`;
  }

  downloadBlob(sourceUrl: string, type: 'video' | 'image', mute: boolean = false, audioOnly: boolean = false, filename?: string): Observable<Blob> {
    const downloadUrl = this.getDownloadUrl(sourceUrl, type, mute, audioOnly, filename);
    return this.http.get(downloadUrl, { responseType: 'blob' });
  }

  checkHealth(): Observable<{ status: string; app: string; ffmpeg?: boolean }> {
    const baseUrl = this.getBaseUrl();
    return this.http.get<{ status: string; app: string; ffmpeg?: boolean }>(`${baseUrl}/health`);
  }
}
