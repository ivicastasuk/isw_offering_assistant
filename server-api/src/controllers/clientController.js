const db = require('../config/database');

class ClientController {
  async getAll(req, res) {
    try {
      const { search, active } = req.query;
      let query = 'SELECT * FROM clients';
      let params = [];
      let conditions = [];

      if (active !== undefined) {
        conditions.push('is_active = ?');
        params.push(active === 'true');
      }

      if (search) {
        conditions.push('(company_name LIKE ? OR city LIKE ? OR email LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY company_name';

      const clients = await db.query(query, params);
      res.json(clients);
    } catch (error) {
      console.error('Get clients error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const clients = await db.query('SELECT * FROM clients WHERE id = ?', [id]);

      if (clients.length === 0) {
        return res.status(404).json({ error: 'Klijent nije pronađen' });
      }

      res.json(clients[0]);
    } catch (error) {
      console.error('Get client error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async create(req, res) {
    try {
      const { company_name, address, city, email, phone, mb, pib } = req.body;

      const result = await db.query(`
        INSERT INTO clients (company_name, address, city, email, phone, mb, pib)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [company_name, address, city, email, phone, mb, pib]);

      const newClient = await db.query('SELECT * FROM clients WHERE id = ?', [result.insertId]);
      res.status(201).json(newClient[0]);
    } catch (error) {
      console.error('Create client error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { company_name, address, city, email, phone, mb, pib } = req.body;

      // Proveri da li klijent postoji
      const existingClients = await db.query('SELECT id FROM clients WHERE id = ?', [id]);
      if (existingClients.length === 0) {
        return res.status(404).json({ error: 'Klijent nije pronađen' });
      }

      await db.query(`
        UPDATE clients 
        SET company_name = ?, address = ?, city = ?, email = ?, phone = ?, mb = ?, pib = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [company_name, address, city, email, phone, mb, pib, id]);

      const updatedClient = await db.query('SELECT * FROM clients WHERE id = ?', [id]);
      res.json(updatedClient[0]);
    } catch (error) {
      console.error('Update client error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;

      // Proveri da li klijent postoji
      const existingClients = await db.query('SELECT id FROM clients WHERE id = ?', [id]);
      if (existingClients.length === 0) {
        return res.status(404).json({ error: 'Klijent nije pronađen' });
      }

      // Proveri da li postoje ponude vezane za ovog klijenta
      const offers = await db.query('SELECT id FROM offers WHERE client_id = ?', [id]);
      if (offers.length > 0) {
        return res.status(400).json({ 
          error: 'Ne možete obrisati klijenta koji ima postojeće ponude. Prvo deaktivirajte klijenta.' 
        });
      }

      await db.query('DELETE FROM clients WHERE id = ?', [id]);
      res.json({ message: 'Klijent je uspešno obrisan' });
    } catch (error) {
      console.error('Delete client error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async deactivate(req, res) {
    try {
      const { id } = req.params;

      // Proveri da li klijent postoji
      const existingClients = await db.query('SELECT id FROM clients WHERE id = ?', [id]);
      if (existingClients.length === 0) {
        return res.status(404).json({ error: 'Klijent nije pronađen' });
      }

      await db.query('UPDATE clients SET is_active = false WHERE id = ?', [id]);
      res.json({ message: 'Klijent je uspešno deaktiviran' });
    } catch (error) {
      console.error('Deactivate client error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async activate(req, res) {
    try {
      const { id } = req.params;

      // Proveri da li klijent postoji
      const existingClients = await db.query('SELECT id FROM clients WHERE id = ?', [id]);
      if (existingClients.length === 0) {
        return res.status(404).json({ error: 'Klijent nije pronađen' });
      }

      await db.query('UPDATE clients SET is_active = true WHERE id = ?', [id]);
      res.json({ message: 'Klijent je uspešno aktiviran' });
    } catch (error) {
      console.error('Activate client error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }
}

module.exports = new ClientController();
