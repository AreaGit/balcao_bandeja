const cartBtn = document.getElementById("cartBtn");
const cartSidebar = document.getElementById("cartSidebar");
const overlay = document.getElementById("overlay");
const closeCart = document.getElementById("closeCart");
const menuToggle = document.getElementById("menuToggle");
const menuList = document.getElementById("menuList");

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

// === MENU HAMBURGUER ===
if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    menuList.classList.toggle("active");
  });
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
      cartItemsContainer.innerHTML = "<p>Seu carrinho está vazio</p>";
    } else {
      cart.items.forEach(item => {
        const div = document.createElement("div");
        div.classList.add("cart-item");
        div.innerHTML = `
          <img src="${item.imagem || "../assets/no-image.png"}" alt="${item.nome}" style="width:50px;height:50px;object-fit:cover;margin-right:10px;">
          <div class="info">
            <p><strong>${item.nome}</strong></p>
            ${item.cor ? `<p style="font-size:12px; color:#666;">Cor: ${item.cor}</p>` : ""}
            ${item.lona ? `<p style="font-size:12px; color:#666;">Lona: ${item.lona}</p>` : ""}
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
async function addToCart(productId, quantity = 1, cor = null, lona = null, arteUrl = null) {
  const res = await fetch("/api/cart/item", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cartId: currentCartId, productId, quantity, cor, lona, arteUrl })
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

// renderCart(); - Removed redundant call outside initialization block


async function initProductDetails() {

  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");

  if (!productId) {
    alert("Produto não encontrado!");
    return;
  }

  try {
    // Busca os dados do produto
    const response = await fetch(`/api/products/${productId}`);
    if (!response.ok) throw new Error("Erro ao buscar produto");
    const product = await response.json();

    // Atualiza os dados principais
    document.getElementById("productName").textContent = product.nome;

    // Preço com valor promocional
    const priceEl = document.getElementById("productPrice");
    if (product.valorPromocional && product.valorPromocional < product.valor) {
      priceEl.innerHTML = `
    <span style=" color:#888; font-size:16px; margin-right:10px;">
      A partir de:
    </span>
    <br>
    <span id="promotionPrice" style=" font-size:24px; font-weight:bold;">
      R$ ${product.valor}
    </span>
  `;
    } else {
      priceEl.innerHTML = `<span style="font-size:24px; font-weight:bold;">R$ ${product.valor}</span>`;
    }

    //document.getElementById("productShort").textContent = product.descricao;

    // Seleção de cores
    const prodInfo = document.querySelector(".prod-info");

    // Remove select antigo se existir
    const oldColorSelect = document.getElementById("colorSelect");
    if (oldColorSelect) oldColorSelect.remove();

    if (product.cores && product.cores.length > 0) {
      const colorLabel = document.createElement("label");
      colorLabel.innerHTML = "Selecione a opção de <strong>CORES DAS ALÇAS DAS BANDEJAS:</strong>";
      colorLabel.setAttribute("for", "colorSelect");
      colorLabel.style.display = "block";
      colorLabel.style.margin = "10px 0 5px 0";
      colorLabel.style.fontWeight = "600";

      const colorSelect = document.createElement("select");
      colorSelect.id = "colorSelect";
      colorSelect.style.padding = "10px";
      colorSelect.style.width = "100%";
      colorSelect.style.border = "1px solid #ddd";
      colorSelect.style.borderRadius = "6px";
      colorSelect.style.fontSize = "16px";
      colorSelect.style.marginTop = "15px";
      colorSelect.style.marginBottom = "15px";
      colorSelect.style.fontWeight = "normal";
      colorSelect.style.backgroundColor = "rgba(0,0,0,0.1)";
      colorSelect.style.textTransform = "uppercase";

      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "Selecione";
      defaultOption.selected = true;
      defaultOption.disabled = true;
      colorSelect.appendChild(defaultOption);

      product.cores.forEach(cor => {
        const option = document.createElement("option");
        option.value = cor;
        option.textContent = cor;
        option.style.fontWeight = "bold";
        colorSelect.appendChild(option);
      });

      // Inserir logo acima do preço
      const priceEl = document.getElementById("productPrice");
      prodInfo.insertBefore(colorLabel, priceEl);
      prodInfo.insertBefore(colorSelect, priceEl);
    }

    // Configura Gabarito e Upload de Arte
    const extraOptions = document.getElementById("extraOptions");
    const gabaritoContainer = document.getElementById("gabaritoContainer");
    const uploadArteContainer = document.getElementById("uploadArteContainer");

    if (product.gabaritoUrl || product.permiteUploadArte) {
      extraOptions.style.display = "flex";

      if (product.gabaritoUrl && product.gabaritoUrl.trim() !== "") {
        gabaritoContainer.style.display = "flex";
        document.getElementById("btnGabarito").href = product.gabaritoUrl;
      } else {
        gabaritoContainer.style.display = "none";
      }

      if (product.permiteUploadArte) {
        uploadArteContainer.style.display = "flex";
      } else {
        uploadArteContainer.style.display = "none";
      }
    } else {
      extraOptions.style.display = "none";
    }

    // Seleção de lonas
    const oldLonaSelect = document.getElementById("lonaSelect");
    if (oldLonaSelect) oldLonaSelect.remove();

    if (product.lonas && product.lonas.length > 0) {
      const lonaLabel = document.createElement("label");
      lonaLabel.innerHTML = "Selecione o tipo de <strong>LONA:</strong>";
      lonaLabel.setAttribute("for", "lonaSelect");
      lonaLabel.style.display = "block";
      lonaLabel.style.margin = "10px 0 5px 0";
      lonaLabel.style.fontWeight = "600";

      const lonaSelect = document.createElement("select");
      lonaSelect.id = "lonaSelect";
      lonaSelect.style.padding = "10px";
      lonaSelect.style.width = "100%";
      lonaSelect.style.border = "1px solid #ddd";
      lonaSelect.style.borderRadius = "6px";
      lonaSelect.style.fontSize = "16px";
      lonaSelect.style.marginTop = "5px";
      lonaSelect.style.marginBottom = "15px";
      lonaSelect.style.backgroundColor = "rgba(0,0,0,0.1)";
      lonaSelect.style.textTransform = "uppercase";

      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "Selecione";
      defaultOption.selected = true;
      defaultOption.disabled = true;
      lonaSelect.appendChild(defaultOption);

      product.lonas.forEach(lona => {
        const option = document.createElement("option");
        const nome = typeof lona === 'string' ? lona : lona.nome;
        option.value = nome;
        option.textContent = nome;
        lonaSelect.appendChild(option);
      });

      const priceEl = document.getElementById("productPrice");
      prodInfo.insertBefore(lonaLabel, priceEl);
      prodInfo.insertBefore(lonaSelect, priceEl);

      // Evento para atualizar preço
      lonaSelect.addEventListener("change", () => {
        const selectedLona = lonaSelect.value;
        const lonaData = product.lonas.find(l => l.nome === selectedLona);

        if (lonaData && lonaData.preco > 0) {
          priceEl.innerHTML = `<span style="font-size:24px; font-weight:bold;">R$ ${lonaData.preco.toFixed(2).replace(".", ",")}</span>`;
        } else {
          // Volta para o preço original
          if (product.valorPromocional && product.valorPromocional < product.valor) {
            priceEl.innerHTML = `
              <span style=" color:#888; font-size:16px; margin-right:10px;">A partir de:</span>
              <br>
              <span id="promotionPrice" style=" font-size:24px; font-weight:bold;">R$ ${product.valor}</span>
            `;
          } else {
            priceEl.innerHTML = `<span style="font-size:24px; font-weight:bold;">R$ ${product.valor}</span>`;
          }
        }
      });
    }


    // Galeria de imagens
    const mainImgContainer = document.querySelector(".prod-main-img");
    const thumbsContainer = document.getElementById("thumbsContainer");
    thumbsContainer.innerHTML = "";

    if (product.imagens && product.imagens.length > 0) {
      // Inicializa com a primeira imagem
      updateMainMedia(product.imagens[0], product.nome);

      product.imagens.forEach((imgUrl, index) => {
        const videoId = getYouTubeId(imgUrl);
        const thumb = document.createElement("img");

        if (videoId) {
          thumb.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
          thumb.alt = `${product.nome} vídeo ${index + 1}`;
          thumb.classList.add("video-thumb");

          thumb.addEventListener("click", () => {
            updateMainMedia(imgUrl, product.nome, true);
            setActiveThumb(thumb);
          });
        } else {
          thumb.src = imgUrl;
          thumb.alt = `${product.nome} ${index + 1}`;
          thumb.addEventListener("click", () => {
            updateMainMedia(imgUrl, product.nome, false);
            setActiveThumb(thumb);
          });
        }
        if (index === 0) thumb.classList.add("active");
        thumbsContainer.appendChild(thumb);
      });

      // Lógica do Carrossel Vertical
      initThumbsCarousel(product.imagens.length);
    }

    function setActiveThumb(activeThumb) {
      document.querySelectorAll(".prod-thumbs img").forEach(img => img.classList.remove("active"));
      activeThumb.classList.add("active");
    }

    function initThumbsCarousel(totalItems) {
      const prevBtn = document.getElementById("prevThumb");
      const nextBtn = document.getElementById("nextThumb");
      const container = document.getElementById("thumbsContainer");
      let currentIndex = 0;

      const getItemsVisible = () => {
        const width = window.innerWidth;
        if (width <= 480) return 3;
        return 4;
      };

      // Ajusta as setas para horizontal no mobile
      const updateOrientation = () => {
        const isMobile = window.innerWidth <= 992;
        if (isMobile) {
          prevBtn.innerHTML = "◀";
          nextBtn.innerHTML = "▶";
          prevBtn.style.transform = "none";
          nextBtn.style.transform = "none";
        } else {
          prevBtn.innerHTML = "▲";
          nextBtn.innerHTML = "▼";
        }
        return isMobile;
      };

      let isMobile = updateOrientation();

      function updateButtons() {
        const itemsVisible = getItemsVisible();
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex >= totalItems - itemsVisible;

        // Esconde setas se tiver menos imagens que o visível
        if (totalItems <= itemsVisible) {
          prevBtn.style.visibility = "hidden";
          nextBtn.style.visibility = "hidden";
        } else {
          prevBtn.style.visibility = "visible";
          nextBtn.style.visibility = "visible";
        }
      }

      function scrollToIndex(index) {
        isMobile = window.innerWidth <= 992;
        const itemsVisible = getItemsVisible();

        // Garante que o index não ultrapasse o limite
        const maxIndex = Math.max(0, totalItems - itemsVisible);
        currentIndex = Math.min(Math.max(0, index), maxIndex);

        const thumbSize = isMobile ? 70 : 85;
        const gap = isMobile ? 10 : 12;
        const offset = currentIndex * (thumbSize + gap);

        if (isMobile) {
          container.style.transform = `translateX(-${offset}px)`;
        } else {
          container.style.transform = `translateY(-${offset}px)`;
        }
        updateButtons();
      }

      prevBtn.addEventListener("click", () => {
        if (currentIndex > 0) scrollToIndex(currentIndex - 1);
      });

      nextBtn.addEventListener("click", () => {
        const itemsVisible = getItemsVisible();
        if (currentIndex < totalItems - itemsVisible) scrollToIndex(currentIndex + 1);
      });

      // Reset no resize
      window.addEventListener("resize", () => {
        isMobile = updateOrientation();
        scrollToIndex(0); // Volta ao início para evitar problemas de layout
      });

      updateButtons();
    }

    // Função auxiliar para atualizar a mídia principal (imagem ou vídeo)
    function updateMainMedia(url, alt, isVideo = false) {
      const videoId = getYouTubeId(url);

      if (videoId || isVideo) {
        const id = videoId || getYouTubeId(url);
        if (id) {
          mainImgContainer.innerHTML = `
            <iframe
              id="mainVideo"
              width="100%"
              height="400"
              src="https://www.youtube.com/embed/${id}?autoplay=1"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen>
            </iframe>
          `;
          return;
        }
      }

      // Caso contrário, mostra imagem
      mainImgContainer.innerHTML = `<img id="mainImage" src="${url}" alt="${alt}">`;
    }

    // Helper para extrair ID do YouTube
    function getYouTubeId(url) {
      if (!url || typeof url !== 'string') return null;
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
    }

    function maskCEP(value) {
      return value.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2");
    }

    const cep = document.getElementById("cep");
    cep.addEventListener("input", (e) => {
      e.target.value = maskCEP(e.target.value);
    });

    document.getElementById("calcShipping").addEventListener("click", async () => {
      const cep = document.getElementById("cep").value.replace("-", "");

      if (!cep || cep.length < 8) {
        alert("Digite um CEP válido.");
        return;
      }

      const shippingResult = document.getElementById("shipping-result");
      shippingResult.innerHTML = "<p>Calculando frete...</p>";

      try {
        const qty = parseInt(document.getElementById("qty").value) || 1;

        const body = {
          id: productId,
          postal_codeTo: cep,
          largura: product.largura,
          altura: product.altura,
          comprimento: product.comprimento,
          peso: product.peso,
          valor: product.valor,
          valorSeguro: product.valor,
          quantity: qty
        };

        const res = await fetch("/api/frete/cotacao", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });

        const resposta = await res.json();
        const fretes = resposta.cotacoes || resposta;

        shippingResult.idnnerHTML = "";

        if (Array.isArray(fretes)) {
          const validos = fretes.filter(f => !f.error && f.price && f.company?.name !== 'Jadlog' &&
            f.company?.name !== 'Azul');

          if (validos.length === 0) {
            shippingResult.innerHTML = "<p>Nenhuma transportadora disponível para esse CEP.</p>";
            return;
          }

          // ordena por preço (menor -> maior)
          validos.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

          validos.forEach((frete, index) => {
            const div = document.createElement("div");
            div.classList.add("frete-opcao");

            // o primeiro da lista é o mais barato
            if (index === 0) {
              div.classList.add("melhor-opcao");
            }

            div.innerHTML = `
      <p>
        <img src="${frete.company.picture}" alt="${frete.company.name}" width="24" style="vertical-align:middle; margin-right:6px;">
        <strong>${frete.company.name} - ${frete.name}</strong>
      </p>
      <p>Preço: R$ ${parseFloat(frete.price).toFixed(2).replace(".", ",")}</p>
      <p>Prazo: ${frete.delivery_time} dias úteis</p>
    `;
            shippingResult.appendChild(div);
          });
        } else {
          shippingResult.innerHTML = "<p>Não foi possível calcular o frete.</p>";
        }
      } catch (err) {
        console.error("Erro ao calcular frete:", err);
        shippingResult.innerHTML = "<p>Erro ao calcular frete.</p>";
      }
    });


    // Descrição
    document.getElementById("tabDescricao").innerHTML = `<h2>DESCRIÇÃO DO PRODUTO</h2><p>${product.descricao || "Sem descrição."}</p>`;
    // Produtos relacionados
    const relatedContainer = document.getElementById("relatedProducts");
    // Carrega os produtos relacionados
    async function loadRelatedProducts(productId) {
      try {
        const res = await fetch(`/api/products/${productId}/related`);
        const data = await res.json();

        const relatedContainer = document.getElementById("relatedProducts");
        relatedContainer.innerHTML = "";

        if (data.message) {
          relatedContainer.innerHTML = `<p>${data.message}</p>`;
          return;
        }

        relatedContainer.classList.add("related-grid");

        data.forEach(prod => {
          const card = document.createElement("div");
          card.classList.add("related-card");

          const image = Array.isArray(prod.imagens) && prod.imagens.length > 0
            ? prod.imagens[0]
            : "https://via.placeholder.com/200";

          card.innerHTML = `
        <a href="/detalhes-produto?id=${prod.id}">
          <img src="${image}" alt="${prod.nome}">
          <h3>${prod.nome}</h3>
          <p>R$ ${Number(prod.valor).toFixed(2)}</p>
        </a>
      `;

          relatedContainer.appendChild(card);
        });
      } catch (err) {
        console.error("Erro ao carregar relacionados:", err);
      }
    }

    loadRelatedProducts(productId);

  } catch (error) {
    console.error("Erro ao carregar detalhes do produto:", error);
    alert("Não foi possível carregar os detalhes do produto.");
  }

  // Controle de quantidade
  const inputQty = document.getElementById("qty");
  document.getElementById("increase").addEventListener("click", () => {
    inputQty.value = parseInt(inputQty.value) + 1;
  });
  document.getElementById("decrease").addEventListener("click", () => {
    if (parseInt(inputQty.value) > 1) {
      inputQty.value = parseInt(inputQty.value) - 1;
    }
  });

  // === Adicionar ao carrinho ===
  document.getElementById("btnAdd").addEventListener("click", async () => {
    const colorSelect = document.getElementById("colorSelect");
    const selectedColor = colorSelect ? colorSelect.value : null;

    const lonaSelect = document.getElementById("lonaSelect");
    const selectedLona = lonaSelect ? lonaSelect.value : null;

    // 🔒 Verifica se o produto tem variações e exige seleção
    if (colorSelect && (!selectedColor || selectedColor.trim() === "")) {
      alert("Por favor, selecione a cor antes de adicionar ao carrinho.");
      return;
    }

    if (lonaSelect && (!selectedLona || selectedLona.trim() === "")) {
      alert("Por favor, selecione o tipo de lona antes de adicionar ao carrinho.");
      return;
    }

    const arteUrl = document.getElementById("arteUrl").value;

    await addToCart(productId, parseInt(inputQty.value), selectedColor, selectedLona, arteUrl);
    showCartAlert("Produto adicionado ao carrinho!");
  });

  // === Comprar agora ===
  document.getElementById("btnComp").addEventListener("click", async () => {
    const colorSelect = document.getElementById("colorSelect");
    const selectedColor = colorSelect ? colorSelect.value : null;

    const lonaSelect = document.getElementById("lonaSelect");
    const selectedLona = lonaSelect ? lonaSelect.value : null;

    if (colorSelect && (!selectedColor || selectedColor.trim() === "")) {
      showToast("Por favor, selecione a cor antes de comprar.", "error");
      return;
    }

    if (lonaSelect && (!selectedLona || selectedLona.trim() === "")) {
      showToast("Por favor, selecione o tipo de lona antes de comprar.", "error");
      return;
    }

    const arteUrl = document.getElementById("arteUrl").value;

    await addToCart(productId, parseInt(inputQty.value), selectedColor, selectedLona, arteUrl);
    showToast("Produto adicionado ao carrinho!");
    setTimeout(() => (window.location.href = "/checkout"), 1500);
  });

  // === Upload de Arte ===
  const inputArte = document.getElementById("inputArte");
  if (inputArte) {
    inputArte.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 50 * 1024 * 1024) {
        showToast("Arquivo muito grande. Limite: 50MB", "error");
        e.target.value = "";
        return;
      }

      showToast("Enviando arte...", "info");

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch("/api/upload/arte", {
          method: "POST",
          body: formData
        });

        const data = await response.json();

        if (response.ok) {
          document.getElementById("arteUrl").value = data.url;
          showToast("Arte enviada com sucesso!");
        } else {
          showToast(data.error || "Erro ao enviar arte.", "error");
          e.target.value = "";
        }
      } catch (error) {
        console.error("Erro no upload:", error);
        showToast("Erro de conexão ao enviar arte.", "error");
        e.target.value = "";
      }
    });
  }
}


function showToast(message, type = "success") {
  const alertBox = document.getElementById("cartAlert"); // Reutilizando o elemento existente

  // Remove classes de tipo anteriores
  alertBox.classList.remove("toast-success", "toast-error", "toast-info");

  // Adiciona a nova classe de tipo
  alertBox.className = "toast"; // Reset
  alertBox.classList.add(`toast-${type}`);

  alertBox.textContent = message;
  alertBox.classList.add("show");

  setTimeout(() => {
    alertBox.classList.remove("show");
  }, 3000);
}

// === Inicialização ===
document.addEventListener("DOMContentLoaded", async () => {
  await renderCart();
  await initProductDetails();
  await loadCategoriesMenu();
});


async function loadCategoriesMenu() {
  try {
    const res = await fetch("/api/categories");
    const categories = await res.json();

    // Atualiza Menu Principal (itens horizontais) se existir na página
    const menuList = document.getElementById("menuList");
    if (menuList) {
      const firstItem = menuList.firstElementChild;
      menuList.innerHTML = "";
      menuList.appendChild(firstItem);

      categories.forEach(cat => {
        const li = document.createElement("li");
        li.innerHTML = `<a href="/categories?categoria=${encodeURIComponent(cat.nome)}">${cat.nome}</a>`;
        menuList.appendChild(li);
      });
    }
  } catch (err) {
    console.error("Erro ao carregar categorias no menu:", err);
  }
}

document.getElementById('checkoutBtn').addEventListener("click", () => {
  location.href = "/checkout";
})

document.getElementById("logged").addEventListener("click", () => {
  location.href = "/profile";
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

document.getElementById("Capa_1").addEventListener("click", () => {
  window.open("https://wa.me/5511991765332");
});