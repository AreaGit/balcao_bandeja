// === ELEMENTOS DOM ===
const cartBtn = document.getElementById("cartBtn");
const cartSidebar = document.getElementById("cartSidebar");
const overlay = document.getElementById("overlay");
const closeCart = document.getElementById("closeCart");
const menuToggle = document.getElementById("menuToggle");
const menuList = document.getElementById("menuList");
const submenuParents = document.querySelectorAll(".has-submenu");
const searchInput = document.getElementById("searchInput");
const autocompleteList = document.getElementById("autocompleteList");

let currentCartId;
let debounceTimeout;

// === CARRINHO ===
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

// === MENU HAMBURGUER ===
menuToggle.addEventListener("click", () => {
  menuList.classList.toggle("active");
});

// Submenus mobile
submenuParents.forEach(item => {
  item.addEventListener("click", e => {
    if (window.innerWidth <= 768) {
      e.preventDefault();
      submenuParents.forEach(el => { if (el !== item) el.classList.remove("open"); });
      item.classList.toggle("open");
    }
  });
});

// === CARREGAR CARRINHO ===
async function renderCart() {
  try {
    const meRes = await fetch("/api/me");
    const meData = await meRes.json();

    let userId, guestId;
    if (meData.loggedIn) {
      document.getElementById("logged").style.display = "block";
      document.getElementById("nameUser").textContent = meData.user.name;
      userId = meData.user.id;
    } else {
      document.getElementById("notLoggedIn").style.display = "block";
      guestId = meData.guestId || "anon-" + Date.now();
    }

    const cartRes = await fetch("/api/cart/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, guestId })
    });

    const cart = await cartRes.json();
    currentCartId = cart.id;

    const cartItemsContainer = document.getElementById("cartItemsContainer");
    const subtotalEl = document.getElementById("cartSubtotal");
    const discountEl = document.getElementById("cartDiscount");
    const totalEl = document.getElementById("cartTotal");
    const countEl = document.getElementById("cartCount");

    cartItemsContainer.innerHTML = "";
    if (!cart.items?.length) {
      cartItemsContainer.innerHTML = "<p>Seu carrinho está vazio</p>";
    } else {
      cart.items.forEach(item => {
        const div = document.createElement("div");
        div.classList.add("cart-item");
        div.innerHTML = `
          <img src="${item.imagem || '../assets/no-image.png'}" alt="${item.nome}">
          <div class="info">
            <p><strong>${item.nome}</strong></p>
            <p>Qtd: <input type="number" min="1" value="${item.quantidade}" data-id="${item.id}" class="update-qty"></p>
            <p>Preço: R$ ${(item.precoUnitario * item.quantidade).toFixed(2).replace('.', ',')}</p>
            <button class="remove-item" data-id="${item.id}">Remover</button>
          </div>
        `;
        cartItemsContainer.appendChild(div);
      });
    }

    subtotalEl.textContent = `R$ ${cart.subtotal?.toFixed(2).replace('.', ',') || '0,00'}`;
    discountEl.textContent = `R$ ${cart.desconto?.toFixed(2).replace('.', ',') || '0,00'}`;
    totalEl.textContent = `R$ ${cart.totalFinal?.toFixed(2).replace('.', ',') || '0,00'}`;
    countEl.textContent = cart.items?.length || 0;

    document.querySelectorAll(".update-qty").forEach(input => {
      input.addEventListener("change", e => updateCartItem(e.target.dataset.id, parseInt(e.target.value)));
    });

    document.querySelectorAll(".remove-item").forEach(btn => {
      btn.addEventListener("click", e => removeCartItem(e.target.dataset.id));
    });

  } catch (err) {
    console.error("Erro ao carregar carrinho:", err);
  }
}

async function addToCart(productId, quantity = 1) {
  await fetch("/api/cart/item", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cartId: currentCartId, productId, quantity })
  });
  renderCart();
}

