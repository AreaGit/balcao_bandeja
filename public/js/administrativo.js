const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("toggleBtn");

toggleBtn.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
});

let currentPedidos = [];
let currentClientes = [];
let currentProdutos = [];
let currentTab = "dashboard"; // aba inicial

// === FETCH API ===
async function fetchDashboardCards() {
  const res = await fetch("/api/admin/cards");
  if (!res.ok) throw new Error("Falha ao carregar cards");
  return res.json();
}

async function fetchOrders() {
  const res = await fetch("/api/admin/pedidos");
  if (!res.ok) throw new Error("Falha ao carregar pedidos");
  return res.json();
}

async function fetchSales() {
  const res = await fetch("/api/admin/vendas-mensais");
  if (!res.ok) throw new Error("Falha ao carregar vendas");
  return res.json();
}

async function fetchClientes() {
  const res = await fetch("/api/admin/clientes");
  if (!res.ok) throw new Error("Falha ao carregar clientes");
  return res.json();
}

async function fetchProdutos() {
  const res = await fetch("/api/admin/produtos");
  if (!res.ok) throw new Error("Falha ao carregar produtos");
  return res.json();
}

// === TOASTS ===
function showToast(msg, type = "success") {
  const container = document.getElementById("toastContainer") || (() => {
    const div = document.createElement("div");
    div.id = "toastContainer";
    document.body.appendChild(div);
    return div;
  })();

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// === MODAL DE CONFIRMAÇÃO ===
function confirmarModal(mensagem) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal">
        <h3>Confirmação</h3>
        <p>${mensagem}</p>
        <div class="modal-actions">
          <button id="confirmBtn" class="success">Confirmar</button>
          <button id="cancelBtn">Cancelar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector("#confirmBtn").addEventListener("click", () => {
      overlay.remove();
      resolve(true);
    });
    overlay.querySelector("#cancelBtn").addEventListener("click", () => {
      overlay.remove();
      resolve(false);
    });
  });
}

// === AUXILIAR PARA LIMPAR MAIN ===
function clearMain() {
  document.querySelector(".main").innerHTML = "";
}

// === INIT DASHBOARD ===
async function initDashboard() {
  clearMain();
  const main = document.querySelector(".main");

  main.innerHTML = `
    <header><h1>Dashboard</h1></header>
    <section class="cards">
      <div class="card" id="cardPedidos"><h3>Pedidos</h3><p id="totalPedidos">--</p></div>
      <div class="card" id="cardVendas"><h3>Vendas</h3><p id="totalVendas">--</p></div>
      <div class="card" id="cardClientes"><h3>Clientes</h3><p id="totalClientes">--</p></div>
    </section>
    <section class="chart-section">
      <h2>Vendas Mensais</h2>
      <canvas id="salesChart"></canvas>
    </section>
  `;

  try {
    const [cards, pedidos, vendas] = await Promise.all([
      fetchDashboardCards(),
      fetchOrders(),
      fetchSales()
    ]);
    currentPedidos = pedidos;
    renderCards(cards);
    renderChart(vendas);
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar dashboard", "error");
  }
}

// === RENDER CARDS ===
function renderCards(data) {
  document.getElementById("totalPedidos").textContent = data.pedidos;
  document.getElementById("totalVendas").textContent = `R$ ${parseFloat(data.vendas).toFixed(2)}`;
  document.getElementById("totalClientes").textContent = data.clientes;
}

// === RENDER CHART ===
function renderChart(vendas) {
  const ctx = document.getElementById("salesChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"],
      datasets: [{
        label: "Vendas (R$)",
        data: vendas,
        borderColor: "#6366f1",
        backgroundColor: "rgba(99,102,241,0.2)",
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      scales: {
        y: { ticks: { color: "#ccc" }, grid: { color: "#1e1e2f" } },
        x: { ticks: { color: "#ccc" }, grid: { color: "#1e1e2f" } }
      },
      plugins: { legend: { labels: { color: "#ccc" } } }
    }
  });
}

let pedidosPage = 1;
let pedidosLimit = 10;
let pedidosTotalPages = 1;

