// ===================================================
// Pharmacie de la Mairie de Yopougon — script unique du site
// Ce fichier est chargé par toutes les pages HTML (comme style.css).
// Chaque fonction vérifie la présence des éléments dont elle a besoin :
// elle ne fait donc rien sur les pages qui ne les contiennent pas.
// ===================================================
(function () {
  'use strict';

  /* ===================================================
     Connexion à Firebase (configuration du projet)
     =================================================== */

  var firebaseConfig = {
    apiKey: "AIzaSyDCOGLUqGOLXHMhM3lJcaPkTL6oTK629pA",
    authDomain: "pharmacie-mairie-yopougon.firebaseapp.com",
    projectId: "pharmacie-mairie-yopougon",
    storageBucket: "pharmacie-mairie-yopougon.firebasestorage.app",
    messagingSenderId: "201903503337",
    appId: "1:201903503337:web:2f8bb7ee695db132887d78"
  };

  try {
    firebase.initializeApp(firebaseConfig);
  } catch (e) {
    console.error('Firebase n\u2019a pas pu être initialisé :', e);
  }

  var auth = firebase.auth();
  var db = firebase.firestore();
  window.auth = auth;
  window.db = db;

  /* ===================================================
     Menu de navigation (version mobile) — toutes les pages publiques
     =================================================== */

  function initMenu() {
    var menu = document.querySelector('.menu');
    var bouton = menu && menu.querySelector('.menu-toggle');
    if (!menu || !bouton) return;

    function fermer() {
      menu.classList.remove('open');
      bouton.setAttribute('aria-expanded', 'false');
    }

    // Cette classe active le menu déroulant : sans JavaScript, la liste reste visible.
    menu.classList.add('menu--js');

    bouton.addEventListener('click', function () {
      var ouvert = menu.classList.toggle('open');
      bouton.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    });

    Array.prototype.forEach.call(menu.querySelectorAll('.menu-liste a'), function (lien) {
      lien.addEventListener('click', fermer);
    });

    document.addEventListener('keydown', function (evenement) {
      if (evenement.key === 'Escape') fermer();
    });

    document.addEventListener('click', function (evenement) {
      if (!menu.contains(evenement.target)) fermer();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 980) fermer();
    });
  }

  /* ===================================================
     Bandeau de garde + statut d'ouverture — toutes les pages publiques
     =================================================== */

  function afficherBandeau(deGarde) {
    var bandeau = document.getElementById('garde-banner');
    if (!bandeau) return;

    var texte = document.createElement('span');

    if (deGarde) {
      bandeau.className = 'garde-banner active';
      texte.className = 'scroll-track';
      texte.textContent = '📢 La Pharmacie de la Mairie de Yopougon est DE GARDE aujourd\u2019hui — ouverte pour vous accueillir.';
    } else {
      bandeau.className = 'garde-banner inactive';
      texte.className = 'message-fixe';
      texte.textContent = 'La pharmacie n\u2019est pas de garde aujourd\u2019hui.';
    }

    bandeau.textContent = '';
    bandeau.appendChild(texte);
  }

  // Horaires habituels, en minutes depuis minuit, pour chaque jour
  // (0 = dimanche ... 6 = samedi) : [ouverture, fermeture].
  // 7h30 = 450 · 12h30 = 750 · 20h00 = 1200.
  // Le dimanche, la pharmacie n'ouvre que les jours de garde (null = pas d'horaires habituels).
  var HORAIRES = {
    0: null,
    1: [450, 1200],
    2: [450, 1200],
    3: [450, 1200],
    4: [450, 1200],
    5: [450, 1200],
    6: [450, 750]
  };
  var NOMS_JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var FUSEAU = 'Africa/Abidjan';   // l'heure affichée ne dépend pas du fuseau du visiteur
  var ALERTE_FERMETURE = 60;       // « Ferme bientôt » pendant la dernière heure

  var etatGarde = null;            // true / false, ou null si le serveur n'a pas répondu

  // Jour de la semaine et minutes écoulées depuis minuit, à Abidjan.
  function heureAbidjan() {
    try {
      var parties = new Intl.DateTimeFormat('en-US', {
        timeZone: FUSEAU, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
      }).formatToParts(new Date());
      var v = {};
      parties.forEach(function (p) { v[p.type] = p.value; });
      var jours = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      var jour = jours[v.weekday];
      var minutes = (parseInt(v.hour, 10) % 24) * 60 + parseInt(v.minute, 10);
      if (typeof jour !== 'number' || isNaN(minutes)) throw new Error('heure illisible');
      return { jour: jour, minutes: minutes };
    } catch (e) {
      // Navigateur trop ancien : on utilise l'heure de l'appareil.
      var d = new Date();
      return { jour: d.getDay(), minutes: d.getHours() * 60 + d.getMinutes() };
    }
  }

  function formaterHeure(minutes) {
    var h = Math.floor(minutes / 60);
    var m = minutes % 60;
    return h + 'h' + (m < 10 ? '0' : '') + m;
  }

  // Prochaine ouverture habituelle : « aujourd'hui », « demain » ou le nom du jour.
  function prochaineOuverture(maintenant) {
    var aujourdhui = HORAIRES[maintenant.jour];
    if (aujourdhui && maintenant.minutes < aujourdhui[0]) {
      return { quand: 'aujourd\u2019hui', heure: formaterHeure(aujourdhui[0]) };
    }
    for (var i = 1; i <= 7; i++) {
      var jour = (maintenant.jour + i) % 7;
      if (HORAIRES[jour]) {
        return { quand: i === 1 ? 'demain' : NOMS_JOURS[jour], heure: formaterHeure(HORAIRES[jour][0]) };
      }
    }
    return null;
  }

  // Choisit le message : etat = ouvert | bientot | ferme | neutre.
  // « long » s'affiche sur grand écran, « court » sur mobile.
  function calculerStatut(maintenant, garde) {
    var horaires = HORAIRES[maintenant.jour];
    var ouvert = !!horaires && maintenant.minutes >= horaires[0] && maintenant.minutes < horaires[1];

    if (garde === true) {
      return { etat: 'ouvert', long: 'Pharmacie de garde · ouverte', court: 'De garde · ouverte' };
    }

    if (ouvert) {
      var fermeture = formaterHeure(horaires[1]);
      if (horaires[1] - maintenant.minutes <= ALERTE_FERMETURE) {
        return { etat: 'bientot', long: 'Ferme bientôt · à ' + fermeture, court: 'Ferme à ' + fermeture };
      }
      return {
        etat: 'ouvert',
        long: 'Ouvert maintenant · ferme à ' + fermeture,
        court: 'Ouvert jusqu\u2019à ' + fermeture
      };
    }

    // Hors des horaires habituels
    if (maintenant.jour === 0 && garde === null) {
      // Dimanche et statut de garde inconnu : on ne prétend pas que c'est fermé.
      return {
        etat: 'neutre',
        long: 'Dimanche : ouvert uniquement les jours de garde',
        court: 'Ouvert les jours de garde'
      };
    }

    var suite = prochaineOuverture(maintenant);
    var reouverture = suite ? 'ouvre ' + suite.quand + ' à ' + suite.heure : '';

    if (garde === false) {
      return {
        etat: 'ferme',
        long: 'Fermé' + (reouverture ? ' · ' + reouverture : ''),
        court: 'Fermé' + (reouverture ? ' · ' + reouverture : '')
      };
    }

    // Statut de garde inconnu (serveur injoignable) : formulation prudente.
    return {
      etat: 'neutre',
      long: 'Hors horaires habituels' + (reouverture ? ' · ' + reouverture : ''),
      court: reouverture ? reouverture.charAt(0).toUpperCase() + reouverture.slice(1) : 'Hors horaires habituels'
    };
  }

  function afficherStatut() {
    var zone = document.getElementById('statut-ouverture');
    if (!zone) return;

    var statut = calculerStatut(heureAbidjan(), etatGarde);

    var spanLong = document.createElement('span');
    spanLong.className = 'statut-long';
    spanLong.textContent = statut.long;

    var spanCourt = document.createElement('span');
    spanCourt.className = 'statut-court';
    spanCourt.textContent = statut.court;

    zone.className = 'statut-ouverture statut--' + statut.etat;
    zone.title = statut.long;
    zone.textContent = '';
    zone.appendChild(spanLong);
    zone.appendChild(spanCourt);
    zone.hidden = false;
  }

  // Interroge le serveur (garde), puis affiche le bandeau et le statut d'ouverture.
  // Ne fait rien sur les pages qui n'ont ni bandeau ni statut (ex. login, dashboard).
  function initGardeEtStatut() {
    if (!document.getElementById('garde-banner') && !document.getElementById('statut-ouverture')) return;

    var affiche = false;
    function montrer() {
      affiche = true;
      afficherStatut();
    }

    // Si le serveur tarde trop, on affiche quand même le statut d'après les horaires habituels.
    setTimeout(function () { if (!affiche) montrer(); }, 2000);

    db.collection('config').doc('garde').get()
      .then(function (doc) {
        var donnees = doc.exists ? doc.data() : null;
        if (!donnees || typeof donnees.active !== 'boolean') return;
        etatGarde = donnees.active;
        afficherBandeau(donnees.active);
      })
      .catch(function () {
        // Firestore injoignable : on n'affiche pas de bandeau plutôt que d'annoncer
        // « pas de garde » sans en être sûr.
      })
      .then(montrer);

    // Le statut se met à jour tout seul (passage à « Ferme bientôt », etc.)
    setInterval(function () { if (affiche) afficherStatut(); }, 60000);
  }

  /* ===================================================
     Page d'accueil : diaporama, horaires du jour, carrousel vidéo
     =================================================== */

  function initDiaporama() {
    var images = document.querySelectorAll('.hero-visual-img');
    if (images.length < 2) return;

    var actuelle = 0;
    setInterval(function () {
      images[actuelle].classList.remove('active');
      actuelle = (actuelle + 1) % images.length;
      images[actuelle].classList.add('active');
    }, 4000);
  }

  // Met en valeur la carte du jour dans la section « Horaires d'ouverture ».
  function initHorairesAujourdhui() {
    var cartes = document.querySelectorAll('[data-jours]');
    if (!cartes.length) return;

    var jour = String(heureAbidjan().jour);

    Array.prototype.forEach.call(cartes, function (carte) {
      var jours = carte.getAttribute('data-jours').split(',');
      if (jours.indexOf(jour) === -1) return;

      carte.classList.add('card--aujourdhui');
      var etiquette = document.createElement('span');
      etiquette.className = 'etiquette-jour';
      etiquette.textContent = 'Aujourd\u2019hui';
      carte.insertBefore(etiquette, carte.firstChild);
    });
  }

  // Carrousel vidéo (« La pharmacie en vidéo ») : les vidéos sont des balises
  // <video class="video-carousel-media"> dans le HTML — pour en ajouter ou en
  // retirer, il suffit de modifier ces balises, pas ce script. Elles s'enchaînent
  // une à une : quand l'une se termine, la suivante démarre automatiquement (et
  // on reboucle après la dernière). Des puces, générées ici, permettent aussi
  // de choisir une vidéo directement.
  function initCarrouselVideo() {
    var carrousel = document.getElementById('video-carousel');
    var titreEl = document.getElementById('video-carousel-titre');
    var puces = document.getElementById('video-carousel-puces');
    var videos = carrousel ? carrousel.querySelectorAll('.video-carousel-media') : [];
    if (!carrousel || !puces || !videos.length) return;

    var actuelle = 0;

    function afficher(index, lireAuto) {
      var precedente = videos[actuelle];
      if (precedente && !precedente.paused) precedente.pause();

      actuelle = index;
      var video = videos[actuelle];

      Array.prototype.forEach.call(videos, function (v, i) {
        v.classList.toggle('active', i === actuelle);
      });
      titreEl.textContent = video.getAttribute('data-titre') || '';

      Array.prototype.forEach.call(puces.children, function (puce, i) {
        puce.classList.toggle('active', i === actuelle);
        puce.setAttribute('aria-current', i === actuelle ? 'true' : 'false');
      });

      if (lireAuto) {
        // La lecture automatique peut être bloquée par le navigateur
        // (normal si le visiteur n'a pas encore interagi) : sans gravité,
        // il lui suffit d'appuyer sur lecture.
        video.currentTime = 0;
        video.play().catch(function () {});
      }
    }

    Array.prototype.forEach.call(videos, function (video, i) {
      var puce = document.createElement('button');
      puce.type = 'button';
      puce.className = 'video-carousel-puce';
      puce.setAttribute('aria-label', video.getAttribute('data-titre') || ('Vidéo ' + (i + 1)));
      puce.addEventListener('click', function () { afficher(i, true); });
      puces.appendChild(puce);

      video.addEventListener('ended', function () {
        afficher((i + 1) % videos.length, true);
      });
    });

    afficher(0, false);
  }

  /* ===================================================
     Prix (utilisé par le catalogue public et le tableau de bord)
     =================================================== */

  function formaterPrix(prix) {
    var nombre = Number(prix);
    if (!isFinite(nombre)) return '';
    return nombre.toLocaleString('fr-FR') + ' FCFA';
  }

  /* ===================================================
     Catalogue produits — page publique (produits.html)
     =================================================== */

  function messageCatalogue(conteneur, texte) {
    conteneur.textContent = '';
    var p = document.createElement('p');
    p.className = 'empty-state';
    p.textContent = texte;
    conteneur.appendChild(p);
  }

  function initProduits() {
    var conteneur = document.getElementById('liste-produits-public');
    if (!conteneur) return;

    var recherche = document.getElementById('recherche-produit');
    var filtreCategorie = document.getElementById('filtre-categorie');
    var compteur = document.getElementById('compteur-produits');
    var tousLesProduits = [];

    function normaliser(texte) {
      return String(texte || '').toLocaleLowerCase('fr-FR')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function remplirCategories() {
      var categories = {};
      tousLesProduits.forEach(function (produit) {
        var categorie = String(produit.categorie || '').trim();
        if (categorie) categories[categorie] = true;
      });
      filtreCategorie.textContent = '';
      var toutes = document.createElement('option');
      toutes.value = '';
      toutes.textContent = 'Toutes les catégories';
      filtreCategorie.appendChild(toutes);
      Object.keys(categories).sort(function(a,b){ return a.localeCompare(b, 'fr'); })
        .forEach(function(categorie) {
          var option = document.createElement('option');
          option.value = categorie;
          option.textContent = categorie;
          filtreCategorie.appendChild(option);
        });
    }

    function afficher(resultats) {
      conteneur.textContent = '';
      if (compteur) compteur.textContent =
        resultats.length + ' produit' + (resultats.length > 1 ? 's' : '') +
        ' affiché' + (resultats.length > 1 ? 's' : '');
      if (resultats.length === 0) {
        messageCatalogue(conteneur, 'Aucun produit ne correspond à votre recherche.');
        return;
      }

      resultats.forEach(function (produit) {
        var carte = document.createElement('div');
        carte.className = 'card card-produit';

        var categorie = document.createElement('span');
        categorie.className = 'badge-categorie';
        categorie.textContent = produit.categorie || 'Sans catégorie';
        carte.appendChild(categorie);

        var titre = document.createElement('h3');
        titre.textContent = produit.nom || '';
        carte.appendChild(titre);

        var description = document.createElement('p');
        description.className = 'description-produit';
        description.textContent = produit.description || '';
        if (description.textContent) carte.appendChild(description);

        var stock = document.createElement('span');
        var enStock = produit.disponible !== false;
        stock.className = 'badge-stock ' + (enStock ? 'en-stock' : 'rupture');
        stock.textContent = enStock ? 'En stock' : 'Rupture de stock';
        carte.appendChild(stock);

        var prix = document.createElement('p');
        prix.className = 'prix';
        prix.textContent = formaterPrix(produit.prix);
        carte.appendChild(prix);

        conteneur.appendChild(carte);
      });
    }

    function filtrer() {
      var texte = normaliser(recherche ? recherche.value : '');
      var categorie = filtreCategorie ? filtreCategorie.value : '';
      var resultats = tousLesProduits.filter(function (produit) {
        return (!texte || normaliser(produit.nom).indexOf(texte) !== -1) &&
               (!categorie || String(produit.categorie || '') === categorie);
      });
      afficher(resultats);
    }

    if (recherche) recherche.addEventListener('input', filtrer);
    if (filtreCategorie) filtreCategorie.addEventListener('change', filtrer);

    // On ne trie pas avec orderBy côté Firestore : certains anciens produits
    // peuvent ne pas avoir le champ creeLe. On récupère donc tous les produits
    // puis on les trie côté navigateur sans exclure les documents incomplets.
    db.collection('produits').get()
      .then(function (snapshot) {
        tousLesProduits = snapshot.docs.map(function (doc) {
          var donnees = doc.data() || {};
          donnees.id = doc.id;
          return donnees;
        });

        tousLesProduits.sort(function (a, b) {
          var ta = a.creeLe && typeof a.creeLe.toMillis === 'function' ? a.creeLe.toMillis() : 0;
          var tb = b.creeLe && typeof b.creeLe.toMillis === 'function' ? b.creeLe.toMillis() : 0;
          return tb - ta;
        });

        remplirCategories();
        filtrer();
      })
      .catch(function (e) {
        if (compteur) compteur.textContent = '';
        console.error('Erreur catalogue produits :', e);
        messageCatalogue(conteneur, 'Le catalogue est momentanément indisponible. Merci de réessayer plus tard.');
      });
  }

  /* ===================================================
     Connexion admin (login.html)
     =================================================== */

  function initLogin() {
    var formulaire = document.getElementById('login-form');
    if (!formulaire) return;

    var champEmail = document.getElementById('email');
    var champMotDePasse = document.getElementById('password');
    var zoneErreur = document.getElementById('login-error');
    var zoneReset = document.getElementById('reset-message');
    var boutonReset = document.getElementById('reset-password-btn');
    var bouton = formulaire.querySelector('button[type="submit"]');
    var zoneEtat = document.getElementById('firebase-status');

    function afficherEtat(texte, erreur) {
      if (!zoneEtat) return;
      zoneEtat.textContent = texte;
      zoneEtat.className = 'firebase-status' + (erreur ? ' error' : '');
    }

    function messageErreur(code) {
      switch (code) {
        case 'auth/invalid-email':       return 'Adresse e-mail invalide.';
        case 'auth/user-disabled':       return 'Ce compte a été désactivé.';
        case 'auth/user-not-found':      return 'Aucun compte ne correspond à cet e-mail.';
        case 'auth/wrong-password':      return 'Mot de passe incorrect.';
        case 'auth/invalid-credential':  return 'E-mail ou mot de passe incorrect.';
        case 'auth/too-many-requests':   return 'Trop de tentatives. Réessayez dans quelques minutes.';
        case 'auth/network-request-failed': return 'Connexion internet impossible. Vérifiez votre réseau puis réessayez.';
        case 'auth/operation-not-allowed': return 'La connexion par e-mail/mot de passe n\u2019est pas activée dans Firebase.';
        case 'auth/internal-error':       return 'Erreur interne de Firebase. Réessayez dans quelques instants.';
        default:                         return 'Connexion impossible. Réessayez.';
      }
    }

    auth.setPersistence(firebase.auth.Auth.Persistence.SESSION).catch(function () {});
    afficherEtat('Service de connexion prêt.');

    // Déjà connecté ? On file directement au tableau de bord.
    auth.onAuthStateChanged(function (utilisateur) {
      if (utilisateur) {
        afficherEtat('Session administrateur détectée.');
        window.location.href = 'dashboard.html';
      } else {
        afficherEtat('Service de connexion prêt.');
      }
    });

    formulaire.addEventListener('submit', function (evenement) {
      evenement.preventDefault();
      zoneErreur.hidden = true;
      bouton.disabled = true;

      auth.signInWithEmailAndPassword(champEmail.value.trim(), champMotDePasse.value)
        .then(function () {
          window.location.href = 'dashboard.html';
        })
        .catch(function (erreur) {
          zoneErreur.textContent = messageErreur(erreur.code);
          zoneErreur.hidden = false;
          bouton.disabled = false;
        });
    });

    if (boutonReset) {
      boutonReset.addEventListener('click', function () {
        zoneErreur.hidden = true;
        zoneReset.hidden = true;

        var email = champEmail.value.trim();
        if (!email) {
          zoneErreur.textContent = 'Entrez d\u2019abord votre e-mail administrateur ci-dessus, puis cliquez à nouveau ici.';
          zoneErreur.hidden = false;
          champEmail.focus();
          return;
        }

        boutonReset.disabled = true;
        auth.sendPasswordResetEmail(email)
          .then(function () {
            zoneReset.className = 'message succes';
            zoneReset.textContent = 'Un e-mail de réinitialisation a été envoyé à ' + email + '. Vérifiez votre boîte de réception (et les spams).';
            zoneReset.hidden = false;
          })
          .catch(function (erreur) {
            zoneErreur.textContent = messageErreur(erreur.code);
            zoneErreur.hidden = false;
          })
          .then(function () { boutonReset.disabled = false; });
      });
    }
  }

  /* ===================================================
     Tableau de bord admin (dashboard.html)
     =================================================== */

  function initDashboard() {
    var principal = document.getElementById('dashboard-main');
    if (!principal) return;

    function allerALaConnexion() {
      window.location.href = 'login.html';
    }

    var zoneMessage = document.getElementById('admin-message');
    var minuteurMessage = null;

    function afficherMessage(texte, estErreur) {
      if (!zoneMessage) return;
      zoneMessage.textContent = texte;
      zoneMessage.className = 'admin-message' + (estErreur ? ' error' : '');
      zoneMessage.hidden = false;
      clearTimeout(minuteurMessage);
      if (!estErreur) {
        minuteurMessage = setTimeout(function () { zoneMessage.hidden = true; }, 4000);
      }
    }

    function traiterErreur(e) {
      afficherMessage((e && e.message) || 'Une erreur est survenue.', true);
    }

    function formaterDate(timestamp) {
      if (!timestamp || typeof timestamp.toDate !== 'function') return '';
      var date = timestamp.toDate();
      if (isNaN(date.getTime())) return '';
      return date.toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });
    }

    /* --- Interrupteur de garde --- */

    function initGarde() {
      var interrupteur = document.getElementById('garde-toggle');
      var statut = document.getElementById('garde-status');
      var maj = document.getElementById('garde-maj');
      var refGarde = db.collection('config').doc('garde');

      function afficher(donnees) {
        interrupteur.checked = !!(donnees && donnees.active);
        statut.textContent = (donnees && donnees.active) ? 'Pharmacie DE GARDE' : 'Pharmacie pas de garde';
        statut.className = 'switch-status ' + ((donnees && donnees.active) ? 'on' : 'off');
        var date = donnees ? formaterDate(donnees.maj) : '';
        maj.textContent = date ? 'Dernière modification : ' + date : '';
      }

      interrupteur.disabled = true;
      refGarde.get()
        .then(function (doc) {
          afficher(doc.exists ? doc.data() : null);
          interrupteur.disabled = false;
        })
        .catch(traiterErreur);

      interrupteur.addEventListener('change', function () {
        var voulu = interrupteur.checked;
        interrupteur.disabled = true;
        refGarde.set({ active: voulu, maj: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
          .then(function () {
            return refGarde.get();
          })
          .then(function (doc) {
            var donnees = doc.data();
            afficher(donnees);
            afficherMessage(donnees.active
              ? 'Le site affiche maintenant : pharmacie DE GARDE.'
              : 'Le site affiche maintenant : pas de garde aujourd\u2019hui.', false);
          })
          .catch(function (e) {
            interrupteur.checked = !voulu; // on remet l'ancien état
            traiterErreur(e);
          })
          .then(function () { interrupteur.disabled = false; });
      });
    }

    /* --- Liste des produits --- */

    function initListeProduits() {
      var conteneur = document.getElementById('liste-produits');

      function message(texte) {
        conteneur.textContent = '';
        var p = document.createElement('p');
        p.className = 'empty-state';
        p.textContent = texte;
        conteneur.appendChild(p);
      }

      function ligne(produit) {
        var rang = document.createElement('div');
        rang.className = 'product-row';

        var nom = document.createElement('span');
        nom.className = 'p-name';
        nom.textContent = produit.nom || '';
        rang.appendChild(nom);

        var prix = document.createElement('span');
        prix.className = 'p-price';
        prix.textContent = formaterPrix(produit.prix);
        rang.appendChild(prix);

        var categorie = document.createElement('span');
        categorie.className = 'p-category';
        categorie.textContent = produit.categorie || 'Sans catégorie';
        rang.appendChild(categorie);

        var stockZone = document.createElement('span');
        stockZone.className = 'stock-control-admin';

        var stockSwitch = document.createElement('label');
        stockSwitch.className = 'switch switch-small';
        stockSwitch.title = 'Modifier la disponibilité du produit';

        var stockInput = document.createElement('input');
        stockInput.type = 'checkbox';
        stockInput.checked = produit.disponible !== false;
        stockInput.setAttribute('aria-label', 'Disponibilité de ' + (produit.nom || 'ce produit'));

        var stockTrack = document.createElement('span');
        stockTrack.className = 'switch-track';

        var stockLabel = document.createElement('span');
        stockLabel.className = 'stock-admin-label ' + (stockInput.checked ? 'is-on' : 'is-off');
        stockLabel.textContent = stockInput.checked ? 'Disponible' : 'Rupture';

        stockSwitch.appendChild(stockInput);
        stockSwitch.appendChild(stockTrack);
        stockZone.appendChild(stockSwitch);
        stockZone.appendChild(stockLabel);
        rang.appendChild(stockZone);

        stockInput.addEventListener('change', function () {
          var nouveauStatut = stockInput.checked;
          stockInput.disabled = true;

          db.collection('produits').doc(produit.id).update({
            disponible: nouveauStatut
          }).then(function () {
            produit.disponible = nouveauStatut;
            stockLabel.textContent = nouveauStatut ? 'Disponible' : 'Rupture';
            stockLabel.className = 'stock-admin-label ' + (nouveauStatut ? 'is-on' : 'is-off');
            afficherMessage(
              nouveauStatut
                ? '« ' + produit.nom + ' » est maintenant disponible.'
                : '« ' + produit.nom + ' » est maintenant en rupture de stock.',
              false
            );
          }).catch(function (e) {
            stockInput.checked = !nouveauStatut;
            traiterErreur(e);
          }).then(function () {
            stockInput.disabled = false;
          });
        });

        var supprimer = document.createElement('button');
        supprimer.type = 'button';
        supprimer.className = 'btn-delete';
        supprimer.textContent = 'Supprimer';
        supprimer.addEventListener('click', function () {
          if (!window.confirm('Supprimer « ' + produit.nom + ' » ?')) return;
          supprimer.disabled = true;
          db.collection('produits').doc(produit.id).delete()
            .then(function () {
              afficherMessage('Produit supprimé.', false);
              rafraichir();
            })
            .catch(function (e) {
              supprimer.disabled = false;
              traiterErreur(e);
            });
        });
        rang.appendChild(supprimer);

        return rang;
      }

      function rafraichir() {
        return db.collection('produits').get()
          .then(function (snapshot) {
            if (snapshot.empty) {
              message('Aucun produit ajouté pour l\u2019instant.');
              return;
            }

            var produits = snapshot.docs.map(function (doc) {
              var produit = doc.data() || {};
              produit.id = doc.id;
              return produit;
            });

            produits.sort(function (a, b) {
              var ta = a.creeLe && typeof a.creeLe.toMillis === 'function' ? a.creeLe.toMillis() : 0;
              var tb = b.creeLe && typeof b.creeLe.toMillis === 'function' ? b.creeLe.toMillis() : 0;
              return tb - ta;
            });

            conteneur.textContent = '';
            produits.forEach(function (produit) {
              conteneur.appendChild(ligne(produit));
            });
          })
          .catch(function (e) {
            message('Impossible de charger la liste des produits.');
            traiterErreur(e);
          });
      }

      rafraichir();
      return rafraichir;
    }

    /* --- Ajout d'un produit --- */

    function initFormulaireProduit(rafraichirListe) {
      var formulaire = document.getElementById('produit-form');
      var champDescription = document.getElementById('produit-description');
      var champStock = document.getElementById('produit-stock');
      var labelStock = document.getElementById('produit-stock-label');
      var bouton = formulaire.querySelector('button[type="submit"]');
      labelStock.textContent = champStock.checked ? 'Disponible' : 'Rupture de stock';
      labelStock.className = 'stock-admin-label ' + (champStock.checked ? 'is-on' : 'is-off');

      champStock.addEventListener('change', function () {
        labelStock.textContent = champStock.checked ? 'Disponible' : 'Rupture de stock';
        labelStock.className = 'stock-admin-label ' + (champStock.checked ? 'is-on' : 'is-off');
      });

      formulaire.addEventListener('submit', function (evenement) {
        evenement.preventDefault();

        var nom = document.getElementById('produit-nom').value.trim();
        var prix = document.getElementById('produit-prix').value.trim();
        var categorie = document.getElementById('produit-categorie').value.trim();
        var description = champDescription.value.trim();
        var disponible = champStock.checked;
        if (!nom || !prix || !categorie) return;
        bouton.disabled = true;

        db.collection('produits').add({
          nom: nom,
          prix: Number(prix),
          categorie: categorie,
          description: description,
          disponible: disponible,
          creeLe: firebase.firestore.FieldValue.serverTimestamp()
        })
          .then(function () {
            formulaire.reset();
            champStock.checked = true;
            labelStock.textContent = 'Disponible';
            labelStock.className = 'stock-admin-label is-on';
            afficherMessage('Produit ajouté : il est visible sur la page Produits.', false);
            return rafraichirListe();
          })
          .catch(traiterErreur)
          .then(function () { bouton.disabled = false; });
      });
    }

    /* --- Démarrage du tableau de bord --- */

    var etat = document.getElementById('etat-session');

    var boutonDeconnexion = document.getElementById('logout-btn');
    if (boutonDeconnexion) {
      boutonDeconnexion.addEventListener('click', function () {
        auth.signOut().then(allerALaConnexion).catch(allerALaConnexion);
      });
    }

    // Le contenu reste caché tant que Firebase n'a pas confirmé la session.
    auth.onAuthStateChanged(function (utilisateur) {
      if (!utilisateur) {
        allerALaConnexion();
        return;
      }
      if (etat) etat.hidden = true;
      principal.hidden = false;
      initGarde();
      var rafraichirListe = initListeProduits();
      initFormulaireProduit(rafraichirListe);
    });
  }

  /* ===================================================
     Démarrage : chaque fonction se désactive elle-même
     si la page ne contient pas les éléments nécessaires.
     =================================================== */

  document.addEventListener('DOMContentLoaded', function () {
    initMenu();
    initGardeEtStatut();
    initDiaporama();
    initHorairesAujourdhui();
    initCarrouselVideo();
    initProduits();
    initLogin();
    initDashboard();
  });
})();
