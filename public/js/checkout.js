document.addEventListener("DOMContentLoaded", () => {
  carregarDados();
});

let freteSelecionado = null;
let currentCartItems = [];
let valorDoFrete = 0;
let currentCartId = null;
let selectedPayment = "";
let currentCart = null;
let currentStep = 1;
let endereco;
let cart;

// Máscara telefone
document.getElementById("telefone").addEventListener("input", (e) => {
  let value = e.target.value.replace(/\D/g, "");
  if (value.length > 11) value = value.slice(0, 11);

  if (value.length > 10) value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
  else if (value.length > 6) value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
  else if (value.length > 2) value = value.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  else value = value.replace(/^(\d*)/, "($1");
  e.target.value = value;
});

document.getElementById("cep").addEventListener("input", (e) => {
  // Máscara CEP
  e.target.value = e.target.value.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2");
});

// Buscar endereço pelo CEP
async function buscarEndereco() {
  const cep = document.getElementById("cep").value.replace(/\D/g, "");
  if (cep.length !== 8) return;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();
    if (data.erro) { alert("CEP não encontrado!"); return; }

    document.getElementById("endereco").value = data.logradouro || "";
    document.getElementById("cidade").value = data.localidade || "";
    document.getElementById("estado").value = data.uf || "";

    await buscarFreteBackend(cep);
  } catch (err) {
    console.error("Erro ao buscar CEP:", err);
  }
}

// Buscar frete
async function buscarFreteBackend(cepDestino) {
  try {
    if (!currentCartItems.length) return;

    const produtos = currentCartItems.map(item => ({
      id: String(item.productId || item.id),
      width: Number(item.largura || 10),
      height: Number(item.altura || 10),
      length: Number(item.comprimento || 10),
      weight: Number(item.peso || 1),
      insurance_value: Number(item.precoUnitario || 0),
      quantity: Number(item.quantidade || 1)
    }));

    const res = await fetch("/api/frete/cotacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postal_codeTo: cepDestino, products: produtos })
    });

    if (!res.ok) throw new Error("Erro ao buscar frete");
    const data = await res.json();
    mostrarOpcoesFrete(data);
  } catch (err) {
    console.error("Erro ao calcular frete:", err);
    alert("Não foi possível calcular o frete.");
  }
}

// Mostrar opções de frete
function mostrarOpcoesFrete(fretes) {
  const section = document.getElementById("frete-section");
  const divOpcoes = document.getElementById("frete-opcoes");
  divOpcoes.innerHTML = "";

  if (!fretes || !Array.isArray(fretes)) { section.style.display = "none"; return; }

  const opcoesValidas = fretes.filter(frete =>
    Number(frete.price) > 0 && 
    frete.delivery_time && 
    frete.delivery_time > 0 && 
    frete.company?.name !== 'Jadlog' && 
    frete.company?.name !== 'Azul'
  );

  if (!opcoesValidas.length) { section.style.display = "none"; return; }

  opcoesValidas.forEach(frete => {
    const div = document.createElement("div");
    div.classList.add("frete-opcao");
    div.innerHTML = `
      <p>
        <img src="${frete.company?.picture || ''}" alt="${frete.company?.name || ''}" width="24" style="vertical-align:middle; margin-right:6px;">
        <strong>${frete.company?.name || ''} - ${frete.name || ''}</strong>
      </p>
      <p>Preço: R$ ${parseFloat(frete.price).toFixed(2).replace(".", ",")}</p>
      <p>Prazo: ${frete.delivery_time} dias úteis</p>
    `;
    div.onclick = () => selecionarFrete(frete, div);
    divOpcoes.appendChild(div);
  });

  section.style.display = opcoesValidas.length ? "block" : "none";
}

function selecionarFrete(frete, el) {
  document.querySelectorAll(".frete-opcao").forEach(op => op.classList.remove("active"));
  el.classList.add("active");

  freteSelecionado = frete;
  valorDoFrete = Number(frete.price || frete.custom_price || 0);
  atualizarResumoCheckout();
}

