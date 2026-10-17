/**
 * Web Share Target & File Handling API Service
 * Handles files shared from native phone apps (WhatsApp, Chrome, Files)
 * into SyllabusOS via PWA Web Share Target Level 2 and LaunchQueue.
 */

export interface RetrievedSharePayload {
  files: File[];
  title?: string;
  text?: string;
  url?: string;
}

const CACHE_NAME = 'm2029-shared-target';

/**
 * Checks CacheStorage for files shared via native mobile share sheet.
 * If found, reconstructs File objects, cleans the cache, and returns them.
 */
export async function checkAndRetrieveSharedFiles(): Promise<RetrievedSharePayload | null> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return null;
  }

  try {
    const cache = await caches.open(CACHE_NAME);
    const metaRes = await cache.match('/shared-meta');

    if (!metaRes) {
      return null;
    }

    const meta = await metaRes.json();
    const retrievedFiles: File[] = [];

    if (meta.files && Array.isArray(meta.files)) {
      for (const item of meta.files) {
        try {
          const fileRes = await cache.match(item.key);
          if (fileRes) {
            const blob = await fileRes.blob();
            const decodedName = decodeURIComponent(
              fileRes.headers.get('x-file-name') || item.name || 'study_document.pdf'
            );
            const mimeType =
              fileRes.headers.get('x-file-type') || item.type || blob.type || 'application/pdf';

            const reconstructedFile = new File([blob], decodedName, {
              type: mimeType,
              lastModified: Date.now(),
            });

            retrievedFiles.push(reconstructedFile);
            await cache.delete(item.key);
          }
        } catch (itemErr) {
          console.warn('Failed retrieving shared file item:', itemErr);
        }
      }
    }

    // Clean up metadata once processed
    await cache.delete('/shared-meta');

    if (retrievedFiles.length > 0 || meta.text) {
      return {
        files: retrievedFiles,
        title: meta.title,
        text: meta.text,
        url: meta.sharedUrl,
      };
    }
  } catch (err) {
    console.warn('Error reading shared target cache:', err);
  }

  return null;
}

/**
 * Registers Web File Handling API consumer (Chromium / Android "Open with...").
 */
export function registerLaunchQueueHandler(onFilesReceived: (files: File[]) => void): void {
  if (typeof window === 'undefined') return;

  const win = window as any;
  if ('launchQueue' in win && typeof win.launchQueue?.setConsumer === 'function') {
    try {
      win.launchQueue.setConsumer(async (launchParams: any) => {
        if (!launchParams?.files?.length) return;

        const files: File[] = [];
        for (const handle of launchParams.files) {
          try {
            const file = await handle.getFile();
            if (file) {
              files.push(file);
            }
          } catch (e) {
            console.warn('Error getting file from launchQueue handle:', e);
          }
        }

        if (files.length > 0) {
          onFilesReceived(files);
        }
      });
    } catch (e) {
      console.warn('LaunchQueue initialization failed:', e);
    }
  }
}
