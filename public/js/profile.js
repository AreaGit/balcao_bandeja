const cartBtn = document.getElementById("cartBtn");
const cartSidebar = document.getElementById("cartSidebar");
const overlay = document.getElementById("overlay");
const closeCart = document.getElementById("closeCart");

cartBtn.addEventListener("click", () => {
  cartSidebar.classList.add("active");
  overlay.classList.add("active");
});

overlay.addEventListener("click", () => {
  cartSidebar.classList.remove("active");
  overlay.classList.remove("active");
});

closeCart.addEventListener("click", () => {
  cartSidebar.classList.remove("active");
  overlay.classList.remove("active");
});

// Menu hambúrguer
const menuToggle = document.getElementById("menuToggle");
const menuList = document.getElementById("menuList");

menuToggle.addEventListener("click", () => {
  menuList.classList.toggle("active");
});

// Mobile: clique abre/fecha subcategorias
const submenuParents = document.querySelectorAll(".has-submenu");

submenuParents.forEach(item => {
  item.addEventListener("click", (e) => {
    if (window.innerWidth <= 768) {
      e.preventDefault();

      // Fecha outros abertos
      submenuParents.forEach(el => {
        if (el !== item) el.classList.remove("open");
      });

      // Alterna submenu atual
      item.classList.toggle("open");
    }
  });
});

let currentCartId;

// === Renderizar Carrinho e carregar dados ===
async function renderCart() {
  try {
    const meRes = await fetch("/api/me");
    const meData = await meRes.json();

    let userId;
    let guestId;

    if (meData.loggedIn) {
      document.getElementById("logged").style.display = "block";
      document.getElementById("nameUser").textContent = meData.user.name;
      userId = meData.user.id;
    } else {
      document.getElementById("notLoggedIn").style.display = "block";
      guestId = meData.guestId || "anon-" + Date.now();
    }

    const cartRes = await fetch(`/api/cart/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, guestId })
    });

    const cart = await cartRes.json(); // CORREÇÃO: usar cart direto, não cart.cart

    currentCartId = cart.id;

    const cartItemsContainer = document.getElementById("cartItemsContainer");
    const subtotalEl = document.getElementById("cartSubtotal");
    const discountEl = document.getElementById("cartDiscount");
    const totalEl = document.getElementById("cartTotal");
    const countEl = document.getElementById("cartCount");

    cartItemsContainer.innerHTML = "";

    if (!cart?.items || cart.items.length === 0) {
      cartItemsContainer.innerHTML = "<p>Seu carrinho está vazio</p>";
    } else {
      cart.items.forEach(item => {
        const div = document.createElement("div");
        div.classList.add("cart-item");
        div.innerHTML = `
          <img src="${item.imagem || "../assets/no-image.png"}" alt="${item.nome}" style="width:50px;height:50px;object-fit:cover;margin-right:10px;">
          <div class="info">
            <p><strong>${item.nome}</strong></p>
            <p>Qtd: 
              <input type="number" min="1" value="${item.quantidade}" data-id="${item.id}" class="update-qty">
            </p>
            <p>Preço: R$ ${(item.precoUnitario * item.quantidade).toFixed(2).replace(".", ",")}</p>
            <button class="remove-item" data-id="${item.id}">Remover</button>
          </div>
        `;
        cartItemsContainer.appendChild(div);
      });
    }

    subtotalEl.textContent = `R$ ${cart.subtotal?.toFixed(2).replace(".", ",") || "0,00"}`;
    discountEl.textContent = `R$ ${cart.desconto?.toFixed(2).replace(".", ",") || "0,00"}`;
    totalEl.textContent = `R$ ${cart.totalFinal?.toFixed(2).replace(".", ",") || "0,00"}`;
    countEl.textContent = cart.items?.length || 0;
    countEl.dataset.count = cart.items?.length || 0;

    // Atualizar quantidade
    document.querySelectorAll(".update-qty").forEach(input => {
      input.addEventListener("change", e => {
        const id = e.target.dataset.id;
        const qty = parseInt(e.target.value);
        updateCartItem(id, qty);
      });
    });

    // Remover item
    document.querySelectorAll(".remove-item").forEach(btn => {
      btn.addEventListener("click", e => {
        const id = e.target.dataset.id;
        removeCartItem(id);
      });
    });

  } catch (err) {
    console.error("Erro ao carregar/renderizar carrinho:", err);
  }
}

// === Adicionar, atualizar e remover itens ===
async function addToCart(productId, quantity = 1) {
  const res = await fetch("/api/cart/item", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cartId: currentCartId, productId, quantity })
  });
  const cart = await res.json();
  renderCart(cart);
}

async function updateCartItem(itemId, quantity) {
  const res = await fetch(`/api/cart/item/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity })
  });
  const cart = await res.json();
  renderCart();
}

