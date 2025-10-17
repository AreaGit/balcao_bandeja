const bcrypt = require("bcrypt");
const User = require("../models/user.model");
const { send2FACode } = require("./2fa.controllers");
const { criarClienteAsaas } = require("../services/asaas.services");

const SALT_ROUNDS = 12;

async function register(req, res, next) {
  try {
    const {
      nome,
      email,
      senha,
      cpf,
      celular,
      telefoneFixo,
      sexo,
      dataNascimento,
      cep,
      rua,
      numero,
      complemento,
      referencia,
      bairro,
      cidade,
      estado
    } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }
    if (senha.length < 6) {
      return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
    }

    // já existe email?
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email já cadastrado" });
    }

    // hash da senha
    const hash = await bcrypt.hash(senha, SALT_ROUNDS);

    // cria usuário
    const user = await User.create({
      nome,
      email,
      senha: hash,
      cpf,
      celular,
      telefoneFixo,
      sexo,
      dataNascimento,
      cep,
      rua,
      numero,
      complemento,
      referencia,
      bairro,
      cidade,
      estado
    });

    // Criar cliente ASAAS
    const clienteAsaas = await criarClienteAsaas(user);

    // Salvar customer_asaas_id no banco
    user.customer_asaas_id = clienteAsaas.id;
    await user.save();

    return res.status(201).json({
      id: user.id,
      nome: user.nome,
      email: user.email
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ error: "Email e senha são obrigatórios" });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) return res.status(401).json({ error: "Credenciais inválidas" });

    // ❗ Aqui entra o 2FA
    await send2FACode(user); // envia código por email
    req.session.tempUser = { id: user.id, email: user.email, nome: user.nome }; // guarda temporário

    return res.json({ message: "Código de verificação enviado por email" });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    return res.json({ ok: true, message: "Logout feito" });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, logout };