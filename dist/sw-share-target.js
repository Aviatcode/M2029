/**
 * Web Share Target Level 2 Service Worker Extension
 * Intercepts incoming files and text shared to SyllabusOS via the native phone Share Sheet.
 */

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Intercept POST to share-target endpoint
  if (
    event.request.method === 'POST' &&
    (url.pathname.endsWith('/share-target') ||
      url.pathname.includes('share-target') ||
      url.search.includes('share-target') ||
      url.search.includes('shared=1'))
  ) {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const files = formData.getAll('files') || [];
          const text = (formData.get('text') || '').toString();
          const title = (formData.get('title') || '').toString();
          const sharedUrl = (formData.get('url') || '').toString();

          const cache = await caches.open('m2029-shared-target');
          const sharedFilesMeta = [];

          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file && typeof file === 'object' && file.name) {
              const buffer = await file.arrayBuffer();
              const key = `/shared-file-${Date.now()}-${i}-${encodeURIComponent(file.name)}`;

              await cache.put(
                key,
                new Response(buffer, {
                  headers: {
                    'content-type': file.type || 'application/octet-stream',
                    'x-file-name': encodeURIComponent(file.name),
                    'x-file-size': String(file.size || buffer.byteLength),
                    'x-file-type': file.type || '',
                  },
                })
              );

              sharedFilesMeta.push({
                name: file.name,
                type: file.type,
                size: file.size,
                key,
              });
            }
          }

          // Save metadata
          await cache.put(
            '/shared-meta',
            new Response(
              JSON.stringify({
                title,
                text,
                sharedUrl,
                timestamp: Date.now(),
                files: sharedFilesMeta,
              }),
              {
                headers: { 'content-type': 'application/json' },
              }
            )
          );
        } catch (err) {
          console.warn('PWA Share Target worker error:', err);
        }

        // Redirect user directly into the Study Drop & Auto-Sort tab
        return Response.redirect('/#dump?from_share=1', 303);
      })()
    );
  }
});
