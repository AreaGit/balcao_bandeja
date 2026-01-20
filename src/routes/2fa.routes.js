const express = require("express");
const router = express.Router();
const { verify2FACode, verify2FACodeAdmin } = require("../controllers/2fa.controllers");
const Cart = require("../models/cart.model");
const User = require("../models/user.model");
const Administrators = require("../models/administrators.model");

router.post("/verify-2fa", async (req, res) => {
  try {
    const { code, userId } = req.body;
    const tempUser = req.session.tempUser;
    if (!tempUser) return res.status(400).json({ error: "Nenhum login em andamento" });

    if (!code || !userId) {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    await verify2FACode(userId, code);

    await User.update(
      { is_verified: true },
      { where: { id: userId } }
    );

    // Salva o usuário real na sessão
    req.session.user = tempUser;
    delete req.session.tempUser;

    // Migra o carrinho do guest para o user
    const guestId = req.session.guestId;
    if (guestId) {
      const cart = await Cart.findOne({ where: { guestId } });

      if (cart) {
        // Atualiza o carrinho existente
        await cart.update({
          userId: tempUser.id,
          guestId: null
        });
      }
    }

    console.log("Usuário logado: ", req.session.user);

    return res.json({
      message: "Conta verificada com sucesso"
    });

  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.post("/verify-2fa-admin", async (req, res) => {
  try {
    const { code } = req.body;
    const tempUser = req.session.tempUser;

    if (!tempUser) {
      return res.status(400).json({ error: "Nenhum login em andamento" });
    }

    await verify2FACodeAdmin(tempUser.id, code);

    // 🕒 registra validação do 2FA
    await Administrators.update(
      { last_2fa_at: new Date() },
      { where: { id: tempUser.id } }
    );

    // 🔐 cria sessão admin
    req.session.admin = {
      id: tempUser.id,
      email: tempUser.email,
      nome: tempUser.nome
    };

    delete req.session.tempUser;

    return res.json({ message: "Login administrativo confirmado" });

  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});


module.exports = router;