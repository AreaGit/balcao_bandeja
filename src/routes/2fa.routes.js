const express = require("express");
const router = express.Router();
const { verify2FACode } = require("../controllers/2fa.controllers");
const Cart = require("../models/cart.model");

router.post("/verify-2fa", async (req, res, next) => {
  try {
    const { code } = req.body;
    const tempUser = req.session.tempUser;
    if (!tempUser) return res.status(400).json({ error: "Nenhum login em andamento" });

    await verify2FACode(tempUser.id, code);

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

    return res.json({ message: "Login efetuado com sucesso" });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});


module.exports = router;