async function removeCartItem(itemId) {
  const res = await fetch(`/api/cart/item/${itemId}`, { method: "DELETE" });
  const cart = await res.json();
  renderCart();
}

renderCart();

document.getElementById('checkoutBtn').addEventListener("click", () => {
  location.href = "/checkout";
});

document.getElementById("logged").addEventListener("click", () => {
  location.href = "/profile";
});

// Alternar abas
const tabs = document.querySelectorAll(".tab-btn");
const contents = document.querySelectorAll(".tab-content");

tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(btn => btn.classList.remove("active"));
    contents.forEach(content => content.classList.remove("active"));

    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

// Validação do formulário
const profileForm = document.querySelector(".profile-form");


// Modal Pedido
const modal = document.getElementById("orderModal");
const closeModal = document.getElementById("closeModal");
const detailButtons = document.querySelectorAll(".btn-details");

detailButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    modal.classList.add("active");
  });
});

closeModal.addEventListener("click", () => {
  modal.classList.remove("active");
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.classList.remove("active");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  carregarPerfil();

  const cepInput = document.getElementById("cep");
  const phoneInput = document.getElementById("phone");

  // Máscara para CEP
  cepInput.addEventListener("input", () => {
    let v = cepInput.value.replace(/\D/g, "");
    if (v.length > 5) {
      v = v.replace(/^(\d{5})(\d)/, "$1-$2");
    }
    cepInput.value = v.slice(0, 9); // limita a 9 caracteres (00000-000)
  });

  cepInput.addEventListener("blur", () => {
    const cep = cepInput.value.replace(/\D/g, "");
    if (cep.length === 8) buscarCep(cep);
  });

  // Máscara para telefone
  phoneInput.addEventListener("input", () => {
    let v = phoneInput.value.replace(/\D/g, "");
    if (v.length > 10) {
      v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else {
      v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    }
    phoneInput.value = v;
  });

  document.querySelector(".profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    salvarPerfil();
  });
});

async function buscarCep(cep) {
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();

    if (data.erro) {
      alert("CEP não encontrado");
      return;
    }

    document.getElementById("rua").value = data.logradouro || "";
    document.getElementById("bairro").value = data.bairro || "";
    document.getElementById("cidade").value = data.localidade || "";
    document.getElementById("estado").value = data.uf || "";
    document.getElementById("numero").value = "";
  } catch (err) {
    console.error("Erro ao buscar CEP:", err);
  }
}

// === Carregar perfil ===
async function carregarPerfil() {
  try {
    const res = await fetch("/api/users/profile");
    const data = await res.json();

    if (!data.loggedIn) {
      location.href = "/login"; // redireciona se não estiver logado
      return;
    }

    const u = data.user.usuario;

    const endereco = `${u.rua || ""} ${u.numero || ""}, ${u.bairro || ""} - ${u.cidade || ""} - ${u.estado || ""} - ${u.cep || ""}`;

    document.getElementById("name").value = u.nome || "";
    document.getElementById("email").value = u.email || "";
    document.getElementById("phone").value = u.celular || "";
    document.getElementById("rua").value = u.rua || "";
    document.getElementById("numero").value = u.numero || "";
    document.getElementById("bairro").value = u.bairro || "";
    document.getElementById("cidade").value = u.cidade || "";
    document.getElementById("estado").value = u.estado || "";
    document.getElementById("cep").value = u.cep || "";
  } catch (err) {
    console.error("Erro ao carregar perfil:", err);
  }
}

// === Salvar perfil ===
async function salvarPerfil () {
  const dados = {
    nome: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    celular: document.getElementById("phone").value.trim(),
    rua: document.getElementById("rua").value.trim(),
    numero: document.getElementById("numero").value.trim(),
    bairro: document.getElementById("bairro").value.trim(),
    cidade: document.getElementById("cidade").value.trim(),
    estado: document.getElementById("estado").value.trim(),
    cep: document.getElementById("cep").value.trim(),
    senha: document.getElementById("password").value.trim()
  };

  try {
    const res = await fetch("/api/users/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados)
    });

    const result = await res.json();

    if (res.ok) {
      alert("Perfil atualizado com sucesso!");
      carregarPerfil();
      window.location.reload();
    } else {
      alert(result.message || "Erro ao atualizar perfil");
    }
  } catch (err) {
    console.error("Erro:", err);
  }
};

