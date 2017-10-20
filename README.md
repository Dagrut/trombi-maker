# trombi-maker

Cet outil permet de générer un trombinoscope pour le Conservatoire à Rayonnement
Régional de la Réunion. Il devrait être facilement modifiable pour une autre
utilisation.

## Pré-requis

Cette commande requiert l'installation de libreoffice, ainsi que son
accessibilité via le `$PATH`.

Cette commande ne peut être utilisée que sur linux, de part l'utilisation
extensive de commandes shell (et principalement bash : `set`, `touch`, `zip` et `unzip`, `rm`, `cd`, `for`).

## Utilisation

```js
npm install
node index.js <fichier_csv> <dossier_photos>
```

Cette commande génèrera deux fichiers `trombinoscope.odt` et `trombinoscope.pdf`
dans le répertoire courant. Le dossier csv fourni en exemple présente un exemple
de la structure à suivre pour les données.

Le paramètre `dossier_photos` doit être le chemin d'accès au dossier contenant
toutes les photos du trombinoscope. Si une photo manque, un cadre vide
s'affichera (variable suivant le fonctionnement de libreoffice).
