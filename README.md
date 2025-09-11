# LEBO Fullstack Application

## Beschreibung

LEBO ist eine moderne Fullstack-Anwendung für die Verwaltung von Merkmalstexten. Das System besteht aus einem Node.js/Express.js Backend mit Microsoft SQL Server und einem Next.js Frontend mit React. Die Anwendung bietet umfassende CRUD-Operationen, Pagination, Suchfunktionalitäten und ein ansprechendes UI-Design.

## Hauptmerkmale

### Backend Features
-   **RESTful API** für vollständige CRUD-Operationen
-   **Microsoft SQL Server Integration** mit Connection Pooling
-   **Umfassende Pagination** mit flexiblen Parametern
-   **Position Management** mit automatischem Shifting
-   **Transaction Support** für Datenintegrität
-   **Comprehensive Debug Logging** für Entwicklung
-   **Input Validation** und Error Handling
-   **Security Features** (Helmet, CORS)
-   **Health Check Monitoring** für Datenbankverbindung

### Frontend Features  
-   **Modern Next.js 15** mit React
-   **Responsive Design** mit Pastel Colors und Dark Mode
-   **Search Functionality** mit Filter-Optionen
-   **Data Grid** mit Sorting und Pagination
-   **Form Handling** für CRUD-Operationen
-   **Real-time Updates** und Optimistic UI

## Technologie-Stack

### Backend
- **Node.js** (v16.x oder höher)
- **Express.js** (v5.1.0) - Web Framework
- **MS SQL Server** - Datenbank
- **mssql** (v11.0.1) - SQL Server Client
- **dotenv** - Environment Variables
- **helmet** - Security Middleware
- **cors** - Cross-Origin Resource Sharing
- **nodemon** - Development Server

### Frontend  
- **Next.js 15.5.3** - React Framework
- **React** - UI Library
- **Modern CSS** - Styling mit Pastel Theme
- **Responsive Design** - Mobile-First Approach

## Voraussetzungen

