const db = require('../config/database');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

class OfferController {
  // Generiši sledeći broj ponude za korisnika
  async generateOfferNumber(userId) {
    const result = await db.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(offer_number, LOCATE('-', offer_number) + 1) AS UNSIGNED)), 0) + 1 as next_number
      FROM offers 
      WHERE user_id = ? AND offer_number LIKE CONCAT(?, '-%')
    `, [userId, userId]);
    
    return `${userId}-${result[0].next_number}`;
  }

  async getAll(req, res) {
    try {
      const { status, client_id, user_id, search, page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT o.*, c.company_name as client_name, u.first_name, u.last_name,
               COUNT(oi.id) as item_count
        FROM offers o
        JOIN clients c ON o.client_id = c.id
        JOIN users u ON o.user_id = u.id
        LEFT JOIN offer_items oi ON o.id = oi.offer_id
      `;
      let params = [];
      let conditions = [];

      // Filteri
      if (status) {
        conditions.push('o.status = ?');
        params.push(status);
      }

      if (client_id) {
        conditions.push('o.client_id = ?');
        params.push(client_id);
      }

      if (user_id) {
        conditions.push('o.user_id = ?');
        params.push(user_id);
      }

      if (search) {
        conditions.push('(o.offer_number LIKE ? OR c.company_name LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ` 
        GROUP BY o.id 
        ORDER BY o.created_at DESC 
        LIMIT ? OFFSET ?
      `;
      params.push(parseInt(limit), parseInt(offset));

      const offers = await db.query(query, params);

      // Ukupan broj ponuda za paginaciju
      let countQuery = `
        SELECT COUNT(DISTINCT o.id) as total
        FROM offers o
        JOIN clients c ON o.client_id = c.id
        JOIN users u ON o.user_id = u.id
      `;
      if (conditions.length > 0) {
        countQuery += ' WHERE ' + conditions.join(' AND ');
      }

      const countResult = await db.query(countQuery, params.slice(0, -2)); // Ukloni limit i offset
      const total = countResult[0].total;

      res.json({
        offers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get offers error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      
      // Osnovna informacija o ponudi
      const offers = await db.query(`
        SELECT o.*, c.company_name, c.address as client_address, c.city as client_city,
               c.email as client_email, c.phone as client_phone, c.mb as client_mb, c.pib as client_pib,
               u.first_name, u.last_name
        FROM offers o
        JOIN clients c ON o.client_id = c.id
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
      `, [id]);

      if (offers.length === 0) {
        return res.status(404).json({ error: 'Ponuda nije pronađena' });
      }

      // Stavke ponude
      const items = await db.query(`
        SELECT oi.*, p.code, p.name as product_name, p.description as product_description,
               p.manufacturer, p.model
        FROM offer_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.offer_id = ?
        ORDER BY oi.id
      `, [id]);

      const offer = offers[0];
      offer.items = items;

      res.json(offer);
    } catch (error) {
      console.error('Get offer error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async create(req, res) {
    try {
      const { client_id, tax_rate = 20 } = req.body;

      // Proveri da li klijent postoji
      const clients = await db.query('SELECT id FROM clients WHERE id = ? AND is_active = true', [client_id]);
      if (clients.length === 0) {
        return res.status(404).json({ error: 'Klijent nije pronađen ili nije aktivan' });
      }

      // Generiši broj ponude
      const offerNumber = await this.generateOfferNumber(req.user.id);

      const result = await db.query(`
        INSERT INTO offers (offer_number, user_id, client_id, tax_rate)
        VALUES (?, ?, ?, ?)
      `, [offerNumber, req.user.id, client_id, tax_rate]);

      const newOffer = await db.query(`
        SELECT o.*, c.company_name, c.address as client_address, c.city as client_city,
               c.email as client_email, c.phone as client_phone, c.mb as client_mb, c.pib as client_pib,
               u.first_name, u.last_name
        FROM offers o
        JOIN clients c ON o.client_id = c.id
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
      `, [result.insertId]);

      newOffer[0].items = [];
      res.status(201).json(newOffer[0]);
    } catch (error) {
      console.error('Create offer error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async addItem(req, res) {
    try {
      const { id } = req.params;
      const { product_id, quantity, unit_price, discount_percent = 0 } = req.body;

      // Proveri da li ponuda postoji i da li je zaključana
      const offers = await db.query('SELECT id, is_locked, user_id FROM offers WHERE id = ?', [id]);
      if (offers.length === 0) {
        return res.status(404).json({ error: 'Ponuda nije pronađena' });
      }

      const offer = offers[0];
      if (offer.is_locked) {
        return res.status(400).json({ error: 'Ponuda je zaključana i ne može se menjati' });
      }

      // Proveri vlasništvo ponude (osim admin-a)
      if (req.user.role !== 'admin' && offer.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Nemate dozvolu da menjate ovu ponudu' });
      }

      // Proveri da li proizvod postoji
      const products = await db.query('SELECT id FROM products WHERE id = ? AND is_active = true', [product_id]);
      if (products.length === 0) {
        return res.status(404).json({ error: 'Proizvod nije pronađen ili nije aktivan' });
      }

      // Izračunaj ukupnu cenu stavke
      const lineTotal = quantity * unit_price * (1 - discount_percent / 100);

      await db.transaction(async (connection) => {
        // Dodaj stavku
        const itemResult = await connection.execute(`
          INSERT INTO offer_items (offer_id, product_id, quantity, unit_price, discount_percent, line_total)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [id, product_id, quantity, unit_price, discount_percent, lineTotal]);

        // Ažuriraj ukupne iznose ponude
        await this.recalculateOffer(connection, id);
      });

      // Vrati ažuriranu ponudu
      const updatedOffer = await this.getOfferWithItems(id);
      res.json(updatedOffer);
    } catch (error) {
      console.error('Add offer item error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async updateItem(req, res) {
    try {
      const { id, itemId } = req.params;
      const { quantity, unit_price, discount_percent = 0 } = req.body;

      // Proveri da li ponuda postoji i da li je zaključana
      const offers = await db.query('SELECT id, is_locked, user_id FROM offers WHERE id = ?', [id]);
      if (offers.length === 0) {
        return res.status(404).json({ error: 'Ponuda nije pronađena' });
      }

      const offer = offers[0];
      if (offer.is_locked) {
        return res.status(400).json({ error: 'Ponuda je zaključana i ne može se menjati' });
      }

      // Proveri vlasništvo ponude (osim admin-a)
      if (req.user.role !== 'admin' && offer.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Nemate dozvolu da menjate ovu ponudu' });
      }

      // Proveri da li stavka postoji
      const items = await db.query('SELECT id FROM offer_items WHERE id = ? AND offer_id = ?', [itemId, id]);
      if (items.length === 0) {
        return res.status(404).json({ error: 'Stavka ponude nije pronađena' });
      }

      // Izračunaj ukupnu cenu stavke
      const lineTotal = quantity * unit_price * (1 - discount_percent / 100);

      await db.transaction(async (connection) => {
        // Ažuriraj stavku
        await connection.execute(`
          UPDATE offer_items 
          SET quantity = ?, unit_price = ?, discount_percent = ?, line_total = ?
          WHERE id = ?
        `, [quantity, unit_price, discount_percent, lineTotal, itemId]);

        // Ažuriraj ukupne iznose ponude
        await this.recalculateOffer(connection, id);
      });

      // Vrati ažuriranu ponudu
      const updatedOffer = await this.getOfferWithItems(id);
      res.json(updatedOffer);
    } catch (error) {
      console.error('Update offer item error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async removeItem(req, res) {
    try {
      const { id, itemId } = req.params;

      // Proveri da li ponuda postoji i da li je zaključana
      const offers = await db.query('SELECT id, is_locked, user_id FROM offers WHERE id = ?', [id]);
      if (offers.length === 0) {
        return res.status(404).json({ error: 'Ponuda nije pronađena' });
      }

      const offer = offers[0];
      if (offer.is_locked) {
        return res.status(400).json({ error: 'Ponuda je zaključana i ne može se menjati' });
      }

      // Proveri vlasništvo ponude (osim admin-a)
      if (req.user.role !== 'admin' && offer.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Nemate dozvolu da menjate ovu ponudu' });
      }

      // Proveri da li stavka postoji
      const items = await db.query('SELECT id FROM offer_items WHERE id = ? AND offer_id = ?', [itemId, id]);
      if (items.length === 0) {
        return res.status(404).json({ error: 'Stavka ponude nije pronađena' });
      }

      await db.transaction(async (connection) => {
        // Obriši stavku
        await connection.execute('DELETE FROM offer_items WHERE id = ?', [itemId]);

        // Ažuriraj ukupne iznose ponude
        await this.recalculateOffer(connection, id);
      });

      // Vrati ažuriranu ponudu
      const updatedOffer = await this.getOfferWithItems(id);
      res.json(updatedOffer);
    } catch (error) {
      console.error('Remove offer item error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async lock(req, res) {
    try {
      const { id } = req.params;

      // Proveri da li ponuda postoji
      const offers = await db.query('SELECT id, is_locked, user_id FROM offers WHERE id = ?', [id]);
      if (offers.length === 0) {
        return res.status(404).json({ error: 'Ponuda nije pronađena' });
      }

      const offer = offers[0];
      if (offer.is_locked) {
        return res.status(400).json({ error: 'Ponuda je već zaključana' });
      }

      // Proveri vlasništvo ponude (osim admin-a)
      if (req.user.role !== 'admin' && offer.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Nemate dozvolu da zaključate ovu ponudu' });
      }

      // Proveri da li ponuda ima stavke
      const items = await db.query('SELECT id FROM offer_items WHERE offer_id = ?', [id]);
      if (items.length === 0) {
        return res.status(400).json({ error: 'Ne možete zaključati ponudu bez stavki' });
      }

      await db.query(`
        UPDATE offers 
        SET is_locked = true, locked_at = CURRENT_TIMESTAMP, status = 'locked'
        WHERE id = ?
      `, [id]);

      res.json({ message: 'Ponuda je uspešno zaključana' });
    } catch (error) {
      console.error('Lock offer error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['draft', 'locked', 'past', 'rejected', 'questionable'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Nevaljan status ponude' });
      }

      // Proveri da li ponuda postoji
      const offers = await db.query('SELECT id, status as current_status, user_id FROM offers WHERE id = ?', [id]);
      if (offers.length === 0) {
        return res.status(404).json({ error: 'Ponuda nije pronađena' });
      }

      const offer = offers[0];

      // Proveri vlasništvo ponude (osim admin-a)
      if (req.user.role !== 'admin' && offer.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Nemate dozvolu da menjate status ove ponude' });
      }

      await db.query('UPDATE offers SET status = ? WHERE id = ?', [status, id]);

      res.json({ message: 'Status ponude je uspešno ažuriran' });
    } catch (error) {
      console.error('Update offer status error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async createRevision(req, res) {
    try {
      const { id } = req.params;

      // Proveri da li originalna ponuda postoji
      const originalOffers = await db.query('SELECT * FROM offers WHERE id = ?', [id]);
      if (originalOffers.length === 0) {
        return res.status(404).json({ error: 'Originalna ponuda nije pronađena' });
      }

      const originalOffer = originalOffers[0];

      // Proveri vlasništvo ponude (osim admin-a)
      if (req.user.role !== 'admin' && originalOffer.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Nemate dozvolu da kreirate reviziju ove ponude' });
      }

      await db.transaction(async (connection) => {
        // Generiši broj za novu ponudu
        const newOfferNumber = await this.generateOfferNumber(req.user.id);

        // Kreiraj novu ponudu
        const newOfferResult = await connection.execute(`
          INSERT INTO offers (offer_number, user_id, client_id, tax_rate, total_amount, total_discount, total_with_tax)
          VALUES (?, ?, ?, ?, 0, 0, 0)
        `, [newOfferNumber, req.user.id, originalOffer.client_id, originalOffer.tax_rate]);

        const newOfferId = newOfferResult[0].insertId;

        // Kopiraj stavke
        const originalItems = await connection.execute(`
          SELECT product_id, quantity, unit_price, discount_percent, line_total
          FROM offer_items WHERE offer_id = ?
        `, [id]);

        for (const item of originalItems[0]) {
          await connection.execute(`
            INSERT INTO offer_items (offer_id, product_id, quantity, unit_price, discount_percent, line_total)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [newOfferId, item.product_id, item.quantity, item.unit_price, item.discount_percent, item.line_total]);
        }

        // Ažuriraj ukupne iznose nove ponude
        await this.recalculateOffer(connection, newOfferId);

        // Sačuvaj vezu između originalne i revizije
        const revisionNumber = await connection.execute(`
          SELECT COALESCE(MAX(revision_number), 0) + 1 as next_revision
          FROM offer_revisions WHERE original_offer_id = ?
        `, [id]);

        await connection.execute(`
          INSERT INTO offer_revisions (original_offer_id, revision_offer_id, revision_number)
          VALUES (?, ?, ?)
        `, [id, newOfferId, revisionNumber[0][0].next_revision]);

        // Vrati novu ponudu
        const newOffer = await this.getOfferWithItems(newOfferId);
        res.status(201).json(newOffer);
      });
    } catch (error) {
      console.error('Create revision error:', error);
      res.status(500).json({ error: 'Greška servera' });
    }
  }

  async generatePDF(req, res) {
    try {
      const { id } = req.params;

      // Proveri da li ponuda postoji
      const offer = await this.getOfferWithItems(id);
      if (!offer) {
        return res.status(404).json({ error: 'Ponuda nije pronađena' });
      }

      // Proveri vlasništvo ponude (osim admin-a)
      if (req.user.role !== 'admin' && offer.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Nemate dozvolu da generirate PDF za ovu ponudu' });
      }

      // Učitaj podatke o firmi
      const companyInfo = await db.query('SELECT * FROM company_info LIMIT 1');
      const company = companyInfo[0] || {};

      const html = await this.generateOfferHTML(offer, company);
      
      const browser = await puppeteer.launch({ headless: 'new' });
      const page = await browser.newPage();
      
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
      });
      
      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="ponuda-${offer.offer_number}.pdf"`);
      res.send(pdf);
    } catch (error) {
      console.error('Generate PDF error:', error);
      res.status(500).json({ error: 'Greška pri generisanju PDF-a' });
    }
  }

  // Pomoćne funkcije
  async recalculateOffer(connection, offerId) {
    // Izračunaj ukupne iznose
    const totals = await connection.execute(`
      SELECT 
        SUM(line_total) as total_amount,
        SUM(quantity * unit_price * discount_percent / 100) as total_discount
      FROM offer_items 
      WHERE offer_id = ?
    `, [offerId]);

    const totalAmount = totals[0][0].total_amount || 0;
    const totalDiscount = totals[0][0].total_discount || 0;

    // Dobij tax_rate za ponudu
    const offerData = await connection.execute('SELECT tax_rate FROM offers WHERE id = ?', [offerId]);
    const taxRate = offerData[0][0].tax_rate || 20;

    const totalWithTax = totalAmount * (1 + taxRate / 100);

    // Ažuriraj ponudu
    await connection.execute(`
      UPDATE offers 
      SET total_amount = ?, total_discount = ?, total_with_tax = ?
      WHERE id = ?
    `, [totalAmount, totalDiscount, totalWithTax, offerId]);
  }

  async getOfferWithItems(offerId) {
    const offers = await db.query(`
      SELECT o.*, c.company_name, c.address as client_address, c.city as client_city,
             c.email as client_email, c.phone as client_phone, c.mb as client_mb, c.pib as client_pib,
             u.first_name, u.last_name
      FROM offers o
      JOIN clients c ON o.client_id = c.id
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `, [offerId]);

    if (offers.length === 0) return null;

    const items = await db.query(`
      SELECT oi.*, p.code, p.name as product_name, p.description as product_description,
             p.manufacturer, p.model
      FROM offer_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.offer_id = ?
      ORDER BY oi.id
    `, [offerId]);

    const offer = offers[0];
    offer.items = items;
    return offer;
  }

  async generateOfferHTML(offer, company) {
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('sr-RS', {
        style: 'currency',
        currency: 'RSD',
        minimumFractionDigits: 2
      }).format(amount);
    };

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('sr-RS');
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Ponuda ${offer.offer_number}</title>
        <style>
            body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 30px; }
            .company-info { margin-bottom: 20px; }
            .offer-info { margin-bottom: 20px; }
            .client-info { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .totals { width: 300px; margin-left: auto; }
            .footer { margin-top: 30px; font-size: 10px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>PONUDA</h1>
            <h2>Broj: ${offer.offer_number}</h2>
        </div>

        <div class="company-info">
            <h3>${company.name || 'ISW Trading d.o.o.'}</h3>
            <p>${company.address || 'Bulevar Oslobođenja 123, 11000 Beograd'}</p>
            <p>PIB: ${company.pib || '123456789'} | MB: ${company.mb || '987654321'}</p>
            ${company.phones ? `<p>Tel: ${JSON.parse(company.phones).join(', ')}</p>` : ''}
            ${company.emails ? `<p>Email: ${JSON.parse(company.emails).join(', ')}</p>` : ''}
        </div>

        <div class="offer-info">
            <p><strong>Datum:</strong> ${formatDate(offer.created_at)}</p>
            <p><strong>Kreirao:</strong> ${offer.first_name} ${offer.last_name}</p>
        </div>

        <div class="client-info">
            <h3>Kupac:</h3>
            <p><strong>${offer.company_name}</strong></p>
            <p>${offer.client_address}</p>
            <p>${offer.client_city}</p>
            <p>PIB: ${offer.client_pib || ''} | MB: ${offer.client_mb || ''}</p>
            <p>Tel: ${offer.client_phone || ''} | Email: ${offer.client_email || ''}</p>
        </div>

        <table>
            <thead>
                <tr>
                    <th>R.br.</th>
                    <th>Šifra</th>
                    <th>Naziv</th>
                    <th>Proizvođač</th>
                    <th>Količina</th>
                    <th>Jed. cena</th>
                    <th>Rabat %</th>
                    <th>Ukupno</th>
                </tr>
            </thead>
            <tbody>
                ${offer.items.map((item, index) => `
                    <tr>
                        <td class="text-center">${index + 1}</td>
                        <td>${item.code}</td>
                        <td>${item.product_name}</td>
                        <td>${item.manufacturer || ''}</td>
                        <td class="text-right">${item.quantity}</td>
                        <td class="text-right">${formatCurrency(item.unit_price)}</td>
                        <td class="text-right">${item.discount_percent}%</td>
                        <td class="text-right">${formatCurrency(item.line_total)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <table class="totals">
            <tr>
                <td><strong>Ukupno bez PDV:</strong></td>
                <td class="text-right"><strong>${formatCurrency(offer.total_amount)}</strong></td>
            </tr>
            <tr>
                <td><strong>PDV (${offer.tax_rate}%):</strong></td>
                <td class="text-right"><strong>${formatCurrency(offer.total_with_tax - offer.total_amount)}</strong></td>
            </tr>
            <tr>
                <td><strong>UKUPNO SA PDV:</strong></td>
                <td class="text-right"><strong>${formatCurrency(offer.total_with_tax)}</strong></td>
            </tr>
        </table>

        <div class="footer">
            <p>Ponuda je važeća 30 dana od datuma izdavanja.</p>
            <p>Cene su izražene u RSD.</p>
        </div>
    </body>
    </html>
    `;
  }
}

module.exports = new OfferController();
