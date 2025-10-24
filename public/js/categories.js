const cartBtn = document.getElementById("cartBtn");
const cartSidebar = document.getElementById("cartSidebar");
const overlay = document.getElementById("overlay");
const closeCart = document.getElementById("closeCart");

// === ANIMAÇÃO SUAVE DE ENTRADA E SAÍDA ===
cartBtn.addEventListener("click", () => {
  overlay.classList.add("active");
  cartSidebar.classList.add("active");
  document.body.style.overflow = "hidden"; // bloqueia scroll da página
});

overlay.addEventListener("click", () => fecharCarrinho());
closeCart.addEventListener("click", () => fecharCarrinho());

function fecharCarrinho() {
  cartSidebar.classList.remove("active");
  overlay.classList.remove("active");
  document.body.style.overflow = ""; // restaura scroll
}

const productGrid = document.getElementById("productGrid");
const priceRange = document.getElementById("priceRange");
const priceValue = document.getElementById("priceValue");
const sortSelect = document.getElementById("sortSelect");
const categorySpan = document.querySelector('#categoryName span');

const urlParams = new URLSearchParams(window.location.search);
const categoria = urlParams.get("categoria") || "";
categorySpan.textContent = categoria || "Todos os Produtos";

let maxPrice = Number(priceRange?.value || 1000);
let sort = sortSelect?.value || "relevance";

priceRange?.addEventListener("input", () => {
  maxPrice = Number(priceRange.value);
  priceValue.textContent = `Até R$ ${maxPrice}`;
  loadProducts();
});

sortSelect?.addEventListener("change", () => {
  sort = sortSelect.value;
  loadProducts();
});

function esc(text) {
  return String(text ?? "").replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
}

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
      cartItemsContainer.innerHTML = "<p></p>"; // Carrinho vazio
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
    
    // --- CUPOM APLICADO ---
    const couponInput = document.getElementById("couponCode");
    const applyBtn = document.getElementById("applyCouponBtn");

    // Remove mensagens antigas (caso já exista)
    const oldMsg = document.getElementById("appliedCouponMsg");
    if (oldMsg) oldMsg.remove();

    if (cart.cupom || cart.discountCode) {
      // Oculta os campos do cupom
      couponInput.style.display = "none";
      applyBtn.style.display = "none";

      // Cria mensagem elegante com microanimação
      const msg = document.createElement("div");
      msg.id = "appliedCouponMsg";
      msg.style.marginTop = "15px";
      msg.style.padding = "12px";
      msg.style.borderRadius = "8px";
      msg.style.background = "#E7FF14";
      msg.style.color = "#1E1939";
      msg.style.fontWeight = "600";
      msg.style.textAlign = "center";
      msg.style.transition = "all 0.5s ease";
      msg.style.opacity = "0";
      msg.style.transform = "translateY(8px)";
      msg.innerHTML = `🎉 Cupom <strong>${cart.cupom || cart.discountCode}</strong> já aplicado!`;

      document.querySelector(".cart-summary").appendChild(msg);

      // Pequena animação de fade-in + subida
      setTimeout(() => {
        msg.style.opacity = "1";
        msg.style.transform = "translateY(0)";
      }, 100);
    } else {
      // Se não houver cupom aplicado, mostra o campo normalmente
      couponInput.style.display = "block";
      couponInput.style.opacity = "1";
      couponInput.style.transform = "none";

      applyBtn.style.display = "block";
      applyBtn.style.opacity = "1";
      applyBtn.style.transform = "none";
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
  showCartAlert("Produto adicionado ao carrinho!");
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

// === FUNÇÃO PARA APLICAR CUPOM ===
document.getElementById("applyCouponBtn").addEventListener("click", async () => {
  const codigo = document.getElementById("couponCode").value.trim();
  if (!codigo) {
    alert("Digite o código do cupom.");
    return;
  }

  const cartId = currentCartId;
  try {
    const res = await fetch(`/api/cart/${cartId}/coupon`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: codigo })
    });

    const data = await res.json();

    if (data.success) {
      // Atualiza valores do carrinho
      document.getElementById("cartDiscount").textContent = `R$ ${data.desconto.toFixed(2)}`;
      document.getElementById("cartTotal").textContent = `R$ ${data.totalFinal.toFixed(2)}`;

      const couponInput = document.getElementById("couponCode");
      const applyBtn = document.getElementById("applyCouponBtn");

      // Fade out
      couponInput.style.transition = "all 0.4s ease";
      applyBtn.style.transition = "all 0.4s ease";
      couponInput.style.opacity = "0";
      couponInput.style.transform = "translateY(-10px)";
      applyBtn.style.opacity = "0";
      applyBtn.style.transform = "translateY(-10px)";

      setTimeout(() => {
        couponInput.style.display = "none";
        applyBtn.style.display = "none";

        // Cria mensagem de sucesso com animação
        const msg = document.createElement("div");
        msg.id = "appliedCouponMsg";
        msg.style.marginTop = "15px";
        msg.style.padding = "12px";
        msg.style.borderRadius = "8px";
        msg.style.background = "#E7FF14";
        msg.style.color = "#1E1939";
        msg.style.fontWeight = "600";
        msg.style.textAlign = "center";
        msg.style.transition = "all 0.4s ease";
        msg.style.opacity = "0";
        msg.style.transform = "translateY(10px)";
        msg.innerHTML = `🎉 Cupom <strong>${data.cupom.code}</strong> aplicado com sucesso!`;

        document.querySelector(".cart-summary").appendChild(msg);

        setTimeout(() => {
          msg.style.opacity = "1";
          msg.style.transform = "translateY(0)";
        }, 100);
      }, 400);
    } else {
      alert(`❌ ${data.error}`);
    }
  } catch (err) {
    console.error("Erro ao aplicar cupom:", err);
    alert("Erro ao aplicar cupom. Tente novamente.");
  }
});