async function updateCartItem(itemId, quantity) {
  await fetch(`/api/cart/item/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity })
  });
  renderCart();
}

async function removeCartItem(itemId) {
  await fetch(`/api/cart/item/${itemId}`, { method: "DELETE" });
  renderCart();
}

renderCart();

document.getElementById('checkoutBtn').addEventListener("click", () => location.href = "/checkout");
document.getElementById("logged").addEventListener("click", () => location.href = "/profile");

// === BUSCA PRODUTOS (autocomplete) ===
searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim();
  clearTimeout(debounceTimeout);
  if (!query) {
    autocompleteList.innerHTML = "";
    return;
  }
  debounceTimeout = setTimeout(() => searchProducts(query), 300);
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
    } else {
      autocompleteList.innerHTML = "<div class='autocomplete-empty'>Nenhum produto encontrado</div>";
    }

    autocompleteList.classList.add("active");
    document.querySelectorAll(".autocomplete-item").forEach(item => {
      item.addEventListener("click", () => location.href = `/detalhes-produto?id=${item.dataset.id}`);
    });
  } catch (err) {
    console.error(err);
    autocompleteList.innerHTML = "<div class='autocomplete-empty'>Erro ao buscar produtos</div>";
    autocompleteList.classList.add("active");
  }
}

document.addEventListener("click", e => {
  if (!searchInput.contains(e.target) && !autocompleteList.contains(e.target)) {
    autocompleteList.classList.remove("active");
  }
});

// === Carregar destaques ===
async function carregarDestaques() {
  try {
    const res = await fetch("/api/products/highlights");
    if (!res.ok) throw new Error("Erro ao buscar destaques");
    const data = await res.json();

    const lancamentos = Array.isArray(data.lancamentos) ? data.lancamentos : [];
    const maisVendidos = Array.isArray(data.maisVendidos) ? data.maisVendidos : [];

    renderLancamentos(lancamentos);
    renderMaisVendidos(maisVendidos);
  } catch (err) {
    console.error("Erro ao carregar destaques:", err);
  }
}

// === Renderizar lançamentos (carrossel simples) ===
function renderLancamentos(produtos) {
  const track = document.querySelector(".product-carousel-section .carousel-track");
  if (!track) return;

  track.innerHTML = "";

  if (!produtos.length) {
    track.innerHTML = "<p>Nenhum lançamento encontrado.</p>";
    return;
  }

  produtos.forEach(p => {
    const item = document.createElement("div");
    item.classList.add("carousel-item");
    item.innerHTML = `
      <img src="${p.imagens?.[0] || '/assets/no-image.png'}" alt="${p.nome}">
      <a href="/detalhes-produto?id=${p.id}" class="btn-carousel">Confira</a>
    `;
    track.appendChild(item);
  });

  // Navegação
  const prevBtn = document.querySelector(".product-carousel-section .carousel-btn.prev");
  const nextBtn = document.querySelector(".product-carousel-section .carousel-btn.next");
  const indicators = document.querySelectorAll(".product-carousel-section .carousel-indicators button");

  let currentIndex = 0;

  function showSlide(index) {
    const items = track.children;
    const total = items.length;
    currentIndex = (index + total) % total;
    Array.from(items).forEach((el, i) => el.style.display = i === currentIndex ? "block" : "none");

    // Atualiza indicadores
    indicators.forEach((btn, i) => btn.classList.toggle("active", i === currentIndex));
  }

  prevBtn.addEventListener("click", () => showSlide(currentIndex - 1));
  nextBtn.addEventListener("click", () => showSlide(currentIndex + 1));

  // Indicadores clicáveis
  indicators.forEach((btn, i) => btn.addEventListener("click", () => showSlide(i)));

  showSlide(0);
}

// === Renderizar produtos mais vendidos ===
function renderMaisVendidos(produtos) {
  const container = document.querySelector(".bs-products-wrapper");
  if (!container) return;

  container.innerHTML = "";

  if (!produtos.length) {
    container.innerHTML = "<p>Nenhum produto mais vendido disponível</p>";
    return;
  }

  produtos.forEach(p => {
    const div = document.createElement("div");
    div.className = "bs-item";
    div.innerHTML = `
      <img src="${p.imagens?.[0] || '/assets/no-image.png'}" alt="${p.nome}">
      <h3>${p.nome}</h3>
      <p>R$ ${(p.valorPromocional || p.valor).replace('.', ',')}</p>
    `;
    div.addEventListener("click", () => {
      window.location.href = `/detalhes-produto?id=${p.id}`;
    });
    container.appendChild(div);
  });
}

// === Executar ===
carregarDestaques();

document.getElementById("Capa_1").addEventListener("click", () => {
  window.open("https://wa.me/5511991765332");
});