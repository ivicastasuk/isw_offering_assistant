const db = require('../config/database');

class CompanyController {
  async get(req, res) {
    try {
      const companies = await db.query('SELECT * FROM company_info ORDER BY created_at DESC LIMIT 1');
      
      if (companies.length === 0) {
        return res.json({
          name: '',
          logo: '',
          address: '',
          pib: '',
          mb: '',
          phones: [],
          emails: [],
          bank_accounts: []
        });
      }

      const company = companies[0];
      
      // Parsiraj JSON stringove
      try {
        company.phones = company.phones ? JSON.parse(company.phones) : [];
        company.emails = company.emails ? JSON.parse(company.emails) : [];
        company.bank_accounts = company.bank_accounts ? JSON.parse(company.bank_accounts) : [];
      } catch (error) {
        console.error('Error parsing company JSON fields:', error);
        company.phones = [];
        company.emails = [];
        company.bank_accounts = [];
      }

      res.json(company);
    } catch (error) {
      console.error('Get company error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async update(req, res) {
    try {
      const { name, address, pib, mb, phones, emails, bank_accounts } = req.body;

      // Konvertuj nizove u JSON stringove
      const phonesJson = JSON.stringify(phones || []);
      const emailsJson = JSON.stringify(emails || []);
      const bankAccountsJson = JSON.stringify(bank_accounts || []);

      // Proveri da li već postoji zapis
      const existingCompanies = await db.query('SELECT id FROM company_info LIMIT 1');

      if (existingCompanies.length === 0) {
        // Kreiraj novi zapis
        const result = await db.query(`
          INSERT INTO company_info (name, address, pib, mb, phones, emails, bank_accounts)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [name, address, pib, mb, phonesJson, emailsJson, bankAccountsJson]);

        const newCompany = await db.query('SELECT * FROM company_info WHERE id = ?', [result.insertId]);
        const company = newCompany[0];
        
        // Parsiraj JSON stringove pre slanja
        company.phones = JSON.parse(company.phones);
        company.emails = JSON.parse(company.emails);
        company.bank_accounts = JSON.parse(company.bank_accounts);

        res.status(201).json(company);
      } else {
        // Ažuriraj postojeći zapis
        await db.query(`
          UPDATE company_info 
          SET name = ?, address = ?, pib = ?, mb = ?, phones = ?, emails = ?, bank_accounts = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [name, address, pib, mb, phonesJson, emailsJson, bankAccountsJson, existingCompanies[0].id]);

        const updatedCompany = await db.query('SELECT * FROM company_info WHERE id = ?', [existingCompanies[0].id]);
        const company = updatedCompany[0];
        
        // Parsiraj JSON stringove pre slanja
        company.phones = JSON.parse(company.phones);
        company.emails = JSON.parse(company.emails);
        company.bank_accounts = JSON.parse(company.bank_accounts);

        res.json(company);
      }
    } catch (error) {
      console.error('Update company error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async uploadLogo(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Fajl nije pronađen' });
      }

      const logoPath = req.file.filename;

      // Ažuriraj logo u bazi
      const existingCompanies = await db.query('SELECT id FROM company_info LIMIT 1');

      if (existingCompanies.length === 0) {
        // Kreiraj novi zapis samo sa logom
        await db.query(`
          INSERT INTO company_info (name, logo)
          VALUES ('', ?)
        `, [logoPath]);
      } else {
        // Ažuriraj postojeći zapis
        await db.query(`
          UPDATE company_info 
          SET logo = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [logoPath, existingCompanies[0].id]);
      }

      res.json({ 
        message: 'Logo je uspešno postavljen',
        logo: logoPath 
      });
    } catch (error) {
      console.error('Upload logo error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }
}

module.exports = new CompanyController();
