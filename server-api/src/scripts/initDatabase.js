const db = require('../config/database');

const initDatabase = async () => {
  try {
    console.log('Kreiranje baze podataka...');

    // Kreiranje tabele za korisnike
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        role ENUM('admin', 'user') DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Kreiranje tabele za podatke o firmi
    await db.query(`
      CREATE TABLE IF NOT EXISTS company_info (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        logo VARCHAR(255),
        address TEXT,
        pib VARCHAR(20),
        mb VARCHAR(20),
        phones TEXT,
        emails TEXT,
        bank_accounts TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Kreiranje tabele za klijente
    await db.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        company_name VARCHAR(200) NOT NULL,
        address TEXT,
        city VARCHAR(100),
        email VARCHAR(150),
        phone VARCHAR(20),
        mb VARCHAR(20),
        pib VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Kreiranje tabele za grupe proizvoda
    await db.query(`
      CREATE TABLE IF NOT EXISTS product_groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Kreiranje tabele za proizvode
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        image VARCHAR(255),
        manufacturer VARCHAR(150),
        model VARCHAR(100),
        group_id INT,
        price DECIMAL(10,2) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES product_groups(id)
      )
    `);

    // Kreiranje tabele za ponude
    await db.query(`
      CREATE TABLE IF NOT EXISTS offers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        offer_number VARCHAR(50) NOT NULL,
        user_id INT NOT NULL,
        client_id INT NOT NULL,
        status ENUM('draft', 'locked', 'past', 'rejected', 'questionable') DEFAULT 'draft',
        total_amount DECIMAL(12,2) DEFAULT 0,
        total_discount DECIMAL(12,2) DEFAULT 0,
        total_with_tax DECIMAL(12,2) DEFAULT 0,
        tax_rate DECIMAL(5,2) DEFAULT 20.00,
        is_locked BOOLEAN DEFAULT false,
        locked_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (client_id) REFERENCES clients(id),
        UNIQUE KEY unique_user_offer (user_id, offer_number)
      )
    `);

    // Kreiranje tabele za stavke ponude
    await db.query(`
      CREATE TABLE IF NOT EXISTS offer_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        offer_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        discount_percent DECIMAL(5,2) DEFAULT 0,
        line_total DECIMAL(12,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Kreiranje tabele za evidenciju prodaje
    await db.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        offer_id INT NOT NULL,
        sale_date DATE NOT NULL,
        total_amount DECIMAL(12,2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (offer_id) REFERENCES offers(id)
      )
    `);

    // Kreiranje tabele za ulazne ponude/račune
    await db.query(`
      CREATE TABLE IF NOT EXISTS incoming_documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        date_received DATE NOT NULL,
        company_name VARCHAR(200) NOT NULL,
        project_name VARCHAR(200),
        pdf_link VARCHAR(500),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Kreiranje tabele za revizije ponuda
    await db.query(`
      CREATE TABLE IF NOT EXISTS offer_revisions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        original_offer_id INT NOT NULL,
        revision_offer_id INT NOT NULL,
        revision_number INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (original_offer_id) REFERENCES offers(id),
        FOREIGN KEY (revision_offer_id) REFERENCES offers(id)
      )
    `);

    // Kreiranje indeksa za performanse
    await db.query('CREATE INDEX idx_offers_user_id ON offers(user_id)');
    await db.query('CREATE INDEX idx_offers_client_id ON offers(client_id)');
    await db.query('CREATE INDEX idx_offers_status ON offers(status)');
    await db.query('CREATE INDEX idx_offer_items_offer_id ON offer_items(offer_id)');
    await db.query('CREATE INDEX idx_products_code ON products(code)');
    await db.query('CREATE INDEX idx_products_group ON products(group_id)');

    console.log('Baza podataka je uspešno kreirana!');

    // Dodavanje test podataka
    console.log('Dodavanje test podataka...');
    
    // Admin korisnik
    const bcrypt = require('bcryptjs');
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    await db.query(`
      INSERT IGNORE INTO users (first_name, last_name, username, password, phone, role) 
      VALUES ('Admin', 'User', 'admin', ?, '+381123456789', 'admin')
    `, [adminPassword]);

    // Test korisnik
    const userPassword = await bcrypt.hash('user123', 10);
    await db.query(`
      INSERT IGNORE INTO users (first_name, last_name, username, password, phone, role) 
      VALUES ('Marko', 'Petrović', 'marko', ?, '+381987654321', 'user')
    `, [userPassword]);

    // Podaci o firmi
    await db.query(`
      INSERT IGNORE INTO company_info (name, address, pib, mb, phones, emails, bank_accounts) 
      VALUES (
        'ISW Trading d.o.o.',
        'Bulevar Oslobođenja 123, 11000 Beograd',
        '123456789',
        '987654321',
        '["011/123-456", "011/987-654"]',
        '["info@isw.rs", "prodaja@isw.rs"]',
        '["160-123456-78", "265-987654-32"]'
      )
    `);

    // Test grupe proizvoda
    await db.query(`
      INSERT IGNORE INTO product_groups (name, description) VALUES 
      ('Elektronika', 'Elektronski uređaji i komponente'),
      ('Alati', 'Ručni i električni alati'),
      ('Materijali', 'Građevinski i tehnički materijali')
    `);

    // Test klijenti
    await db.query(`
      INSERT IGNORE INTO clients (company_name, address, city, email, phone, mb, pib) VALUES 
      ('ABC d.o.o.', 'Knez Mihailova 42', 'Beograd', 'office@abc.rs', '011/234-567', '12345678', '987654321'),
      ('XYZ Systems', 'Vojvode Stepe 55', 'Novi Sad', 'info@xyz.rs', '021/345-678', '87654321', '123456789')
    `);

    // Test proizvodi
    const groups = await db.query('SELECT id FROM product_groups LIMIT 3');
    if (groups.length > 0) {
      await db.query(`
        INSERT IGNORE INTO products (code, name, description, manufacturer, model, group_id, price) VALUES 
        ('EL001', 'Laptop Dell Latitude', 'Poslovni laptop 15.6 inch', 'Dell', 'Latitude 5520', ?, 85000.00),
        ('AL001', 'Bušilica Bosch', 'Udarna bušilica 18V', 'Bosch', 'GSB 18V-45', ?, 12500.00),
        ('MT001', 'Kabel UTP Cat6', 'Mrežni kabel 305m', 'Belden', 'Cat6 UTP', ?, 8500.00)
      `, [groups[0].id, groups[1].id, groups[2].id]);
    }

    console.log('Test podaci su uspešno dodati!');
    console.log('Admin kredencijali: admin / admin123');
    console.log('User kredencijali: marko / user123');
    
  } catch (error) {
    console.error('Greška pri kreiranju baze podataka:', error);
  }
};

// Pokretanje skripte
if (require.main === module) {
  initDatabase().then(() => {
    process.exit(0);
  });
}

module.exports = initDatabase;
