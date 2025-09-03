# Node.js CRUD Backend mit MS SQL Server

## Beschreibung

Dieses Projekt ist ein serverseitiges Backend, das mit Node.js und dem Express.js-Framework entwickelt wurde. Es stellt eine API zur Verfügung, um grundlegende CRUD-Operationen (Create, Read, Update, Delete) für eine Microsoft SQL Server-Datenbank durchzuführen.

Dieses Projekt dient als Vorlage für den schnellen Aufbau einer robusten API, die mit einer MS SQL-Datenbank kommuniziert.

## Hauptmerkmale

-   RESTful API für CRUD-Operationen
-   Entwickelt mit Node.js und Express.js
-   Anbindung an eine Microsoft SQL Server-Datenbank
-   Verwaltung von Umgebungsvariablen mit `.env`
-   Automatischer Neustart des Servers im Entwicklungsmodus mit `nodemon`

## Voraussetzungen

Stellen Sie sicher, dass die folgenden Anwendungen auf Ihrem System installiert sind:

-   [Node.js](https://nodejs.org/) (Version 16.x oder höher empfohlen)
-   [npm](https://www.npmjs.com/) (wird mit Node.js geliefert)
-   Eine laufende Instanz von [Microsoft SQL Server](https://www.microsoft.com/de-de/sql-server/sql-server-downloads)

 

## Projektstruktur

```
/
├── src/
│   ├── controllers/  # Beinhaltet die Logik zur Verarbeitung von Anfragen
│   ├── routes/       # Definiert die API-Routen
│   ├── app.js        # Express-Anwendung Konfiguration
│   ├── db.js         # Datenbankverbindung
│   └── server.js     # Startpunkt des Servers
├── .env              # (Lokal) Umgebungsvariablen
├── .gitignore        # Dateien, die von Git ignoriert werden sollen
└── package.json      # Projekt-Metadaten und Abhängigkeiten
```
