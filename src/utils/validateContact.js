const { body, validationResult } = require("express-validator");

const validators = [
  body("nome").trim().isLength({ min: 2, max: 120 }).withMessage("Nome inválido."),
  body("email").trim().isEmail().isLength({ max: 160 }).withMessage("Email inválido."),
  body("assunto").trim().isLength({ min: 3, max: 160 }).withMessage("Assunto inválido."),
  body("mensagem").trim().isLength({ min: 10, max: 5000 }).withMessage("Mensagem muito curta."),
];

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  return next();
}

module.exports = { validators, handleValidation };
