# ISW Offering Assistant - Kompletna Desktop Aplikacija

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Status](https://img.shields.io/badge/status-Production%20Ready-brightgreen.svg)

**Napredna desktop aplikacija za upravljanje ponudama, klijentima, proizvodima i prodajom.**

## 🚀 Ključne funkcionalnosti

### 💼 Kompletno poslovno rešenje
- **Upravljanje klijentima** - CRUD operacije, pretraga, aktivacija
- **Katalog proizvoda** - Proizvodi sa grupama, cene, opisi
- **Kreiranje ponuda** - Profesionalne ponude sa PDF eksportom
- **Praćenje prodaja** - Od ponude do fakture
- **Dolazni dokumenti** - Centralizovano upravljanje dokumentima
- **Izveštaji i statistike** - Detaljni business insights

### 🔐 Napredna bezbednost
- JWT autentifikacija
- Role-based access control (Admin/User)
- Secure API komunikacija
- Input validacija i sanitizacija

### 📊 Profesionalni izveštaji
- PDF generisanje ponuda sa logo-om kompanije
- Fakturisanje direktno iz prodaja
- Export podataka u različitim formatima
- Backup i restore funkcionalnosti

## 🏗️ Arhitektura

### Backend API (Node.js)
```
server-api/
├── src/
│   ├── controllers/      # API kontroleri
│   ├── middleware/       # Middleware funkcije
│   ├── routes/          # API rute
│   ├── config/          # Konfiguracija
│   └── scripts/         # Database skripte
└── uploads/             # Upload direktorijum
```

### Desktop App (ElectronJS)
```
electron-app/
├── src/
│   ├── main.js          # Electron main process
│   ├── preload.js       # Secure preload script
│   ├── index.html       # Glavna stranica
│   ├── css/             # Stilovi
│   └── js/              # Frontend logika
└── assets/              # Resursi i ikone
```

## 🛠️ Tehnologije

| Komponenta | Tehnologija | Verzija |
|------------|-------------|---------|
| **Backend** | Node.js + Express | ^20.0.0 |
| **Frontend** | ElectronJS | ^31.0.0 |
| **Baza podataka** | MariaDB | ^10.11 |
| **Autentifikacija** | JWT | ^9.0.2 |
| **PDF generisanje** | Puppeteer | ^22.0.0 |
| **File upload** | Multer | ^1.4.5 |
| **Validacija** | Joi | ^17.11.0 |

## 📦 Brza instalacija

### 1. Preuzmi repository
```bash
git clone https://github.com/ivicastasuk/isw_offering_assistant.git
cd isw_offering_assistant
```

### 2. Backend setup
```bash
cd server-api
npm install
cp .env.example .env
# Konfiguriši .env fajl
npm run init-database
npm start
```

### 3. Desktop aplikacija
```bash
cd ../electron-app
npm install
npm run dev
```

### 4. Production build
```bash
# Windows installer
npm run build-win

# Portable verzija  
npm run build-win-portable
```

## 🔧 Konfiguracija

### Database Setup (MariaDB)
```sql
CREATE DATABASE isw_offering_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'isw_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON isw_offering_db.* TO 'isw_user'@'localhost';
FLUSH PRIVILEGES;
```

### Environment Variables
```env
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_USER=isw_user
DB_PASSWORD=your_password
DB_NAME=isw_offering_db
JWT_SECRET=your_secret_here
```

## 👥 Default korisnici

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Administrator |
| user | user123 | Korisnik |

## 📋 Sistemski zahtevi

### Minimum
- **OS**: Windows 10 (64-bit)
- **RAM**: 4GB
- **Disk**: 500MB slobodnog prostora
- **Network**: Internet konekcija za API komunikaciju

### Preporučeno
- **OS**: Windows 11 (64-bit)
- **RAM**: 8GB+
- **Disk**: 1GB+ SSD
- **Network**: Stabilna LAN konekcija

## 🚀 Quick Start

1. **Pokreni backend**:
   ```bash
   cd server-api && npm start
   ```

2. **Pokreni desktop app**:
   ```bash
   cd electron-app && npm run dev
   ```

3. **Login**: admin / admin123

4. **Kreiraj prvi klijent** i započni sa radom!

## 📚 Dokumentacija

- [📖 BUILD.md](electron-app/BUILD.md) - Build instrukcije
- [🚀 DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- [🧪 TESTING.md](TESTING.md) - Testing protokol
- [📋 API Documentation](server-api/README.md) - Backend API

## 🔄 Development Workflow

### Database Development
```bash
# Reset database
npm run reset-database

# Add test data
npm run seed-database
```

### Frontend Development
```bash
# Hot reload development
npm run dev

# Production build test
npm run build
```

## 📊 Projekat statistike

- **📁 Ukupno fajlova**: 49
- **📂 Direktorijuma**: 14
- **⚡ API endpoints**: 40+
- **🎨 Frontend modula**: 8
- **🗃️ Database tabela**: 8

## 🤝 Doprinos

1. Fork repository
2. Kreiraj feature branch (`git checkout -b feature/nova-funkcionalnost`)
3. Commit izmene (`git commit -am 'Dodaj novu funkcionalnost'`)
4. Push na branch (`git push origin feature/nova-funkcionalnost`)
5. Kreiraj Pull Request

## 📝 Licenca

Ovaj projekat je licenciran pod [MIT License](LICENSE).

## 📞 Podrška

- **Email**: info@isw.rs
- **Issues**: [GitHub Issues](https://github.com/ivicastasuk/isw_offering_assistant/issues)
- **Dokumentacija**: [Wiki](https://github.com/ivicastasuk/isw_offering_assistant/wiki)

## 🏆 Features Roadmap

### ✅ v1.0.0 (Current)
- Kompletna CRUD funkcionalnost
- PDF generisanje
- Autentifikacija i bezbednost
- Desktop aplikacija

### 🔄 v1.1.0 (Planned)
- Email integracija
- Advanced reporting
- Mobile responsive web verzija
- REST API dokumentacija

### 🚀 v2.0.0 (Future)
- Cloud deployment
- Multi-tenant support
- Advanced analytics
- Mobile aplikacija

---

**Developed with ❤️ by ISW Software Team**

*Kompletno poslovni software za upravljanje ponudama i prodajom.*
