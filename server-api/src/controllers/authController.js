const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

class AuthController {
  async login(req, res) {
    try {
      const { username, password } = req.body;

      // Pronađi korisnika
      const users = await db.query(
        'SELECT id, username, password, first_name, last_name, role, is_active FROM users WHERE username = ?',
        [username]
      );

      if (users.length === 0) {
        return res.status(401).json({ error: 'Neispravno korisničko ime ili šifra' });
      }

      const user = users[0];

      if (!user.is_active) {
        return res.status(401).json({ error: 'Korisnički nalog je deaktiviran' });
      }

      // Proveri šifru
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Neispravno korisničko ime ili šifra' });
      }

      // Generiši JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role,
          name: `${user.first_name} ${user.last_name}`
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async me(req, res) {
    try {
      const users = await db.query(
        'SELECT id, username, first_name, last_name, phone, role, created_at FROM users WHERE id = ?',
        [req.user.id]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'Korisnik nije pronađen' });
      }

      res.json(users[0]);
    } catch (error) {
      console.error('Me error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      // Pronađi korisnika
      const users = await db.query(
        'SELECT password FROM users WHERE id = ?',
        [req.user.id]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'Korisnik nije pronađen' });
      }

      // Proveri trenutnu šifru
      const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Trenutna šifra nije ispravna' });
      }

      // Hash novu šifru
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Ažuriraj šifru
      await db.query(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, req.user.id]
      );

      res.json({ message: 'Šifra je uspešno promenjena' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }
}

module.exports = new AuthController();