// === Carregar pedidos ===
async function carregarPedidos() {
  try {
    const res = await fetch("/api/pedidos/me");
    if (!res.ok) throw new Error("Erro ao buscar pedidos");

    const pedidos = await res.json();
    const container = document.querySelector(".orders-list");
    container.innerHTML = "";

    if (!pedidos.length) {
      container.innerHTML = "<p>Você ainda não fez nenhum pedido.</p>";
      return;
    }

    pedidos.forEach(pedido => {
      const dataPedido = new Date(pedido.createdAt).toLocaleDateString("pt-BR");
      const pedidoHTML = `
        <div class="order-card">
          <h4>Pedido #${pedido.id}</h4>
          <p>Status: <span class="status ${pedido.status.toLowerCase()}">${pedido.status}</span></p>
          <p>Data: ${dataPedido}</p>
          <p>Total: R$ ${pedido.total.replace(".", ",")}</p>
          <button class="btn-details" data-id="${pedido.id}">Ver detalhes</button>
        </div>
      `;
      container.insertAdjacentHTML("beforeend", pedidoHTML);
    });

    document.querySelectorAll(".btn-details").forEach(btn => {
      btn.addEventListener("click", () => abrirPedido(btn.dataset.id));
    });
  } catch (err) {
    console.error("Erro ao carregar pedidos:", err);
  }
}

// === Abrir pedido no modal ===
async function abrirPedido(pedidoId) {
   try {
    const res = await fetch(`/api/pedidos/${pedidoId}`);
    if (!res.ok) throw new Error("Erro ao carregar pedido");

    const pedido = await res.json();

    const modal = document.getElementById("orderModal");
    const modalItens = modal.querySelector(".order-items");
    const modalResumo = modal.querySelector(".order-summary");
    modalItens.innerHTML = pedido.itens
      .map(item => `
        <div class="order-item">
          <img src="${item.produto.imagens[0] || '/assets/no-image.png'}" alt="${item.produto.nome}">
          <div>
            <p><strong>${item.produto.nome}</strong></p>
            <p>Quantidade: ${item.quantidade}</p>
            <p>Preço unitário: R$ ${item.precoUnitario.replace(".", ",")}</p>
          </div>
        </div>
      `).join("");
        console.log(pedido.frete)
        const freteObj = typeof pedido.frete === "string" ? JSON.parse(pedido.frete) : pedido.frete;
        modalResumo.innerHTML = `
          <p><strong>Tipo de frete:</strong> ${freteObj?.name || "Não informado"}</p>
          <p><strong>Transportadora:</strong> ${freteObj?.company?.name || "Não informado"}</p>
          <p><strong>Valor do frete:</strong> R$ ${freteObj?.price ? freteObj.price.replace(".", ",") : "0,00"}</p>
          <p><strong>Prazo de entrega:</strong> ${freteObj?.delivery_range?.min ? `${freteObj.delivery_range.min} a ${freteObj.delivery_range.max} dias úteis` : "Não informado"}</p>
          <p><strong>Total:</strong> R$ ${pedido.total.replace(".", ",")}</p>
        `;

    modal.classList.add("active");
  } catch (err) {
    console.error("Erro ao abrir detalhes do pedido:", err);
  }
}

// === Fechar modal ===
document.getElementById("closeModal").addEventListener("click", () => {
  document.getElementById("orderModal").classList.remove("active");
});

// Iniciar
carregarPerfil();
carregarPedidos();

document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    const res = await fetch("/api/users/logout", { method: "POST" });
    const data = await res.json();

    if (data.success) {
      alert("Você saiu da sua conta!");
      location.href = "/login"; // redireciona
    } else {
      alert("Erro ao fazer logout.");
    }
  } catch (err) {
    console.error("Erro no logout:", err);
  }
});

const searchInput = document.getElementById("searchInput");
const autocompleteList = document.getElementById("autocompleteList");

let debounceTimeout;

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim();

  clearTimeout(debounceTimeout);
  if (!query) {
    autocompleteList.innerHTML = "";
    return;
  }

  debounceTimeout = setTimeout(() => {
    searchProducts(query);
  }, 300); // debounce para reduzir requisições
});

async function searchProducts(query) {
  try {
    const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
    const products = await res.json();

    if (products.length) {
      autocompleteList.innerHTML = products.map(p => `
        <div class="autocomplete-item" data-id="${p.id}">
          <img src="${p.imagens?.[0] || '/assets/no-image.png'}" alt="${p.nome}">
          <span>${p.nome}</span>
        </div>
      `).join("");
      autocompleteList.classList.add("active");
    } else {
      autocompleteList.innerHTML = "<div class='autocomplete-empty'>Nenhum produto encontrado</div>";
      autocompleteList.classList.add("active");
    }

    document.querySelectorAll(".autocomplete-item").forEach(item => {
      item.addEventListener("click", () => {
        const productId = item.dataset.id;
        location.href = `/detalhes-produto?id=${productId}`;
      });
    });
  } catch (err) {
    console.error(err);
    autocompleteList.innerHTML = "<div class='autocomplete-empty'>Erro ao buscar produtos</div>";
    autocompleteList.classList.add("active");
  }
}

// Ocultar lista ao clicar fora
document.addEventListener("click", (e) => {
  if (!searchInput.contains(e.target) && !autocompleteList.contains(e.target)) {
    autocompleteList.classList.remove("active");
  }
});