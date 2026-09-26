'use strict';

var CACHE_NAME = 'pharmacie-hors-ligne-v1';
var PAGE_HORS_LIGNE = new URL('hors-ligne.html', self.location).href;

self.addEventListener('install', function (evenement) {
  evenement.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.add(PAGE_HORS_LIGNE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (evenement) {
  evenement.waitUntil(
    caches.keys()
      .then(function (cles) {
        return Promise.all(cles.map(function (cle) {
          if (cle.indexOf('pharmacie-hors-ligne-') === 0 && cle !== CACHE_NAME) {
            return caches.delete(cle);
          }
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (evenement) {
  if (evenement.request.mode !== 'navigate') return;

  evenement.respondWith(
    fetch(evenement.request).catch(function () {
      if (evenement.request.url === PAGE_HORS_LIGNE) {
        return caches.match(PAGE_HORS_LIGNE).then(function (page) {
          return page || new Response('Connexion internet indisponible.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      }
      return Response.redirect(PAGE_HORS_LIGNE, 302);
    })
  );
});