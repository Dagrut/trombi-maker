# trombi-maker

Cet outil permet de générer un trombinoscope pour le Conservatoire à Rayonnement
Régional de la Réunion. Il devrait être facilement modifiable pour une autre
utilisation.

## Pré-requis

Cette commande requiert l'installation de libreoffice, ainsi que son
accessibilité via le `$PATH`.

## Utilisation

```js
npm install
node index.js <fichier_csv> <dossier_photos>
```

Cette commande génèrera deux fichiers "trombinoscope.odt" et "trombinoscope.pdf"
dans le répertoire courant. Le dossier csv fourni en exemple présente un exemple
de la structure à suivre pour les données.
