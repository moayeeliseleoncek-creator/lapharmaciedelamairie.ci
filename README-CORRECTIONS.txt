CORRECTIONS — PHARMACIE DE LA MAIRIE DE YOPOUGON

1. CONNEXION ADMINISTRATION
La version actuelle de login.html utilise Firebase Authentication directement. Elle n'utilise pas une route /api/login.
La connexion a été renforcée avec :
- persistance locale de la session Firebase ;
- messages d'erreur plus précis ;
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

Fichiers modifiés :
- login.html
- dashboard.html
- produits.html
- style.css
