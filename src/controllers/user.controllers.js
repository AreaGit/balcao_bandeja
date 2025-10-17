// src/controllers/user.controllers.js
const User = require("../models/user.model");
const bcrypt = require("bcrypt");

// GET /api/users/profile
exports.profile = async (req, res) => {
  try {
    const userId = req.session.user?.id;

    if (!userId) {
      return res.json({ loggedIn: false });
    }

    const user = await User.findByPk(userId);

    if (!user) {
      return res.json({ loggedIn: false });
    }

    return res.json({
      loggedIn: true,
      user: {
        usuario: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          cpf: user.cpf,
          celular: user.celular,
          telefoneFixo: user.telefoneFixo,
          sexo: user.sexo,
          dataNascimento: user.dataNascimento,
          rua: user.rua,
          numero: user.numero,
          complemento: user.complemento,
          referencia: user.referencia,
          bairro: user.bairro,
          cidade: user.cidade,
          estado: user.estado,
          cep: user.cep,
          customer_asaas_id: user.customer_asaas_id
        }
      }
    });
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);
    return res.status(500).json({ message: "Erro ao carregar perfil" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ message: "Não autorizado" });

    const { nome, email, celular, rua, numero, bairro, cidade, estado, cep, senha } = req.body;

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "Usuário não encontrado" });

    user.nome = nome;
    user.email = email;
    user.celular = celular;
    user.rua = rua;
    user.numero = numero;
    user.bairro = bairro;
    user.cidade = cidade;
    user.estado = estado;
    user.cep = cep;

    if (senha) {
      user.senha = await bcrypt.hash(senha, 10);
    }

    await user.save();

    res.json({ message: "Perfil atualizado com sucesso" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Erro ao atualizar perfil", error });
  }
};
// === Logout ===
exports.logout = async (req, res) => {
  try {
    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ message: "Erro ao encerrar sessão" });
      }
      res.clearCookie("connect.sid"); // limpa cookie da sessão
      return res.json({ success: true, message: "Logout realizado com sucesso" });
    });
  } catch (error) {
    return res.status(500).json({ message: "Erro no logout", error });
  }
};