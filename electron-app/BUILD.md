# Build Instructions

## Priprema za build

1. Instaliraj Node.js dependencies:
```bash
cd electron-app
npm install
```

2. Proveri da li je backend API pokrenut:
```bash
cd server-api
npm start
```

## Development

Za pokretanje u development modu:
```bash
npm run dev
```

## Production Build

### Windows NSIS Installer
```bash
npm run build-win
```
Kreira installer fajl u `dist/` direktorijumu.

### Windows Portable
```bash
npm run build-win-portable
```
Kreira portable verziju aplikacije.

### Svi targeti
```bash
npm run build
```

## Fajlovi nakon build-a

- `dist/ISW Offering Assistant Setup 1.0.0.exe` - Installer
- `dist/ISW Offering Assistant-1.0.0-portable.exe` - Portable verzija

## Troubleshooting

### Electron rebuild greške
```bash
npm run postinstall
```

### Cache problemi
```bash
npx electron-builder --config.directories.buildResources=build --config.directories.output=dist
```

### Ikone problemi
Osiguraj se da postoje sledeći fajlovi:
- `assets/icons/icon.ico` (256x256)
- `assets/icons/installer-banner.bmp` (164x314)
- `assets/icons/installer-header.bmp` (150x57)

## Sistemski zahtevi

- Windows 10 ili noviji (x64)
- Minimum 4GB RAM
- 500MB slobodnog prostora na disku
- Node.js backend API mora biti pokrenut na localhost:3000
