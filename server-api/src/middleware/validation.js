const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validacija nije uspešna', 
        details: error.details.map(detail => detail.message) 
      });
    }
    next();
  };
};

// Validation schemas
const schemas = {
  login: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required()
  }),

  user: Joi.object({
    first_name: Joi.string().max(100).required(),
    last_name: Joi.string().max(100).required(),
    username: Joi.string().max(50).required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().max(20).allow(''),
    role: Joi.string().valid('admin', 'user').default('user')
  }),

  userUpdate: Joi.object({
    first_name: Joi.string().max(100),
    last_name: Joi.string().max(100),
    phone: Joi.string().max(20).allow(''),
    role: Joi.string().valid('admin', 'user')
  }),

  client: Joi.object({
    company_name: Joi.string().max(200).required(),
    address: Joi.string().allow(''),
    city: Joi.string().max(100).allow(''),
    email: Joi.string().email().max(150).allow(''),
    phone: Joi.string().max(20).allow(''),
    mb: Joi.string().max(20).allow(''),
    pib: Joi.string().max(20).allow('')
  }),

  product: Joi.object({
    code: Joi.string().max(50).required(),
    name: Joi.string().max(200).required(),
    description: Joi.string().allow(''),
    manufacturer: Joi.string().max(150).allow(''),
    model: Joi.string().max(100).allow(''),
    group_id: Joi.number().integer().allow(null),
    price: Joi.number().precision(2).min(0).required()
  }),

  productGroup: Joi.object({
    name: Joi.string().max(100).required(),
    description: Joi.string().allow('')
  }),

  offer: Joi.object({
    client_id: Joi.number().integer().required(),
    tax_rate: Joi.number().precision(2).min(0).max(100).default(20)
  }),

  offerItem: Joi.object({
    product_id: Joi.number().integer().required(),
    quantity: Joi.number().precision(2).min(0.01).required(),
    unit_price: Joi.number().precision(2).min(0).required(),
    discount_percent: Joi.number().precision(2).min(0).max(100).default(0)
  }),

  companyInfo: Joi.object({
    name: Joi.string().max(200).required(),
    address: Joi.string().allow(''),
    pib: Joi.string().max(20).allow(''),
    mb: Joi.string().max(20).allow(''),
    phones: Joi.array().items(Joi.string()),
    emails: Joi.array().items(Joi.string().email()),
    bank_accounts: Joi.array().items(Joi.string())
  }),

  incomingDocument: Joi.object({
    date_received: Joi.date().required(),
    company_name: Joi.string().max(200).required(),
    project_name: Joi.string().max(200).allow(''),
    pdf_link: Joi.string().max(500).allow(''),
    notes: Joi.string().allow('')
  })
};

module.exports = { validateRequest, schemas };
