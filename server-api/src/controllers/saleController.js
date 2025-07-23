const db = require('../config/database');

class SaleController {
  async getAll(req, res) {
    try {
      const { start_date, end_date, user_id, client_id, page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT s.*, o.offer_number, c.company_name as client_name, 
               u.first_name, u.last_name
        FROM sales s
        JOIN offers o ON s.offer_id = o.id
        JOIN clients c ON o.client_id = c.id
        JOIN users u ON o.user_id = u.id
      `;
      let params = [];
      let conditions = [];

      // Filteri
      if (start_date) {
        conditions.push('s.sale_date >= ?');
        params.push(start_date);
      }

      if (end_date) {
        conditions.push('s.sale_date <= ?');
        params.push(end_date);
      }

      if (user_id) {
        conditions.push('o.user_id = ?');
        params.push(user_id);
      }

      if (client_id) {
        conditions.push('o.client_id = ?');
        params.push(client_id);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ` 
        ORDER BY s.sale_date DESC, s.created_at DESC
        LIMIT ? OFFSET ?
      `;
      params.push(parseInt(limit), parseInt(offset));

      const sales = await db.query(query, params);

      // Ukupan broj prodaja za paginaciju
      let countQuery = `
        SELECT COUNT(*) as total
        FROM sales s
        JOIN offers o ON s.offer_id = o.id
      `;
      if (conditions.length > 0) {
        countQuery += ' WHERE ' + conditions.join(' AND ');
      }

      const countResult = await db.query(countQuery, params.slice(0, -2)); // Ukloni limit i offset
      const total = countResult[0].total;

      res.json({
        sales,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get sales error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      
      const sales = await db.query(`
        SELECT s.*, o.offer_number, o.total_amount, o.total_with_tax, o.tax_rate,
               c.company_name as client_name, c.address as client_address, c.city as client_city,
               u.first_name, u.last_name
        FROM sales s
        JOIN offers o ON s.offer_id = o.id
        JOIN clients c ON o.client_id = c.id
        JOIN users u ON o.user_id = u.id
        WHERE s.id = ?
      `, [id]);

      if (sales.length === 0) {
        return res.status(404).json({ error: 'Prodaja nije pronađena' });
      }

      // Dodaj stavke ponude
      const items = await db.query(`
        SELECT oi.*, p.code, p.name as product_name, p.manufacturer, p.model
        FROM offer_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.offer_id = ?
        ORDER BY oi.id
      `, [sales[0].offer_id]);

      const sale = sales[0];
      sale.items = items;

      res.json(sale);
    } catch (error) {
      console.error('Get sale error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async create(req, res) {
    try {
      const { offer_id, sale_date, notes } = req.body;

      // Proveri da li ponuda postoji i da li je zaključana
      const offers = await db.query(`
        SELECT id, total_with_tax, is_locked 
        FROM offers 
        WHERE id = ?
      `, [offer_id]);

      if (offers.length === 0) {
        return res.status(404).json({ error: 'Ponuda nije pronađena' });
      }

      const offer = offers[0];
      if (!offer.is_locked) {
        return res.status(400).json({ error: 'Ponuda mora biti zaključana da bi se kreirana prodaja' });
      }

      // Proveri da li već postoji prodaja za ovu ponudu
      const existingSales = await db.query('SELECT id FROM sales WHERE offer_id = ?', [offer_id]);
      if (existingSales.length > 0) {
        return res.status(400).json({ error: 'Prodaja za ovu ponudu već postoji' });
      }

      const result = await db.query(`
        INSERT INTO sales (offer_id, sale_date, total_amount, notes)
        VALUES (?, ?, ?, ?)
      `, [offer_id, sale_date, offer.total_with_tax, notes]);

      const newSale = await db.query(`
        SELECT s.*, o.offer_number, c.company_name as client_name, 
               u.first_name, u.last_name
        FROM sales s
        JOIN offers o ON s.offer_id = o.id
        JOIN clients c ON o.client_id = c.id
        JOIN users u ON o.user_id = u.id
        WHERE s.id = ?
      `, [result.insertId]);

      res.status(201).json(newSale[0]);
    } catch (error) {
      console.error('Create sale error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { sale_date, notes } = req.body;

      // Proveri da li prodaja postoji
      const existingSales = await db.query('SELECT id FROM sales WHERE id = ?', [id]);
      if (existingSales.length === 0) {
        return res.status(404).json({ error: 'Prodaja nije pronađena' });
      }

      await db.query(`
        UPDATE sales 
        SET sale_date = ?, notes = ?
        WHERE id = ?
      `, [sale_date, notes, id]);

      const updatedSale = await db.query(`
        SELECT s.*, o.offer_number, c.company_name as client_name, 
               u.first_name, u.last_name
        FROM sales s
        JOIN offers o ON s.offer_id = o.id
        JOIN clients c ON o.client_id = c.id
        JOIN users u ON o.user_id = u.id
        WHERE s.id = ?
      `, [id]);

      res.json(updatedSale[0]);
    } catch (error) {
      console.error('Update sale error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;

      // Proveri da li prodaja postoji
      const existingSales = await db.query('SELECT id FROM sales WHERE id = ?', [id]);
      if (existingSales.length === 0) {
        return res.status(404).json({ error: 'Prodaja nije pronađena' });
      }

      await db.query('DELETE FROM sales WHERE id = ?', [id]);
      res.json({ message: 'Prodaja je uspešno obrisana' });
    } catch (error) {
      console.error('Delete sale error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async getStats(req, res) {
    try {
      const { start_date, end_date, user_id } = req.query;
      
      let conditions = [];
      let params = [];

      if (start_date) {
        conditions.push('s.sale_date >= ?');
        params.push(start_date);
      }

      if (end_date) {
        conditions.push('s.sale_date <= ?');
        params.push(end_date);
      }

      if (user_id) {
        conditions.push('o.user_id = ?');
        params.push(user_id);
      }

      const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

      // Ukupne statistike
      const totalStats = await db.query(`
        SELECT 
          COUNT(*) as total_sales,
          COALESCE(SUM(s.total_amount), 0) as total_revenue,
          COALESCE(AVG(s.total_amount), 0) as avg_sale_amount
        FROM sales s
        JOIN offers o ON s.offer_id = o.id
        ${whereClause}
      `, params);

      // Statistike po mesecima
      const monthlyStats = await db.query(`
        SELECT 
          DATE_FORMAT(s.sale_date, '%Y-%m') as month,
          COUNT(*) as sales_count,
          SUM(s.total_amount) as monthly_revenue
        FROM sales s
        JOIN offers o ON s.offer_id = o.id
        ${whereClause}
        GROUP BY DATE_FORMAT(s.sale_date, '%Y-%m')
        ORDER BY month DESC
        LIMIT 12
      `, params);

      // Top klijenti
      const topClients = await db.query(`
        SELECT 
          c.company_name,
          COUNT(*) as sales_count,
          SUM(s.total_amount) as total_revenue
        FROM sales s
        JOIN offers o ON s.offer_id = o.id
        JOIN clients c ON o.client_id = c.id
        ${whereClause}
        GROUP BY c.id, c.company_name
        ORDER BY total_revenue DESC
        LIMIT 10
      `, params);

      // Top prodavci (ako nije filtrirano po korisniku)
      let topSellers = [];
      if (!user_id) {
        topSellers = await db.query(`
          SELECT 
            CONCAT(u.first_name, ' ', u.last_name) as seller_name,
            COUNT(*) as sales_count,
            SUM(s.total_amount) as total_revenue
          FROM sales s
          JOIN offers o ON s.offer_id = o.id
          JOIN users u ON o.user_id = u.id
          ${whereClause}
          GROUP BY u.id, u.first_name, u.last_name
          ORDER BY total_revenue DESC
          LIMIT 10
        `, params);
      }

      res.json({
        total: totalStats[0],
        monthly: monthlyStats,
        top_clients: topClients,
        top_sellers: topSellers
      });
    } catch (error) {
      console.error('Get sales stats error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }
}

module.exports = new SaleController();
