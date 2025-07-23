const db = require('../config/database');

class ProductController {
  async getAll(req, res) {
    try {
      const { search, group_id, active } = req.query;
      let query = `
        SELECT p.*, pg.name as group_name 
        FROM products p 
        LEFT JOIN product_groups pg ON p.group_id = pg.id
      `;
      let params = [];
      let conditions = [];

      if (active !== undefined) {
        conditions.push('p.is_active = ?');
        params.push(active === 'true');
      }

      if (group_id) {
        conditions.push('p.group_id = ?');
        params.push(group_id);
      }

      if (search) {
        conditions.push('(p.name LIKE ? OR p.code LIKE ? OR p.manufacturer LIKE ? OR p.model LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY p.name';

      const products = await db.query(query, params);
      res.json(products);
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const products = await db.query(`
        SELECT p.*, pg.name as group_name 
        FROM products p 
        LEFT JOIN product_groups pg ON p.group_id = pg.id
        WHERE p.id = ?
      `, [id]);

      if (products.length === 0) {
        return res.status(404).json({ error: 'Proizvod nije pronađen' });
      }

      res.json(products[0]);
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async create(req, res) {
    try {
      const { code, name, description, manufacturer, model, group_id, price } = req.body;

      // Proveri da li šifra već postoji
      const existingProducts = await db.query('SELECT id FROM products WHERE code = ?', [code]);
      if (existingProducts.length > 0) {
        return res.status(400).json({ error: 'Šifra proizvoda već postoji' });
      }

      const result = await db.query(`
        INSERT INTO products (code, name, description, manufacturer, model, group_id, price)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [code, name, description, manufacturer, model, group_id, price]);

      const newProduct = await db.query(`
        SELECT p.*, pg.name as group_name 
        FROM products p 
        LEFT JOIN product_groups pg ON p.group_id = pg.id
        WHERE p.id = ?
      `, [result.insertId]);

      res.status(201).json(newProduct[0]);
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { code, name, description, manufacturer, model, group_id, price } = req.body;

      // Proveri da li proizvod postoji
      const existingProducts = await db.query('SELECT id FROM products WHERE id = ?', [id]);
      if (existingProducts.length === 0) {
        return res.status(404).json({ error: 'Proizvod nije pronađen' });
      }

      // Proveri da li šifra već postoji kod drugog proizvoda
      const duplicateCode = await db.query('SELECT id FROM products WHERE code = ? AND id != ?', [code, id]);
      if (duplicateCode.length > 0) {
        return res.status(400).json({ error: 'Šifra proizvoda već postoji' });
      }

      await db.query(`
        UPDATE products 
        SET code = ?, name = ?, description = ?, manufacturer = ?, model = ?, group_id = ?, price = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [code, name, description, manufacturer, model, group_id, price, id]);

      const updatedProduct = await db.query(`
        SELECT p.*, pg.name as group_name 
        FROM products p 
        LEFT JOIN product_groups pg ON p.group_id = pg.id
        WHERE p.id = ?
      `, [id]);

      res.json(updatedProduct[0]);
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;

      // Proveri da li proizvod postoji
      const existingProducts = await db.query('SELECT id FROM products WHERE id = ?', [id]);
      if (existingProducts.length === 0) {
        return res.status(404).json({ error: 'Proizvod nije pronađen' });
      }

      // Proveri da li postoje stavke ponude vezane za ovaj proizvod
      const offerItems = await db.query('SELECT id FROM offer_items WHERE product_id = ?', [id]);
      if (offerItems.length > 0) {
        return res.status(400).json({ 
          error: 'Ne možete obrisati proizvod koji se koristi u ponudama. Prvo deaktivirajte proizvod.' 
        });
      }

      await db.query('DELETE FROM products WHERE id = ?', [id]);
      res.json({ message: 'Proizvod je uspešno obrisan' });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async deactivate(req, res) {
    try {
      const { id } = req.params;

      // Proveri da li proizvod postoji
      const existingProducts = await db.query('SELECT id FROM products WHERE id = ?', [id]);
      if (existingProducts.length === 0) {
        return res.status(404).json({ error: 'Proizvod nije pronađen' });
      }

      await db.query('UPDATE products SET is_active = false WHERE id = ?', [id]);
      res.json({ message: 'Proizvod je uspešno deaktiviran' });
    } catch (error) {
      console.error('Deactivate product error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async activate(req, res) {
    try {
      const { id } = req.params;

      // Proveri da li proizvod postoji
      const existingProducts = await db.query('SELECT id FROM products WHERE id = ?', [id]);
      if (existingProducts.length === 0) {
        return res.status(404).json({ error: 'Proizvod nije pronađen' });
      }

      await db.query('UPDATE products SET is_active = true WHERE id = ?', [id]);
      res.json({ message: 'Proizvod je uspešno aktiviran' });
    } catch (error) {
      console.error('Activate product error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  // Product Groups
  async getAllGroups(req, res) {
    try {
      const groups = await db.query(`
        SELECT pg.*, COUNT(p.id) as product_count 
        FROM product_groups pg 
        LEFT JOIN products p ON pg.id = p.group_id AND p.is_active = true
        GROUP BY pg.id 
        ORDER BY pg.name
      `);
      res.json(groups);
    } catch (error) {
      console.error('Get product groups error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async createGroup(req, res) {
    try {
      const { name, description } = req.body;

      const result = await db.query(`
        INSERT INTO product_groups (name, description)
        VALUES (?, ?)
      `, [name, description]);

      const newGroup = await db.query('SELECT * FROM product_groups WHERE id = ?', [result.insertId]);
      res.status(201).json(newGroup[0]);
    } catch (error) {
      console.error('Create product group error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async updateGroup(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      // Proveri da li grupa postoji
      const existingGroups = await db.query('SELECT id FROM product_groups WHERE id = ?', [id]);
      if (existingGroups.length === 0) {
        return res.status(404).json({ error: 'Grupa proizvoda nije pronađena' });
      }

      await db.query(`
        UPDATE product_groups 
        SET name = ?, description = ?
        WHERE id = ?
      `, [name, description, id]);

      const updatedGroup = await db.query('SELECT * FROM product_groups WHERE id = ?', [id]);
      res.json(updatedGroup[0]);
    } catch (error) {
      console.error('Update product group error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async deleteGroup(req, res) {
    try {
      const { id } = req.params;

      // Proveri da li grupa postoji
      const existingGroups = await db.query('SELECT id FROM product_groups WHERE id = ?', [id]);
      if (existingGroups.length === 0) {
        return res.status(404).json({ error: 'Grupa proizvoda nije pronađena' });
      }

      // Proveri da li postoje proizvodi u ovoj grupi
      const products = await db.query('SELECT id FROM products WHERE group_id = ?', [id]);
      if (products.length > 0) {
        return res.status(400).json({ 
          error: 'Ne možete obrisati grupu koja sadrži proizvode. Prvo premestite proizvode u drugu grupu.' 
        });
      }

      await db.query('DELETE FROM product_groups WHERE id = ?', [id]);
      res.json({ message: 'Grupa proizvoda je uspešno obrisana' });
    } catch (error) {
      console.error('Delete product group error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }
}

module.exports = new ProductController();
