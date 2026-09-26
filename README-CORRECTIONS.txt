CORRECTIONS — PHARMACIE DE LA MAIRIE DE YOPOUGON

1. CONNEXION ADMINISTRATION
La version actuelle de login.html utilise Firebase Authentication directement. Elle n'utilise pas une route /api/login.
La connexion a été renforcée avec :
- persistance de session uniquement pendant la session du navigateur ;
- messages d'erreur génériques pour éviter de révéler si un compte existe ;
- détection des problèmes réseau ;
- message spécifique si la connexion e-mail/mot de passe n'est pas activée dans Firebase.

IMPORTANT : si le bon e-mail et le bon mot de passe sont encore refusés avec le message « E-mail ou mot de passe incorrect », il faut vérifier dans la console Firebase que :
- le fournisseur « E-mail/Mot de passe » est activé dans Authentication ;
- le compte administrateur existe bien ;
- l'e-mail utilisé est exactement celui du compte Firebase.

2. PRODUITS
Le tableau de bord permet maintenant de renseigner :
- Nom du produit
- Prix
- Catégorie
- Description
- Disponible / Rupture de stock
- Image

La page publique affiche la description et l'état du stock.

3. DESIGN
style.css a reçu une finition visuelle globale : cartes, catalogue, administration, formulaires, footer, ombres, espacements et responsive.

4. STATUT DE GARDE
Le système de statut de garde existant n'a pas été remplacé ni supprimé.

5. REGLES FIRESTORE ET PROTECTION HTTP
- `firestore.rules` autorise la lecture publique du catalogue et du statut de garde.
- Les ajouts, modifications, suppressions et changements du statut de garde exigent un compte Firebase avec le custom claim `admin: true`.
- Les champs et les types des produits sont contrôlés par Firestore, pas seulement par le formulaire du navigateur.
- `firebase.json` permet de déployer ces règles avec `firebase deploy --only firestore:rules`.
- Le fichier `.htaccess` ajoute des en-têtes HTTP de protection quand Apache charge `mod_headers`.

IMPORTANT : avant de redéployer, attribuer le custom claim `admin: true` uniquement au compte administrateur via Firebase Admin SDK ou une fonction serveur de confiance. Ne jamais attribuer ce claim depuis le navigateur. Sans ce claim, la connexion peut réussir mais le tableau de bord ne pourra pas lire ni modifier les données.

La clé `apiKey` visible dans `script.js` n'est pas un mot de passe serveur Firebase. Elle doit néanmoins être restreinte dans Google Cloud Console aux domaines autorisés du site, et les API inutiles doivent être désactivées.

Fichiers modifiés :
- login.html
- dashboard.html
- produits.html
- style.css
- script.js
- firestore.rules
- firebase.json
- .htaccess