-   [Node.js](https://nodejs.org/) (Version 16.x oder höher)
-   [npm](https://www.npmjs.com/) (wird mit Node.js geliefert)
-   [Microsoft SQL Server](https://www.microsoft.com/de-de/sql-server/sql-server-downloads)
-   SQL Server Management Studio (empfohlen)

## Schnellstart

### 1. Repository klonen
```bash
git clone https://github.com/CodeDebugRun/LeboBE.git
cd LEBO_BACKEND
```

### 2. Dependencies installieren
```bash
npm run install-all
```

### 3. Environment Variables konfigurieren
Erstellen Sie eine `.env` Datei im `/server` Verzeichnis:
```env
DB_HOST=localhost
DB_PORT=1433
DB_NAME=LebodoorsDB
DB_USER=LeboUser01
DB_PASSWORD=your_password
PORT=3001
```

### 4. Anwendung starten
```bash
npm start
```

Die Anwendung läuft dann auf:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001

## Projektstruktur

```
LEBO_BACKEND/
├── client2/                    # Next.js Frontend
│   ├── pages/                  # Next.js Pages
│   ├── components/             # React Components
│   ├── styles/                 # CSS Styles
│   └── package.json
├── server/                     # Express.js Backend
│   ├── src/
│   │   ├── controllers/        # Request Handler
│   │   ├── routes/            # API Routes
│   │   ├── utils/             # Utility Functions
│   │   ├── middleware/        # Express Middleware
│   │   ├── config/            # Configuration Files
│   │   ├── app.js             # Express App Setup
│   │   ├── db.js              # Database Connection
│   │   └── server.js          # Server Entry Point
│   ├── .env                   # Environment Variables
│   └── package.json
├── package.json               # Root Package File
└── README.md
```

## API Endpoints

### Merkmalstexte API

| Method | Endpoint | Beschreibung |
|--------|----------|--------------|
| GET    | `/api/merkmalstexte` | Alle Datensätze mit Pagination abrufen |
| GET    | `/api/merkmalstexte/:id` | Einzelnen Datensatz nach ID abrufen |
| GET    | `/api/merkmalstexte/filter` | Gefilterte Ergebnisse abrufen |
| POST   | `/api/merkmalstexte` | Neuen Datensatz erstellen |
| PUT    | `/api/merkmalstexte/:id` | Datensatz vollständig aktualisieren |
| PATCH  | `/api/merkmalstexte/:id` | Datensatz teilweise aktualisieren |
| DELETE | `/api/merkmalstexte/:id` | Datensatz löschen |
| POST   | `/api/merkmalstexte/bulk-position` | Bulk Position Update |

### Query Parameter für GET `/api/merkmalstexte`
- `page` - Seitennummer (Standard: 1)
- `limit` - Anzahl Datensätze pro Seite (Standard: 50, Max: 1000)
- `quickSearch` - Schnellsuche über alle Felder
- `identnr` - Filter nach Identnummer
- `merkmal` - Filter nach Merkmal
- `auspraegung` - Filter nach Ausprägung

### Beispiel Response
```json
{
  "success": true,
  "timestamp": "2025-09-11T12:41:50.386Z",
  "data": {
    "data": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 4063,
      "totalCount": 203139,
      "pageSize": 50,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  },
  "message": "Seite 1 von 4063 erfolgreich abgerufen"
}
```

## Development

### Debug Logging
Das Backend enthält umfassendes Debug-Logging für die Entwicklung:
```bash
# Beispiel Debug Output
🔍 [DEBUG] getAllMerkmalstexte function started
📥 [DEBUG] Request query parameters: { page: '1', limit: '50' }
📊 [DEBUG] Connecting to database pool...
✅ [DEBUG] Database pool connection successful
```

### Scripts
- `npm start` - Startet Frontend und Backend parallel
- `npm run server` - Startet nur das Backend
- `npm run client` - Startet nur das Frontend
- `npm run install-all` - Installiert alle Dependencies
- `npm run build` - Build für Production

### Database Schema
Die Anwendung verwendet die Tabelle `merkmalstexte` mit folgenden Spalten:
- `id` (INT, PRIMARY KEY, IDENTITY)
- `identnr` (VARCHAR) - Identifikationsnummer
- `merkmal` (VARCHAR) - Merkmal
- `auspraegung` (VARCHAR) - Ausprägung
- `drucktext` (VARCHAR) - Drucktext
- `sondermerkmal` (VARCHAR) - Sondermerkmal
- `merkmalsposition` (INT) - Position
- `maka` (INT) - Sonder Abteilung
- `fertigungsliste` (VARCHAR) - Fertigungsliste

## Deployment

### Production Build
```bash
npm run build
```

### Environment Variables für Production
```env
NODE_ENV=production
DB_HOST=your_production_server
DB_PORT=1433
DB_NAME=LebodoorsDB
DB_USER=your_production_user
DB_PASSWORD=your_production_password
PORT=3001
```

## Troubleshooting

### Häufige Probleme
1. **Datenbankverbindung fehlgeschlagen**
   - Prüfen Sie die .env Variablen
   - Stellen Sie sicher, dass SQL Server läuft
   - Überprüfen Sie Firewall-Einstellungen

2. **Port bereits in Verwendung**
   - Ändern Sie den PORT in der .env Datei
   - Oder beenden Sie andere Prozesse auf Port 3001/3000

3. **Dependencies Fehler**
   - Löschen Sie `node_modules` und führen Sie `npm install` aus
   - Überprüfen Sie Node.js Version

## Contributing

1. Fork das Repository
2. Erstellen Sie einen Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Committen Sie Ihre Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffnen Sie eine Pull Request

## Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Siehe `LICENSE` Datei für Details.

## Support

Bei Fragen oder Problemen erstellen Sie bitte ein Issue im GitHub Repository.

---

**Version**: 1.0.0  
**Letzte Aktualisierung**: September 2025  
**Entwickelt von**: LEBO Team