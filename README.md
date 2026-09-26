# Pharmacie de la Mairie de Yopougon

Site vitrine et espace d'administration de la Pharmacie de la Mairie, située à Yopougon Selmer.

## Fonctionnalites ajoutees

### Site public

- Page d'accueil avec hero, horaires, services et videos.
- Boutons « Nous contacter » et « Voir l'itineraire » adaptes aux petits ecrans.
- Images des cartes uniformisees avec un ratio 4:3 et `object-fit: cover`.
- Carrousel video avec controles natifs et bouton permettant d'activer ou de couper le son.
- Chargeur global avec logo de la pharmacie et animation de capsule medicale.
- Page `404.html` personnalisee avec retour a l'accueil et acces au contact.
- Design responsive pour mobile, tablette et ordinateur.
- Effets de survol sur les boutons, contenus dans les limites de chaque bouton.

### Connexion et administration

- Connexion administrateur avec Firebase Authentication.
- Session Firebase conservee uniquement pendant la session du navigateur.
- Messages d'authentification generiques pour ne pas reveler l'existence d'un compte.
- Page de connexion simplifiee avec champs et boutons arrondis.
- Tableau de bord pour :
  - activer ou desactiver le statut de garde ;
  - ajouter un produit ;
  - modifier le nom, le prix, la categorie, la description et le stock ;
  - supprimer un produit ;
  - changer le mot de passe avec reauthentification Firebase.
- Page `modifier-produit.html` dediee a la modification des produits.
- Barre d'administration avec titre centre et boutons compacts : Accueil, Mot de passe et Se deconnecter.

## Securite

- Les donnees Firestore sont protegees par `firestore.rules`.
- La lecture publique est limitee au catalogue et au statut de garde.
- Les ecritures exigent un compte Firebase authentifie avec le custom claim `admin: true`.
- Les champs, types, categories, longueurs et prix des produits sont valides par Firestore.
- Les collections inconnues sont fermees par defaut.
- Les objets Firebase ne sont pas exposes sur `window`.
- Les erreurs backend detaillees ne sont pas affichees aux utilisateurs.
- `.htaccess` ajoute des en-tetes HTTP de protection et declare la page 404.

## Configuration Firebase

1. Activer Email/Mot de passe dans Firebase Authentication.
2. Creer le compte administrateur.
3. Attribuer le custom claim `admin: true` avec Firebase Admin SDK ou une fonction serveur de confiance.
4. Deployer les regles :

```bash
firebase deploy --only firestore:rules
```

Ne jamais attribuer le custom claim depuis le navigateur.

La cle `apiKey` presente dans le JavaScript est une cle web Firebase, pas un mot de passe serveur. Elle doit toutefois etre restreinte aux domaines autorises dans Google Cloud Console.

## Fichiers principaux

- `index.html` : page d'accueil.
- `style.css` : styles communs et responsive.
- `script.js` : navigation, Firebase, videos, catalogue et administration.
- `chargement.js` : chargeur global.
- `dashboard.html` : tableau de bord administrateur.
- `modifier-produit.html` : modification d'un produit.
- `login.html` : connexion administrateur.
- `404.html` : page d'erreur personnalisee.
- `firestore.rules` : regles de securite Firestore.
- `firebase.json` : configuration de deploiement Firebase.
- `.htaccess` : en-tetes HTTP et gestion Apache de la page 404.

## Lancement local

Le site est compose de fichiers statiques et peut etre servi par Apache, EasyPHP ou un autre serveur HTTP local. Ouvrir `index.html` directement fonctionne pour les pages statiques, mais Firebase Authentication et Firestore necessitent un domaine autorise et un serveur HTTP.

## Publication Git

Le projet a ete initialise avec une branche `main` et un commit initial. Pour publier les dernieres modifications sur le depot distant configure :

```bash
git add -A
git commit -m "Mise a jour du site"
git push origin main
```
