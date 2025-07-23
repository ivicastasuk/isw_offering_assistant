const db = require('../config/database');

class IncomingDocumentController {
  async getAll(req, res) {
    try {
      const { search, start_date, end_date, page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;
      
      let query = 'SELECT * FROM incoming_documents';
      let params = [];
      let conditions = [];

      // Filteri
      if (search) {
        conditions.push('(company_name LIKE ? OR project_name LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }

      if (start_date) {
        conditions.push('date_received >= ?');
        params.push(start_date);
      }

      if (end_date) {
        conditions.push('date_received <= ?');
        params.push(end_date);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ` 
        ORDER BY date_received DESC, created_at DESC
        LIMIT ? OFFSET ?
      `;
      params.push(parseInt(limit), parseInt(offset));

      const documents = await db.query(query, params);

      // Ukupan broj dokumenata za paginaciju
      let countQuery = 'SELECT COUNT(*) as total FROM incoming_documents';
      if (conditions.length > 0) {
        countQuery += ' WHERE ' + conditions.join(' AND ');
      }

      const countResult = await db.query(countQuery, params.slice(0, -2)); // Ukloni limit i offset
      const total = countResult[0].total;

      res.json({
        documents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get incoming documents error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const documents = await db.query('SELECT * FROM incoming_documents WHERE id = ?', [id]);

      if (documents.length === 0) {
        return res.status(404).json({ error: 'Dokument nije pronađen' });
      }

      res.json(documents[0]);
    } catch (error) {
      console.error('Get incoming document error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async create(req, res) {
    try {
      const { date_received, company_name, project_name, pdf_link, notes } = req.body;

      const result = await db.query(`
        INSERT INTO incoming_documents (date_received, company_name, project_name, pdf_link, notes)
        VALUES (?, ?, ?, ?, ?)
      `, [date_received, company_name, project_name, pdf_link, notes]);

      const newDocument = await db.query('SELECT * FROM incoming_documents WHERE id = ?', [result.insertId]);
      res.status(201).json(newDocument[0]);
    } catch (error) {
      console.error('Create incoming document error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { date_received, company_name, project_name, pdf_link, notes } = req.body;

      // Proveri da li dokument postoji
      const existingDocuments = await db.query('SELECT id FROM incoming_documents WHERE id = ?', [id]);
      if (existingDocuments.length === 0) {
        return res.status(404).json({ error: 'Dokument nije pronađen' });
      }

      await db.query(`
        UPDATE incoming_documents 
        SET date_received = ?, company_name = ?, project_name = ?, pdf_link = ?, notes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [date_received, company_name, project_name, pdf_link, notes, id]);

      const updatedDocument = await db.query('SELECT * FROM incoming_documents WHERE id = ?', [id]);
      res.json(updatedDocument[0]);
    } catch (error) {
      console.error('Update incoming document error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;

      // Proveri da li dokument postoji
      const existingDocuments = await db.query('SELECT id FROM incoming_documents WHERE id = ?', [id]);
      if (existingDocuments.length === 0) {
        return res.status(404).json({ error: 'Dokument nije pronađen' });
      }

      await db.query('DELETE FROM incoming_documents WHERE id = ?', [id]);
      res.json({ message: 'Dokument je uspešno obrisan' });
    } catch (error) {
      console.error('Delete incoming document error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async uploadPDF(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'PDF fajl nije pronađen' });
      }

      const pdfPath = req.file.filename;

      res.json({ 
        message: 'PDF je uspešno postavljen',
        pdf_link: pdfPath 
      });
    } catch (error) {
      console.error('Upload PDF error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async getStats(req, res) {
    try {
      const { start_date, end_date } = req.query;
      
      let conditions = [];
      let params = [];

      if (start_date) {
        conditions.push('date_received >= ?');
        params.push(start_date);
      }

      if (end_date) {
        conditions.push('date_received <= ?');
        params.push(end_date);
      }

      const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

      // Ukupne statistike
      const totalStats = await db.query(`
        SELECT 
          COUNT(*) as total_documents,
          COUNT(DISTINCT company_name) as unique_companies
        FROM incoming_documents
        ${whereClause}
      `, params);

      // Statistike po mesecima
      const monthlyStats = await db.query(`
        SELECT 
          DATE_FORMAT(date_received, '%Y-%m') as month,
          COUNT(*) as document_count
        FROM incoming_documents
        ${whereClause}
        GROUP BY DATE_FORMAT(date_received, '%Y-%m')
        ORDER BY month DESC
        LIMIT 12
      `, params);

      // Top firme po broju dokumenata
      const topCompanies = await db.query(`
        SELECT 
          company_name,
          COUNT(*) as document_count
        FROM incoming_documents
        ${whereClause}
        GROUP BY company_name
        ORDER BY document_count DESC
        LIMIT 10
      `, params);

      res.json({
        total: totalStats[0],
        monthly: monthlyStats,
        top_companies: topCompanies
      });
    } catch (error) {
      console.error('Get incoming documents stats error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }
}

module.exports = new IncomingDocumentController();