// Atualizar resumo
function atualizarResumoCheckout() {
  const resumoBox = document.querySelector(".summary");
  if (!resumoBox) return;

  resumoBox.innerHTML = "<h3>Resumo do Pedido</h3>";
  let subtotal = 0;
  currentCartItems.forEach(item => {
    const preco = Number(item.precoUnitario || 0) * (item.quantidade || 0);
    subtotal += preco;
    resumoBox.innerHTML += `
      <div class="summary-item">
        <span>${item.nome} x ${item.quantidade}</span>
        <span>R$ ${preco.toFixed(2).replace(".", ",")}</span>
      </div>`;
  });

  // 🟡 DESCONTO DO CUPOM
  const descontoCupom = Number(currentCart?.desconto || 0);

  let total = subtotal - descontoCupom + valorDoFrete;
  let descontoPix = 0;

  if (selectedPayment === "Pix") {
    descontoPix = total * 0.03;
    total -= descontoPix;
  }

  resumoBox.innerHTML += `
    ${descontoCupom > 0 ? `<div class="summary-item desconto"><span>Cupom de desconto</span><span>-R$ ${descontoCupom.toFixed(2).replace(".", ",")}</span></div>` : ""}
    <div class="summary-item"><span>Frete</span><span>R$ ${valorDoFrete.toFixed(2).replace(".", ",")}</span></div>
    ${descontoPix > 0 ? `<div class="summary-item desconto"><span>Desconto PIX (3%)</span><span>-R$ ${descontoPix.toFixed(2).replace(".", ",")}</span></div>` : ""}
    <div class="summary-total"><span>Total</span><span>R$ ${total.toFixed(2).replace(".", ",")}</span></div>
  `;
}

