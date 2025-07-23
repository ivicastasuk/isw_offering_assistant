# Deployment Guide - ISW Offering Assistant

## Pre-deployment checklist

### 1. Backend API priprema
- [ ] Backend API je testiran i funkcionalan
- [ ] MariaDB baza je kreirana sa init skriptom
- [ ] Environment varijable su konfigurisane
- [ ] API je pokrenut na production serveru

### 2. Frontend aplikacija
- [ ] Svi moduli su testirani
- [ ] API endpoints su validni
- [ ] Ikone su kreirane
- [ ] Build konfiguracija je gotova

### 3. Baza podataka
- [ ] MariaDB je instaliran
- [ ] Database user je kreiran
- [ ] Init skripta je pokrenuta
- [ ] Test podaci su učitani

## Deployment steps

### 1. Server setup (Backend)

```bash
# Clone repository
git clone https://github.com/ivicastasuk/isw_offering_assistant.git
cd isw_offering_assistant/server-api

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env file with production settings

# Setup database
npm run init-database

# Start production server
npm start
```

### 2. Desktop aplikacija build

```bash
cd electron-app

# Install dependencies
npm install

# Build for Windows
npm run build-win

# Build portable version
npm run build-win-portable
```

### 3. Distribution

Build će kreirati sledeće fajlove u `dist/` direktorijumu:
- `ISW Offering Assistant Setup 1.0.0.exe` - Installer
- `ISW Offering Assistant-1.0.0-portable.exe` - Portable verzija

## Production configuration

### Backend (.env)
```env
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_USER=isw_offering_user
DB_PASSWORD=secure_password
DB_NAME=isw_offering_db
JWT_SECRET=your_jwt_secret_here
UPLOAD_PATH=./uploads
PDF_OUTPUT_PATH=./pdf_output
```

### MariaDB setup
```sql
CREATE DATABASE isw_offering_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'isw_offering_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON isw_offering_db.* TO 'isw_offering_user'@'localhost';
FLUSH PRIVILEGES;
```

## Installation guide za end-users

### System requirements
- Windows 10 ili noviji (64-bit)
- 4GB RAM (minimum)
- 500MB disk space
- Internet connection (za backend komunikaciju)

### Installation steps
1. Download `ISW Offering Assistant Setup 1.0.0.exe`
2. Run installer as Administrator
3. Follow installation wizard
4. Launch application from Start Menu or Desktop shortcut

### Portable version
1. Download `ISW Offering Assistant-1.0.0-portable.exe`
2. Run directly from any location
3. No installation required

## Troubleshooting

### Common issues

#### "Cannot connect to server"
- Check if backend API is running on localhost:3000
- Verify firewall settings
- Check network connectivity

#### "Database connection error"
- Verify MariaDB is running
- Check database credentials
- Ensure database exists and is accessible

#### "Login failed"
- Default admin credentials: admin/admin123
- Check if users table is populated
- Verify JWT secret configuration

### Logs
- Application logs: `%APPDATA%/isw-offering-assistant/logs/`
- Backend logs: Check console output or log files

## Updates

### Backend updates
```bash
cd server-api
git pull origin main
npm install
npm restart
```

### Desktop app updates
- Build new version with incremented version number
- Distribute new installer to users
- Users can install over existing version

## Backup and restore

### Database backup
```bash
mysqldump -u isw_offering_user -p isw_offering_db > backup_$(date +%Y%m%d).sql
```

### Database restore
```bash
mysql -u isw_offering_user -p isw_offering_db < backup_YYYYMMDD.sql
```

### Application data backup
- Uploaded files: `server-api/uploads/`
- Generated PDFs: `server-api/pdf_output/`
- Configuration: `server-api/.env`

## Monitoring

### Health checks
- Backend API: `GET /api/health`
- Database: Connection status in application
- File system: Upload/download functionality

### Performance monitoring
- Monitor API response times
- Database query performance
- File upload/download speeds
- Memory usage

## Security considerations

### Production security
- Change default admin password
- Use strong JWT secret
- Enable HTTPS for API
- Regular security updates
- Database backup encryption
- File upload restrictions
- Input validation
- Rate limiting

### User management
- Regular password updates
- Role-based access control
- Session timeout
- Account lockout policies