async function initPedidos() {
  clearMain();
  const main = document.querySelector(".main");

  main.innerHTML = `
    <header><h1>Pedidos</h1></header>
    <section class="table-section">
      <h2>Todos os pedidos</h2>
      <div class="filters">
        <label>Status:</label>
        <select id="statusFilterOrders">
          <option value="">Todos</option>
          <option value="PAGO">PAGO</option>
          <option value="Processando">Processando</option>
          <option value="Enviado">Enviado</option>
          <option value="Entregue">Entregue</option>
          <option value="Cancelado">Cancelado</option>
        </select>
        <label>Buscar:</label>
        <input type="text" id="searchOrders" placeholder="ID ou nome do cliente">
      </div>
      <table>
        <thead><tr><th>ID</th><th>Cliente</th><th>Status</th><th>Total</th><th>Data</th><th>Ações</th></tr></thead>
        <tbody id="ordersTableBody"></tbody>
      </table>
      <div class="pagination">
        <button id="prevPage">«</button>
        <span id="pageInfo"></span>
        <button id="nextPage">»</button>
      </div>
    </section>
  `;

  await loadPedidos();

  document.getElementById("statusFilterOrders").addEventListener("change", () => { pedidosPage = 1; loadPedidos(); });
  document.getElementById("searchOrders").addEventListener("input", () => { pedidosPage = 1; loadPedidos(); });
  document.getElementById("prevPage").addEventListener("click", () => { if(pedidosPage>1){pedidosPage--;loadPedidos();} });
  document.getElementById("nextPage").addEventListener("click", () => { if(pedidosPage<pedidosTotalPages){pedidosPage++;loadPedidos();} });
}

async function loadPedidos() {
  const status = document.getElementById("statusFilterOrders").value;
  const search = document.getElementById("searchOrders").value;

  try {
    const res = await fetch(`/api/admin/pedidos/paginados?page=${pedidosPage}&limit=${pedidosLimit}&status=${status}&search=${encodeURIComponent(search)}`);
    if (!res.ok) throw new Error("Erro ao carregar pedidos");
    const data = await res.json();

    currentPedidos = data.pedidos;
    pedidosTotalPages = data.totalPages;
    document.getElementById("pageInfo").textContent = `Página ${data.page} de ${data.totalPages}`;

    renderOrdersTable(currentPedidos);
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar pedidos", "error");
  }
}