// === Carregar Produtos ===
async function loadProducts() {
 // === Limpa grid e exibe skeletons enquanto carrega ===
  productGrid.innerHTML = "";
  productGrid.style.opacity = 1;
  productGrid.style.transform = "scale(1)";

  let skeletonCount = 8;
  if (window.innerWidth < 768) skeletonCount = 4;
  else if (window.innerWidth < 1024) skeletonCount = 6;

  // Cria skeletons dinamicamente
  for (let i = 0; i < skeletonCount; i++) {
    const skeleton = document.createElement("div");
    skeleton.className = "skeleton-card";
    skeleton.innerHTML = `
      <div class="skeleton-img"></div>
      <div class="skeleton-info">
        <div class="skeleton-line full"></div>
        <div class="skeleton-line medium"></div>
        <div class="skeleton-line short"></div>
      </div>
    `;
    productGrid.appendChild(skeleton);
  }

  try {
    // === BUSCA OS PRODUTOS ===
    const endpoint = `/api/products/category?category=${encodeURIComponent(categoria)}&maxPrice=${maxPrice}&sort=${encodeURIComponent(sort)}`;
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`Status ${res.status}`);

    const products = await res.json();

    // === FADE + ZOOM OUT DOS SKELETONS ===
    productGrid.style.transition = "opacity 0.4s ease, transform 0.4s ease";
    productGrid.style.opacity = 0;
    productGrid.style.transform = "scale(0.97)";

    setTimeout(() => {
      productGrid.innerHTML = "";

      if (!Array.isArray(products) || products.length === 0) {
        productGrid.innerHTML = `<p style="color:#666">Nenhum produto encontrado em "${esc(categoria)}"</p>`;
        productGrid.style.opacity = 1;
        productGrid.style.transform = "scale(1)";
        return;
      }

      // === RENDERIZA PRODUTOS COM ANIMAÇÃO CASCATA ===
      products.forEach(p => {
        const id = p.id ?? p._id ?? "";
        const nome = p.nome ?? p.name ?? "Produto";
        const valor = (Number(p.valor ?? p.price) || 0).toFixed(2);
        const img = (p.imagens && p.imagens[0]) || p.image || "https://via.placeholder.com/600x400?text=Imagem";

        const card = document.createElement("div");
        card.className = "cat-card";
        card.dataset.id = id;
        card.innerHTML = `
          <div class="card-media">
            <img src="${esc(img)}" alt="${esc(nome)}">
          </div>
          <div class="cat-card-info">
            <h3 class="product-title">${esc(nome)}</h3>
            <p class="price">R$ ${valor}</p>
          </div>
          <div class="card-actions">
            <div class="qty-control">
              <button class="qty-btn qty-decrease" type="button">−</button>
              <input class="qty-input" type="number" min="1" value="1" aria-label="Quantidade">
              <button class="qty-btn qty-increase" type="button">+</button>
            </div>
            <button class="btn-add" data-id="${id}" type="button">Adicionar</button>
          </div>
        `;

        // Clique na imagem ou nome leva ao produto
        card.querySelector(".card-media img").addEventListener("click", () => {
          window.location.href = `/detalhes-produto?id=${id}`;
        });

        card.querySelector(".product-title").addEventListener("click", () => {
          window.location.href = `/detalhes-produto?id=${id}`;
        });

        productGrid.appendChild(card);
      });

      // === FADE + ZOOM IN SUAVE DOS PRODUTOS ===
      setTimeout(() => {
        productGrid.style.opacity = 1;
        productGrid.style.transform = "scale(1)";
      }, 80);

    }, 350); // tempo do fade/zoom dos skeletons

  productGrid.addEventListener("click", (e) => {
    const decrease = e.target.closest(".qty-decrease");
    const increase = e.target.closest(".qty-increase");

    if (decrease) {
      const wrapper = decrease.closest(".qty-control");
      const input = wrapper.querySelector(".qty-input");
      let v = parseInt(input.value || "1", 10);
      v = isNaN(v) ? 1 : v - 1;
      if (v < 1) v = 1;
      input.value = v;
      return;
    }

    if (increase) {
      const wrapper = increase.closest(".qty-control");
      const input = wrapper.querySelector(".qty-input");
      let v = parseInt(input.value || "1", 10);
      v = isNaN(v) ? 1 : v + 1;
      input.value = v;
      return;
    }

    const addBtn = e.target.closest(".btn-add");
    if (addBtn) {
      const card = addBtn.closest(".cat-card");
      const productId = card.dataset.id;
      const qtyInput = card.querySelector(".qty-input");
      const qty = Math.max(1, parseInt(qtyInput.value || "1", 10));

      // === Verificação da categoria ===
      // Usa a variável global 'categoria' já definida na página
      if (categoria && categoria.toLowerCase().includes("bandeja")) {
        showCustomAlert(
          "Para adicionar esse produto você precisa escolher a cor das Alças!",
          `/detalhes-produto?id=${productId}`
        );
        return;
      }

      // Caso contrário, adiciona normalmente ao carrinho
      addToCart(productId, qty);
    }
  });

  } catch (err) {
    console.error("Erro ao carregar produtos:", err);
  }
}

function showCartAlert(message) {
  const alertBox = document.getElementById("cartAlert");
  alertBox.textContent = message;
  alertBox.classList.add("show");

  setTimeout(() => {
    alertBox.classList.remove("show");
  }, 2000);
}

// === Inicialização ===
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  renderCart();
});

document.getElementById('checkoutBtn').addEventListener("click", () => {
  location.href = "/checkout";
});

document.getElementById("logged").addEventListener("click", () => {
  location.href = "/profile";
});

document.getElementById("Capa_1").addEventListener("click", () => {
  window.open("https://wa.me/5511991765332");
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

function showCustomAlert(message, redirectUrl = null) {
  const alertBox = document.getElementById("customAlert");
  alertBox.textContent = message;
  alertBox.classList.add("show");

  setTimeout(() => {
    alertBox.classList.remove("show");
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  }, 2000);
}
