(function () {
  'use strict';

  var chargeur = document.createElement('div');
  chargeur.className = 'chargeur-site';
  chargeur.setAttribute('role', 'status');
  chargeur.setAttribute('aria-label', 'Chargement de la Pharmacie de la Mairie');
  chargeur.innerHTML = '<div class="chargeur-contenu">' +
    '<div class="chargeur-logo"><img src="logo.png" alt="" width="72" height="72"></div>' +
    '<div class="chargeur-capsule" aria-hidden="true"><span></span></div>' +
    '<p>Pharmacie de la Mairie</p>' +
    '<span class="chargeur-point" aria-hidden="true"></span>' +
    '</div>';

  document.body.insertBefore(chargeur, document.body.firstChild);

  function masquer() {
    chargeur.classList.add('chargeur-termine');
    window.setTimeout(function () {
      chargeur.hidden = true;
    }, 450);
  }

  window.masquerChargement = masquer;
  window.addEventListener('load', masquer, { once: true });
})();