function renderOrdersTable(pedidos) {
  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  pedidos.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>#${p.id}</td>
      <td>${p.usuario?.nome || "—"}</td>
      <td><span class="status ${p.status.toLowerCase()}">${p.status}</span></td>
      <td>R$ ${parseFloat(p.total).toFixed(2)}</td>
      <td>${new Date(p.createdAt).toLocaleDateString("pt-BR")}</td>
      <td>
        <button class="update" data-id="${p.id}" data-status="${p.status}">Atualizar</button>
        <button class="cancel" data-id="${p.id}" data-status="${p.status}">Cancelar</button>
      </td>
    `;
    tr.addEventListener("click", () => abrirModalDetalhesPedido(p.id));
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".update").forEach(btn =>
    btn.addEventListener("click", e => { e.stopPropagation(); atualizarStatusPedido(btn.dataset.id, btn.dataset.status); })
  );

  tbody.querySelectorAll(".cancel").forEach(btn =>
    btn.addEventListener("click", e => { e.stopPropagation(); confirmarCancelamento(btn.dataset.id, btn.dataset.status); })
  );
}

async function abrirModalDetalhesPedido(id) {
  try {
    const res = await fetch(`/api/admin/pedidos/${id}`);
    if (!res.ok) throw new Error("Erro ao buscar detalhes do pedido");
    const pedido = await res.json();

    const overlay = document.createElement("div");
    overlay.className = "pedido-overlay";

    const modal = document.createElement("div");
    modal.className = "pedido-modal";

    // Parse JSON de frete
    const frete = pedido.frete ? JSON.parse(pedido.frete) : null;

    const itensHTML = pedido.itens.map(item => {
      const preco = parseFloat(item.precoUnitario || item.produto?.valor || 0);
      const subtotal = preco * (item.quantidade || 0);
      return `
        <div class="pedido-item">
          <div>
            <p class="pedido-item-nome">${item.produto?.nome || "Produto"}</p>
            <p class="pedido-item-qtd">Qtd: ${item.quantidade}</p>
          </div>
          <div class="pedido-item-valores">
            <p>Preço: R$ ${preco.toFixed(2)}</p>
            <p>Subtotal: R$ ${subtotal.toFixed(2)}</p>
          </div>
        </div>
      `;
    }).join("");

    modal.innerHTML = `
      <div class="pedido-header">
        <h2>Pedido #${pedido.id}</h2>
        <button id="fecharDetalhes" class="pedido-close">&times;</button>
      </div>

      <div class="pedido-info">
        <p><strong>Cliente:</strong> ${pedido.usuario?.nome || "—"}</p>
        <p><strong>Email:</strong> ${pedido.usuario?.email || "—"}</p>
        <p><strong>Status:</strong> <span class="pedido-status ${pedido.status.toLowerCase()}">${pedido.status}</span></p>
        <p><strong>Total:</strong> R$ ${parseFloat(pedido.total).toFixed(2)}</p>
        <p><strong>Data:</strong> ${new Date(pedido.createdAt).toLocaleString("pt-BR")}</p>
        <p><strong>Forma de Pagamento:</strong> ${pedido.formaPagamento}</p>
      </div>

      <div class="pedido-endereco">
        <h4>Endereço de Entrega</h4>
        <p>${pedido.endereco.replace(/["]+/g,'')}</p>
      </div>

      ${frete ? `
        <div class="pedido-frete">
          <h4>Frete</h4>
          <p>${frete.name} - R$ ${parseFloat(frete.price).toFixed(2)}</p>
          <img src="${frete.company.picture}" alt="${frete.company.name}" style="height:24px;margin-top:4px;">
        </div>
      ` : ""}

      <h3 class="pedido-itens-titulo">Itens do Pedido</h3>
      <div class="pedido-itens">${itensHTML}</div>

      <div class="pedido-footer">
        <button id="fecharDetalhesBtn" class="pedido-btn">Fechar</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    document.getElementById("fecharDetalhes").addEventListener("click", close);
    document.getElementById("fecharDetalhesBtn").addEventListener("click", close);
    overlay.addEventListener("click", e => e.target === overlay && close());

  } catch (err) {
    console.error(err);
    showToast("Erro ao abrir detalhes do pedido.", "error");
  }
}


// === MODAL DETALHES DO PEDIDO ===
async function showPedidoModal(pedido) {
  // Se pedidoItems não vier completo, buscar detalhes do pedido
  let detalhes = pedido;
  if (!pedido.pedidoItems) {
    try {
      const res = await fetch(`/api/admin/pedidos/${pedido.id}`);
      if (!res.ok) throw new Error("Falha ao carregar detalhes do pedido");
      detalhes = await res.json();
    } catch (err) {
      console.error(err);
      showToast(err.message, "error");
      return;
    }
  }

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  
  const itemsRows = detalhes.pedidoItems?.map(item => `
    <tr>
      <td>${item.produto.nome}</td>
      <td>${item.quantidade}</td>
      <td>R$ ${parseFloat(item.produto.preco).toFixed(2)}</td>
      <td>R$ ${(item.quantidade * item.produto.preco).toFixed(2)}</td>
    </tr>
  `).join("") || "";

  modal.innerHTML = `
    <div class="modal">
      <h3>Pedido #${detalhes.id}</h3>
      <p>Cliente: ${detalhes.usuario?.nome || "—"}</p>
      <p>Status: ${detalhes.status}</p>
      <p>Total: R$ ${parseFloat(detalhes.total).toFixed(2)}</p>
      <p>Data: ${new Date(detalhes.createdAt).toLocaleString("pt-BR")}</p>

      <h4>Itens do Pedido</h4>
      <table>
        <thead>
          <tr><th>Produto</th><th>Qtd</th><th>Preço Unit.</th><th>Subtotal</th></tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <button id="closePedidoModal">Fechar</button>
    </div>
  `;

  document.body.appendChild(modal);
  modal.querySelector("#closePedidoModal").addEventListener("click", () => modal.remove());
}

// === ATUALIZA STATUS / CANCELA PEDIDO ===
async function atualizarStatusPedido(id, statusAtual) {
  if (["Cancelado", "Entregue"].includes(statusAtual)) {
    showToast("Este pedido não pode ser alterado.", "error");
    return;
  }

  const statusFlow = { PAGO: "Processando", Processando: "Enviado", Enviado: "Entregue" };
  const novoStatus = statusFlow[statusAtual] || "Entregue";

  try {
    const res = await fetch(`/api/admin/pedidos/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus })
    });
    if (!res.ok) throw new Error("Falha ao atualizar status");
    showToast(`Status atualizado para "${novoStatus}"`, "success");
    currentPedidos = await fetchOrders();
    renderOrdersTable(currentPedidos);
  } catch (err) {
    console.error(err);
    showToast(err.message, "error");
  }
}

async function confirmarCancelamento(id, statusAtual) {
  if (["Entregue", "Cancelado"].includes(statusAtual)) {
    showToast("Pedido não pode ser cancelado.", "error");
    return;
  }
  const confirm = await confirmarModal(`Deseja cancelar o pedido #${id}?`);
  if (!confirm) return;

  try {
    const res = await fetch(`/api/admin/pedidos/${id}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Cancelado" })
    });
    if (!res.ok) throw new Error("Falha ao cancelar pedido");
    showToast("Pedido cancelado com sucesso", "success");
    currentPedidos = await fetchOrders();
    renderOrdersTable(currentPedidos);
  } catch (err) {
    console.error(err);
    showToast(err.message, "error");
  }
}

// -------------------- HELPERS --------------------
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function fmtDate(date) {
  return date ? new Date(date).toLocaleDateString("pt-BR") : "—";
}
function debounce(fn, wait = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

// -------------------- CLIENTES --------------------
let clientesPage = 1;
const clientesLimit = 10;
let clientesTotalPages = 1;

async function initClientes() {
  clearMain();
  const main = document.querySelector(".main");

  main.innerHTML = `
    <header><h1>Clientes</h1></header>
    <section class="table-section">
      <h2>Lista de clientes</h2>
      <div class="filters">
        <label>Buscar:</label>
        <input type="text" id="searchClientes" placeholder="Nome ou e-mail">
      </div>
      <table>
        <thead>
          <tr><th>ID</th><th>Nome</th><th>Email</th><th>Telefone</th><th>Data</th><th>Ações</th></tr>
        </thead>
        <tbody id="clientesTableBody"></tbody>
      </table>
      <div class="pagination">
        <button id="prevClientes">«</button>
        <span id="clientesPageInfo"></span>
        <button id="nextClientes">»</button>
      </div>
    </section>
  `;

  const searchInput = document.getElementById("searchClientes");
  searchInput.addEventListener("input", debounce(() => { clientesPage = 1; loadClientes(); }, 300));
  document.getElementById("prevClientes").addEventListener("click", () => { if (clientesPage > 1) { clientesPage--; loadClientes(); } });
  document.getElementById("nextClientes").addEventListener("click", () => { if (clientesPage < clientesTotalPages) { clientesPage++; loadClientes(); } });

  await loadClientes();
}

async function loadClientes() {
  const search = document.getElementById("searchClientes")?.value || "";
  try {
    const res = await fetch(`/api/admin/clientes/paginados?page=${clientesPage}&limit=${clientesLimit}&search=${encodeURIComponent(search)}`);
    if (!res.ok) throw new Error("Falha ao carregar clientes");
    const data = await res.json();
    clientesTotalPages = data.totalPages || 1;
    const page = data.page || clientesPage;
    document.getElementById("clientesPageInfo").textContent = `Página ${page} de ${data.totalPages || 1}`;
    renderClientesTable(data.clientes || []);
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar clientes", "error");
  }
}

function renderClientesTable(clientes) {
  const tbody = document.getElementById("clientesTableBody");
  tbody.innerHTML = "";
  clientes.forEach(c => {
    const created = c.createdAt ? fmtDate(c.createdAt) : "—";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>#${c.id}</td>
      <td>${escapeHtml(c.nome || "—")}</td>
      <td>${escapeHtml(c.email || "—")}</td>
      <td>${escapeHtml(c.celular || "—")}</td>
      <td>${escapeHtml(c.createdAt)}</td>
      <td>
        <button class="btn details-client" data-id="${c.id}">Detalhes</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".details-client").forEach(btn =>
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      try {
        const res = await fetch(`/api/admin/clientes/${id}`);
        if (!res.ok) throw new Error("Falha ao buscar cliente");
        const cliente = await res.json();
        console.log(cliente)
        openClienteModal(cliente);
      } catch (err) {
        console.error(err);
        showToast("Erro ao abrir detalhes do cliente", "error");
      }
    })
  );
}

function openClienteModal(cliente = {}) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <h3>Cliente #${cliente.id || ""}</h3>
      <p><strong>Nome:</strong> ${escapeHtml(cliente.nome || "—")}</p>
      <p><strong>Email:</strong> ${escapeHtml(cliente.email || "—")}</p>
      <p><strong>Telefone:</strong> ${escapeHtml(cliente.celular || "—")}</p>
      <p><strong>Registrado em:</strong> ${cliente.createdAt ? new Date(cliente.createdAt).toLocaleString("pt-BR") : "—"}</p>
      <div class="modal-actions">
        <button id="closeClienteModal" class="success">Fechar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector("#closeClienteModal").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => e.target === overlay && overlay.remove());
}

// -------------------- PRODUTOS (CRUD) --------------------
let produtosPage = 1;
const produtosLimit = 10;
let produtosTotalPages = 1;
let produtosCache = [];

async function initProdutos() {
  clearMain();
  const main = document.querySelector(".main");

  main.innerHTML = `
    <header>
      <h1>Produtos</h1>
      <div style="display:flex;gap:10px;align-items:center;">
        <button id="addProduto" class="update">+ Novo</button>
      </div>
    </header>

    <section class="table-section">
      <h2>Lista de produtos</h2>
      <div class="filters">
        <label>Buscar:</label>
        <input type="text" id="searchProdutos" placeholder="Nome do produto">
      </div>

      <table>
        <thead>
          <tr><th>ID</th><th>Nome</th><th>Preço</th><th>Estoque</th><th>Ações</th></tr>
        </thead>
        <tbody id="produtosTableBody"></tbody>
      </table>

      <div class="pagination">
        <button id="prevProdutos">«</button>
        <span id="produtosPageInfo"></span>
        <button id="nextProdutos">»</button>
      </div>
    </section>
  `;

  document.getElementById("addProduto").addEventListener("click", () => openProdutoModal());
  document.getElementById("searchProdutos").addEventListener("input", debounce(() => { produtosPage = 1; loadProdutos(); }, 300));
  document.getElementById("prevProdutos").addEventListener("click", () => { if (produtosPage > 1) { produtosPage--; loadProdutos(); } });
  document.getElementById("nextProdutos").addEventListener("click", () => { if (produtosPage < produtosTotalPages) { produtosPage++; loadProdutos(); } });

  await loadProdutos();
}

async function loadProdutos() {
  const search = document.getElementById("searchProdutos")?.value || "";
  try {
    const res = await fetch(`/api/admin/produtos/paginados?page=${produtosPage}&limit=${produtosLimit}&search=${encodeURIComponent(search)}`);
    if (!res.ok) throw new Error("Falha ao carregar produtos");
    const data = await res.json();
    produtosTotalPages = data.totalPages || 1;
    produtosPage = data.page || produtosPage;
    const page = data.page || produtosPage;
    document.getElementById("produtosPageInfo").textContent = `Página ${page} de ${data.totalPages || 1}`;
    produtosCache = data.produtos || [];
    renderProdutosTable(produtosCache);
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar produtos", "error");
  }
}

function renderProdutosTable(produtos) {
  const tbody = document.getElementById("produtosTableBody");
  tbody.innerHTML = "";
  produtos.forEach(p => {
    const preco = Number(p.valor ?? p.preco ?? 0).toFixed(2);
    const estoque = (typeof p.estoque !== "undefined") ? p.estoque : "—";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>#${p.id}</td>
      <td>${escapeHtml(p.nome || "—")}</td>
      <td>R$ ${preco}</td>
      <td>${estoque}</td>
      <td>
        <button class="edit" data-id="${p.id}">Editar</button>
        <button class="delete" data-id="${p.id}">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".edit").forEach(btn => btn.addEventListener("click", () => openProdutoModal(btn.dataset.id)));
  tbody.querySelectorAll(".delete").forEach(btn => btn.addEventListener("click", () => excluirProduto(btn.dataset.id)));
}

function openProdutoModal(id = null) {
  const produto = id ? produtosCache.find(p => String(p.id) === String(id)) || {} : {};
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal">
      <h3>${id ? "Editar Produto" : "Novo Produto"}</h3>
      <label>Nome</label>
      <input id="produtoNome" type="text" value="${escapeHtml(produto.nome || "")}">
      <label>Descrição</label>
      <textarea id="produtoDescricao" rows="3">${escapeHtml(produto.descricao || "")}</textarea>
      <label>Preço</label>
      <input id="produtoValor" type="number" step="0.01" value="${produto.valor ?? produto.preco ?? 0}">
      <label>Estoque</label>
      <input id="produtoEstoque" type="number" value="${produto.estoque ?? 0}">
      <label>Imagem (URL)</label>
      <input id="produtoImagem" type="text" value="${escapeHtml(produto.imagem || produto.image || "")}">
      <div class="modal-actions">
        <button id="saveProduto" class="update">${id ? "Salvar" : "Criar"}</button>
        <button id="cancelProduto">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector("#cancelProduto").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", e => e.target === overlay && overlay.remove());

  overlay.querySelector("#saveProduto").addEventListener("click", async () => {
    const body = {
      nome: document.getElementById("produtoNome").value.trim(),
      descricao: document.getElementById("produtoDescricao").value.trim(),
      valor: parseFloat(document.getElementById("produtoValor").value || 0),
      estoque: parseInt(document.getElementById("produtoEstoque").value || 0),
      imagem: document.getElementById("produtoImagem").value.trim()
    };

    if (!body.nome || isNaN(body.valor)) return showToast("Nome e preço são obrigatórios", "error");

    try {
      const method = id ? "PUT" : "POST";
      const url = id ? `/api/admin/produtos/${id}` : `/api/admin/produtos`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Erro ao salvar produto");
      }
      showToast(id ? "Produto atualizado" : "Produto criado", "success");
      overlay.remove();
      await loadProdutos();
    } catch (err) {
      console.error(err);
      showToast(err.message || "Erro ao salvar produto", "error");
    }
  });
}

async function excluirProduto(id) {
  const ok = await confirmarModal(`Deseja excluir o produto #${id}?`);
  if (!ok) return;
  try {
    const res = await fetch(`/api/admin/produtos/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Erro ao excluir produto");
    }
    showToast("Produto excluído", "success");
    await loadProdutos();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Erro ao excluir produto", "error");
  }
}

// -------------------- NAV / INIT --------------------
function switchTab(tab) {
  if (tab === "dashboard") initDashboard();
  else if (tab === "pedidos") initPedidos();
  else if (tab === "clientes") initClientes();
  else if (tab === "produtos") initProdutos();
}

document.querySelectorAll("#sidebar .menu-item").forEach(item => {
  item.addEventListener("click", e => {
    e.preventDefault();
    const tab = item.dataset.tab; // exemplo: data-tab="dashboard"
    if (!tab) return;
    document.querySelectorAll("#sidebar .menu-item").forEach(i => i.classList.remove("active"));
    item.classList.add("active");
    currentTab = tab;
    switchTab(tab);
  });
});

// inicializa dashboard
setTimeout(() => { initDashboard(); }, 1000);