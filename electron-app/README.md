# ISW Offering Assistant - Desktop App

Kompletna desktop aplikacija za upravljanje ponudama, klijentima, proizvodima i prodajom.

## Funkcionalnosti

### 🔐 Autentifikacija i korisnici
- Sigurna prijava sa JWT tokenima
- Role-based access (Admin/User)
- Upravljanje korisnicima (samo admin)
- Reset lozinke

### 👥 Upravljanje klijentima
- CRUD operacije za klijente
- Pretraga i filtriranje
- Aktivacija/deaktivacija klijenata
- Detaljne informacije o klijentima

### 📦 Upravljanje proizvodima
- Kreiranje i uređivanje proizvoda
- Grupe proizvoda
- Cene i opisi
- Pretraga po šifri/nazivu

### 💼 Ponude
- Kreiranje ponuda sa stavkama
- PDF generisanje ponuda
- Revizije ponuda
- Status tracking (draft, sent, accepted, rejected)
- Lock/unlock funkcionalnost

### 💰 Prodaje
- Kreiranje prodaja iz ponuda
- Praćenje statusa prodaje
- Fakturisanje
- Izveštaji i statistike

### 📄 Dolazni dokumenti
- Upload i kategorisanje dokumenata
- Različiti tipovi (fakture, ugovori, reklamacije)
- Status tracking
- File management

### 🏢 Podešavanja kompanije
- Osnovne informacije kompanije
- Logo upload
- Backup/restore baze podataka
- Export podataka

## Tehnologije

- **Frontend**: ElectronJS, HTML5, CSS3, JavaScript ES6+
- **Backend**: Node.js, Express.js (mora biti pokrenut zasebno)
- **Baza podataka**: MariaDB
- **Autentifikacija**: JWT tokeni
- **PDF generisanje**: Puppeteer
- **File upload**: Multer

## Instalacija i pokretanje

### Sistemski zahtevi
- Windows 10 ili noviji (x64)
- Minimum 4GB RAM
- 500MB slobodnog prostora

### Priprema
1. Backend API mora biti pokrenut na `http://localhost:3000`
2. MariaDB baza podataka mora biti konfigurisana

### Development
```bash
# Instaliraj dependencies
npm install

# Pokreni u development modu
npm run dev
```

### Production Build
```bash
# Windows installer
npm run build-win

# Portable verzija
npm run build-win-portable
```

## Struktura aplikacije

```
src/
├── main.js              # Electron main process
├── preload.js           # Preload script za bezbednu komunikaciju
├── index.html           # Glavna HTML stranica
├── css/
│   └── style.css        # Stilovi aplikacije
└── js/
    ├── app.js           # Glavna aplikacijska logika
    ├── auth.js          # Autentifikacija
    ├── dashboard.js     # Dashboard i statistike
    ├── clients.js       # Upravljanje klijentima
    ├── products.js      # Upravljanje proizvodima
    ├── offers.js        # Upravljanje ponudama
    ├── sales.js         # Upravljanje prodajama
    ├── incoming-documents.js  # Dolazni dokumenti
    ├── users.js         # Upravljanje korisnicima
    └── company.js       # Podešavanja kompanije
```

## API komunikacija

Aplikacija komunicira sa backend API-jem preko axios biblioteke kroz preload script koji obezbeđuje bezbednu komunikaciju između renderer i main procesa.

### API endpoints
- `/api/auth/*` - Autentifikacija
- `/api/users/*` - Korisnici
- `/api/clients/*` - Klijenti
- `/api/products/*` - Proizvodi
- `/api/offers/*` - Ponude
- `/api/sales/*` - Prodaje
- `/api/incoming-documents/*` - Dokumenti
- `/api/company/*` - Kompanija

## Bezbednost

- Sve API komunikacije koriste JWT tokene
- Input validacija na frontend i backend
- Secure preload script
- Role-based access control
- File upload restrictions

## Licenca

MIT License

## Podrška

Za tehničku podršku kontaktirajte: info@isw.rs
