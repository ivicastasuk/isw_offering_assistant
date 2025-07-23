const bcrypt = require('bcryptjs');
const db = require('../config/database');

class UserController {
  async getAll(req, res) {
    try {
      const users = await db.query(`
        SELECT id, first_name, last_name, username, phone, role, is_active, created_at 
        FROM users 
        ORDER BY first_name, last_name
      `);
      res.json(users);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const users = await db.query(`
        SELECT id, first_name, last_name, username, phone, role, is_active, created_at 
        FROM users WHERE id = ?
      `, [id]);

      if (users.length === 0) {
        return res.status(404).json({ error: 'Korisnik nije pronađen' });
      }

      res.json(users[0]);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async create(req, res) {
    try {
      const { first_name, last_name, username, password, phone, role } = req.body;

      // Proveri da li korisničko ime već postoji
      const existingUsers = await db.query(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({ error: 'Korisničko ime već postoji' });
      }

      // Hash šifru
      const hashedPassword = await bcrypt.hash(password, 10);

      // Kreiraj korisnika
      const result = await db.query(`
        INSERT INTO users (first_name, last_name, username, password, phone, role)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [first_name, last_name, username, hashedPassword, phone, role || 'user']);

      const newUser = await db.query(`
        SELECT id, first_name, last_name, username, phone, role, is_active, created_at 
        FROM users WHERE id = ?
      `, [result.insertId]);

      res.status(201).json(newUser[0]);
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { first_name, last_name, phone, role } = req.body;

      // Proveri da li korisnik postoji
      const existingUsers = await db.query('SELECT id FROM users WHERE id = ?', [id]);
      if (existingUsers.length === 0) {
        return res.status(404).json({ error: 'Korisnik nije pronađen' });
      }

      // Ažuriraj korisnika
      await db.query(`
        UPDATE users 
        SET first_name = ?, last_name = ?, phone = ?, role = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [first_name, last_name, phone, role, id]);

      const updatedUser = await db.query(`
        SELECT id, first_name, last_name, username, phone, role, is_active, created_at 
        FROM users WHERE id = ?
      `, [id]);

      res.json(updatedUser[0]);
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async deactivate(req, res) {
    try {
      const { id } = req.params;

      // Ne dozvoliti deaktivaciju sebe
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'Ne možete deaktivirati svoj nalog' });
      }

      // Proveri da li korisnik postoji
      const existingUsers = await db.query('SELECT id FROM users WHERE id = ?', [id]);
      if (existingUsers.length === 0) {
        return res.status(404).json({ error: 'Korisnik nije pronađen' });
      }

      // Deaktiviraj korisnika
      await db.query('UPDATE users SET is_active = false WHERE id = ?', [id]);

      res.json({ message: 'Korisnik je uspešno deaktiviran' });
    } catch (error) {
      console.error('Deactivate user error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async activate(req, res) {
    try {
      const { id } = req.params;

      // Proveri da li korisnik postoji
      const existingUsers = await db.query('SELECT id FROM users WHERE id = ?', [id]);
      if (existingUsers.length === 0) {
        return res.status(404).json({ error: 'Korisnik nije pronađen' });
      }

      // Aktiviraj korisnika
      await db.query('UPDATE users SET is_active = true WHERE id = ?', [id]);

      res.json({ message: 'Korisnik je uspešno aktiviran' });
    } catch (error) {
      console.error('Activate user error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async resetPassword(req, res) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      // Proveri da li korisnik postoji
      const existingUsers = await db.query('SELECT id FROM users WHERE id = ?', [id]);
      if (existingUsers.length === 0) {
        return res.status(404).json({ error: 'Korisnik nije pronađen' });
      }

      // Hash novu šifru
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Ažuriraj šifru
      await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);

      res.json({ message: 'Šifra je uspešno resetovana' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }
}

module.exports = new UserController();