// Controle de etapas
function nextStep(step) {
  if (step === 2) {
    if (!document.getElementById("nome").value.trim() ||
        !document.getElementById("email").value.trim() ||
        !document.getElementById("telefone").value.trim()) {
      alert("Preencha Nome, Email e Telefone.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(document.getElementById("email").value.trim())) {
      alert("Digite um email válido.");
      return;
    }

    const telRegex = /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/;
    if (!telRegex.test(document.getElementById("telefone").value.trim())) {
      alert("Digite um telefone válido.");
      return;
    }
  }

  if (step === 3 && !freteSelecionado) {
    alert("Selecione uma opção de frete antes de continuar.");
    return;
  }

  currentStep = step;
  atualizarResumoCheckout();
  updateSteps();
}

function prevStep(step) {
  atualizarResumoCheckout();
  currentStep = step;
  updateSteps();
}

function updateSteps() {
  document.querySelectorAll(".step").forEach(s => s.classList.remove("active"));
  document.getElementById("step-" + currentStep).classList.add("active");

  document.querySelectorAll(".progress-step").forEach(p => p.classList.remove("active"));
  for (let i = 1; i <= currentStep; i++) document.getElementById("progress-" + i).classList.add("active");

  const fill = document.getElementById("progress-fill");
  fill.style.width = ((currentStep - 1) / 2) * 100 + "%";

  if (currentStep === 3) preencherStep3();
}

// Seleção pagamento
function selectPayment(el, metodo) {
  document.querySelectorAll(".payment-option").forEach(p => p.classList.remove("active"));
  el.classList.add("active");
  selectedPayment = metodo;

  document.getElementById("card-form").classList.toggle("active", metodo === "Cartão");
}

// Step 3 — Preencher resumo final
function preencherStep3() {
  const enderecoHtml = `${document.getElementById("nome").value}, ${document.getElementById("endereco").value}, ${document.getElementById("cidade").value} - ${document.getElementById("estado").value}, CEP: ${document.getElementById("cep").value}`;
  document.getElementById("review-endereco").innerText = enderecoHtml;
  document.getElementById("review-pagamento").innerText = selectedPayment || "Não selecionado";

  endereco = enderecoHtml;
  let subtotal = 0;
  let descontoPix = 0;

  // 🧾 Itens do carrinho
  const resumoItens = currentCartItems.map(item => {
    const precoTotal = Number(item.precoUnitario || 0) * (item.quantidade || 0);
    return `
      <div class="summary-item">
        <span>${item.nome} x ${item.quantidade}</span>
        <span>R$ ${precoTotal.toFixed(2).replace(".", ",")}</span>
      </div>
    `;
  }).join("");

  // 🧮 Subtotal
  subtotal = currentCartItems.reduce((acc, item) => {
    return acc + (Number(item.precoUnitario || 0) * (item.quantidade || 0));
  }, 0);

  // 🟡 Desconto do cupom (vindo do backend)
  const descontoCupom = Number(currentCart?.desconto || 0);
  const nomeCupom = currentCart?.cupom || currentCart?.discountCode || null;

  // 🧮 Total base
  let total = subtotal - descontoCupom + valorDoFrete;

  // 💸 Desconto Pix
  if (selectedPayment === "Pix") {
    descontoPix = total * 0.03;
    total -= descontoPix;
  }

  atualizarResumoCheckout();

  // 🧾 HTML do resumo com cupom + frete + PIX
  const resumoHtml = `
    ${resumoItens}
    <div class="summary-item">
      <span>Frete</span>
      <span>R$ ${valorDoFrete.toFixed(2).replace(".", ",")}</span>
    </div>

    ${descontoCupom > 0 ? `
      <div class="summary-item desconto">
        <span>Cupom ${nomeCupom ? `(${nomeCupom})` : ""}</span>
        <span>-R$ ${descontoCupom.toFixed(2).replace(".", ",")}</span>
      </div>
    ` : ""}

    ${selectedPayment === "Pix" ? `
      <div class="summary-item desconto">
        <span>Desconto Pix (3%)</span>
        <span>-R$ ${descontoPix.toFixed(2).replace(".", ",")}</span>
      </div>
      <div class="summary-total destaque">
        <span>Total com desconto Pix</span>
        <span>R$ ${total.toFixed(2).replace(".", ",")}</span>
      </div>
    ` : `
      <div class="summary-total">
        <span>Total</span>
        <span>R$ ${total.toFixed(2).replace(".", ",")}</span>
      </div>
    `}
  `;

  document.getElementById("resumoStep3").innerHTML = `<h4>Resumo do Pedido</h4>${resumoHtml}`;
}

// Carregar dados iniciais
async function carregarDados() {
  try {
    const resUser = await fetch("/checkout/user");
    const userData = await resUser.json();
    if (userData) {
      document.getElementById("nome").value = userData.nome || "";
      document.getElementById("email").value = userData.email || "";
      document.getElementById("telefone").value = userData.celular || "";
      document.getElementById("endereco").value = userData.rua || "";
      document.getElementById("cidade").value = userData.cidade || "";
      document.getElementById("cep").value = userData.cep || "";
      document.getElementById("estado").value = userData.estado || "";
    }
    await carregarResumoPedido();
    await buscarEndereco();
  } catch (error) {
    console.error("Erro ao carregar dados do usuário:", error);
  }
}

// Carregar resumo do pedido
async function carregarResumoPedido() {
  try {
    const meRes = await fetch("/api/me");
    const meData = await meRes.json();
    let userId, guestId;
    if (meData.loggedIn) userId = meData.user.id;
    else guestId = meData.guestId || "anon-" + Date.now();

    const cartRes = await fetch(`/api/cart/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, guestId })
    });

    const cart = await cartRes.json();
    currentCart = cart;
    currentCartId = cart.id;
    currentCartItems = cart.items || [];

    atualizarResumoCheckout();

    const freteObj = cart.frete ? (typeof cart.frete === "string" ? JSON.parse(cart.frete) : cart.frete) : null;
    if (freteObj) {
      freteSelecionado = freteObj;
      valorDoFrete = Number(freteObj?.custom_price ?? freteObj?.price ?? 0);
      mostrarOpcoesFrete([freteObj]);
    }
  } catch (error) {
    console.error("Erro ao carregar resumo:", error);
  }
}

// === Finalizar Compra ===
document.getElementById("btnFinalizar").addEventListener("click", async () => {
  try {
    const res = await fetch("/api/me");
    const meData = await res.json();

    if (!meData.loggedIn) {
      window.location.href = "/login";
      return;
    }

    await finalizarCompra();
  } catch (error) {
    console.error("Erro ao verificar login:", error);
    alert("Ocorreu um erro. Tente novamente.");
  }
});

async function finalizarCompra() {
  try {
    const formaPagamento = selectedPayment;
    if (!formaPagamento) return alert("Selecione a forma de pagamento");

    if (!endereco || !freteSelecionado || !currentCartItems.length)
      return alert("Endereço, frete ou carrinho não definidos");

    // 🧮 Subtotal
    let subtotal = currentCartItems.reduce(
      (sum, item) => sum + Number(item.precoUnitario || 0) * Number(item.quantidade || 0),
      0
    );

    // 🏷️ Cupom aplicado
    const descontoCupom = Number(currentCart?.desconto || 0);
    const nomeCupom = currentCart?.cupom || currentCart?.discountCode || null;

    // 🧮 Total com desconto do cupom e frete
    let total = subtotal - descontoCupom + Number(valorDoFrete || 0);

    // 💸 Desconto adicional para PIX
    if (formaPagamento === "Pix") total = total * 0.97;

    // 🧾 Monta objeto de pedido com dados do cupom incluídos
    const pedidoData = {
      usuarioId: currentCart.userId,
      endereco,
      frete: freteSelecionado,
      itens: currentCartItems,
      total: total.toFixed(2),
      cupom: nomeCupom || null,
      descontoCupom: descontoCupom.toFixed(2),
    };

    // === PAGAMENTO VIA PIX ===
    if (formaPagamento === "Pix") {
      const response = await fetch("/checkout/gerar-pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedidoData),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao gerar PIX");

      abrirModalPix(result.qrCodeImageUrl, result.qrCodeText, result.valor, result.paymentId);
      monitorarPagamento(result.paymentId);
      return;
    }

    // === PAGAMENTO VIA BOLETO ===
    if (formaPagamento === "Boleto") {
      const response = await fetch("/checkout/gerar-boleto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pedidoData),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao gerar boleto");

      abrirModalBoleto(result);
      return;
    }

    // === PAGAMENTO VIA CARTÃO ===
    if (formaPagamento === "Cartão") {
      const cartao = {
        holderName: document.querySelector("#nomeCartao").value,
        number: document.querySelector("#numeroCartao").value.replace(/\s+/g, ""),
        expiryMonth: document.querySelector("#mesValidade").value,
        expiryYear: document.querySelector("#anoValidade").value,
        ccv: document.querySelector("#cvvCartao").value,
      };

      const res = await fetch("/checkout/gerar-cartao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuarioId: currentCart.userId,
          total,
          endereco,
          frete: freteSelecionado,
          cupom: nomeCupom || null,
          descontoCupom: descontoCupom.toFixed(2),
          cartao,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar pagamento");

      abrirModalCartao(data.value, data.paymentId);
      monitorarPagamentoCartao(data.paymentId);
    }
  } catch (error) {
    console.error("Erro ao finalizar pedido:", error);
    alert(error.message);
  }
}

// === Modal PIX ===
function abrirModalPix(qrCodeImageUrl, qrCodeText, valor, paymentId) {
  const modalHtml = `
    <div id="pixModal" class="pix-modal-overlay">
      <div class="pix-modal">
        <button id="fecharPixModal" class="pix-close">✖</button>
        <h3>Pagamento via PIX</h3>
        <p><strong>Valor:</strong> R$ ${Number(valor).toFixed(2).replace(".", ",")}</p>
        <img src="data:image/png;base64,${qrCodeImageUrl}" alt="QR Code PIX" class="pix-qrcode" />
        <p class="pix-instrucao">Escaneie o QR Code com seu aplicativo bancário ou copie o código abaixo:</p>
        <textarea id="pixCodeText" readonly>${qrCodeText}</textarea>
        <button id="copiarPixCode" class="pix-btn">Copiar Código PIX</button>
        <p id="pixStatus" class="pix-status">Aguardando pagamento...</p>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
  document.getElementById("copiarPixCode").addEventListener("click", () => {
    const text = document.getElementById("pixCodeText");
    text.select();
    document.execCommand("copy");
    alert("Código PIX copiado!");
  });
  document.getElementById("fecharPixModal").addEventListener("click", fecharModalPix);
}

function fecharModalPix() {
  const modal = document.getElementById("pixModal");
  if (modal) modal.remove();
}

// === Modal BOLETO ===
function abrirModalBoleto({ boletoUrl, linhaDigitavel, vencimento, valor, pedidoId }) {
  const modalHtml = `
    <div id="boletoModal" class="boleto-modal-overlay">
      <div class="boleto-modal">
        <h3>Pagamento via Boleto</h3>
        <p><strong>Valor:</strong> R$ ${Number(valor).toFixed(2).replace(".", ",")}</p>
        <p><strong>Vencimento:</strong> ${new Date(vencimento).toLocaleDateString()}</p>
        <p class="boleto-info">Copie o código abaixo ou clique para abrir o boleto:</p>
        <textarea id="linhaDigitavel" readonly>${linhaDigitavel}</textarea>
        <button id="copiarLinhaDigitavel" class="boleto-btn">Copiar Código</button>
        <a href="${boletoUrl}" target="_blank" class="boleto-btn boleto-view">Abrir Boleto</a>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);

  document.getElementById("copiarLinhaDigitavel").addEventListener("click", () => {
    const text = document.getElementById("linhaDigitavel");
    text.select();
    document.execCommand("copy");
    alert("Linha digitável copiada!");
  });

  setTimeout(() => {
    fecharModalBoleto();
    alert("Pedido criado! Aguardando pagamento do boleto.");
    localStorage.removeItem("carrinho");
    window.location.href = `/pedido-confirmado?pedidoId=${pedidoId}`;
  }, 10000);
}

function fecharModalBoleto() {
  const modal = document.getElementById("boletoModal");
  if (modal) modal.remove();
}

// === Modal CARTÃO ===
function abrirModalCartao(valor, paymentId) {
  const modalHtml = `
    <div id="cartaoModal" class="pix-modal-overlay">
      <div class="pix-modal">
        <button id="fecharCartaoModal" class="pix-close">✖</button>
        <h3>Pagamento com Cartão de Crédito</h3>
        <p><strong>Valor:</strong> R$ ${Number(valor).toFixed(2).replace(".", ",")}</p>
        <p id="cartaoStatus" class="pix-status">⏳ Aguardando confirmação...</p>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHtml);
  document.getElementById("fecharCartaoModal").addEventListener("click", fecharModalCartao);
}

function fecharModalCartao() {
  const modal = document.getElementById("cartaoModal");
  if (modal) modal.remove();
}

// === Monitorar pagamento PIX ===
function monitorarPagamento(paymentId) {
  const statusEl = document.getElementById("pixStatus");
  const interval = setInterval(async () => {
    try {
      const res = await fetch(`/asaas/consultar/${paymentId}`);
      const data = await res.json();
      const status = data.status?.toLowerCase();

      if (statusEl)
        statusEl.textContent = status === "received" || status === "confirmed"
          ? "✅ Pagamento confirmado!"
          : `⏳ Status: ${status}`;

      if (["received", "confirmed"].includes(status)) {
        clearInterval(interval);
        await finalizarPedido("PIX");
      }
    } catch (err) {
      console.error("Erro ao consultar status do PIX:", err);
    }
  }, 10000);
}

// === Monitorar pagamento CARTÃO ===
function monitorarPagamentoCartao(paymentId) {
  const statusEl = document.getElementById("cartaoStatus");
  const interval = setInterval(async () => {
    try {
      const res = await fetch(`/asaas/consultar/${paymentId}`);
      const data = await res.json();
      const status = data.status?.toLowerCase();

      if (statusEl)
        statusEl.textContent = status === "received" || status === "confirmed"
          ? "✅ Pagamento confirmado!"
          : `⏳ Status: ${status}`;

      if (["received", "confirmed"].includes(status)) {
        clearInterval(interval);
        await finalizarPedido("CARTAO");
      }
    } catch (err) {
      console.error("Erro ao consultar status do cartão:", err);
    }
  }, 10000);
}

// === Finalizar Pedido ===
async function finalizarPedido(formaPagamento) {
  try {
    if (!endereco || !freteSelecionado || !currentCartItems.length)
      return alert("Endereço, frete ou carrinho não definidos");

    // 🔹 Subtotal dos produtos
    let subtotal = currentCartItems.reduce(
      (sum, item) => sum + Number(item.precoUnitario || 0) * Number(item.quantidade || 0),
      0
    );

    // 🔹 Desconto do cupom
    const descontoCupom = Number(currentCart?.desconto || 0);
    const nomeCupom = currentCart?.cupom || currentCart?.discountCode || null;

    // 🔹 Soma frete
    let total = subtotal - descontoCupom + Number(valorDoFrete || 0);

    // 🔹 Desconto adicional do Pix
    if (formaPagamento === "Pix") total = total * 0.97;

    // 🔹 Monta o objeto do pedido
    const pedidoData = {
      usuarioId: Number(localStorage.getItem("usuarioId")) || currentCart.userId,
      endereco,
      frete: freteSelecionado,
      formaPagamento,
      total: total.toFixed(2),
      cupom: nomeCupom || null,
      descontoCupom: descontoCupom.toFixed(2),
      itens: currentCartItems.map(item => ({
        produtoId: item.productId || item.id,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        cor: item.cor || null
      }))
    };

    // 🔹 Envia para o backend
    const response = await fetch("/checkout/finalizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pedidoData)
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Erro ao finalizar pedido");

    alert("Pedido finalizado com sucesso!");
    localStorage.removeItem("carrinho");
    window.location.href = `/pedido-confirmado?pedidoId=${result.pedidoId}`;
  } catch (error) {
    console.error("Erro ao finalizar pedido:", error);
    alert(error.message);
  }
}

/*
// Finalizar compra
document.getElementById("btnFinalizar").addEventListener("click", async () => {
  try {
    const res = await fetch("/api/me");
    const meData = await res.json();

    if (!meData.loggedIn) {
      window.location.href = "/login";
      return;
    }

    await finalizarCompra();
  } catch (error) {
    console.error("Erro ao verificar login:", error);
    alert("Ocorreu um erro. Tente novamente.");
  }
});

async function finalizarCompra() {
  try {
    const formaPagamento = selectedPayment;
    if (!formaPagamento) {
      alert("Selecione a forma de pagamento");
      return;
    }

    if (!endereco || !freteSelecionado || !currentCartItems.length) {
      alert("Endereço, frete ou carrinho não definidos");
      return;
    }

    const total = currentCartItems.reduce(
      (sum, item) => sum + Number(item.precoUnitario || 0) * Number(item.quantidade || 0),
      0
    ) + Number(valorDoFrete || 0);

    const pedidoData = {
      usuarioId: Number(localStorage.getItem("usuarioId")) || currentCart.userId,
      endereco: endereco,
      frete: freteSelecionado,
      formaPagamento: formaPagamento,
      total: total.toFixed(2),
      itens: currentCartItems.map(item => ({
        produtoId: item.productId || item.id,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario
      }))
    };

    console.log("Dados enviados para finalizar:", pedidoData);

    const response = await fetch("/checkout/finalizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pedidoData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Não foi possível finalizar a compra");
    }

    alert("Pedido finalizado com sucesso!");
    localStorage.removeItem("carrinho");
    window.location.href = `/pedido-confirmado?pedidoId=${pedidoData.pedidoId}`;
  } catch (error) {
    console.error("Erro ao finalizar pedido:", error);
    alert(error.message);
  }
}
*/