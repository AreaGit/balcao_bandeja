document.addEventListener("DOMContentLoaded", async () => {
  const meRes = await fetch("/api/me-admin");
  const meData = await meRes.json();

  console.log(meData)

  if(meData.loggedIn == false) {
    alert("Faça o login para poder acessar o painel, Redirecionando...");
    window.location.href = "/login_admin";
  }
})

// sombra no header ao rolar
const mainEl = document.querySelector('.main');
const headerEl = document.querySelector('.main > header');
mainEl.addEventListener('scroll', () => {
  headerEl.style.boxShadow = mainEl.scrollTop > 6 ? '0 10px 24px rgba(6,8,22,.28)' : 'none';
});

// alternar colapso da sidebar
document.getElementById('toggleBtn')?.addEventListener('click', () => {
  document.getElementById('sidebar')?.classList.toggle('collapsed');
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

function showLoading(tbody) {
  tbody.innerHTML = `<tr><td colspan="10" style="text-align:center">
    <div class="spinner"></div>
  </td></tr>`;
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
    <section class="chart-section">
      <h2>Balanço Financeiro (Últimos 12 meses)</h2>
      <canvas id="financeChart"></canvas>
      <div class="finance-summary">
        <div class="card accent"><h3>Lucro Anual</h3><p id="lucroAnual">--</p></div>
        <div class="card success"><h3>Margem Média</h3><p id="margemMedia">--</p></div>
        <div class="card warning"><h3>Crescimento Mensal</h3><p id="crescimentoMes">--</p></div>
      </div>
    </section>
  `;

  try {
    const [cards, pedidos, vendas, balanco] = await Promise.all([
      fetchDashboardCards(),
      fetchOrders(),
      fetchSales(),
      fetch("/api/admin/financeiro/balanco").then(r => r.json())
    ]);

    renderCards(cards);
    renderChart(vendas);
    renderFinanceChart(balanco.meses);
    renderFinanceSummary(balanco.resumo);
    loadIndicadoresGerais();
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

function renderFinanceChart(data) {
  const ctx = document.getElementById("financeChart").getContext("2d");

  if (window.financeChartInstance) {
    window.financeChartInstance.destroy();
  }

  window.financeChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map(d => d.mes),
      datasets: [
        {
          label: "Vendas (R$)",
          data: data.map(d => d.vendas),
          borderColor: "#E7FF14",
          backgroundColor: "rgba(231,255,20,0.2)",
          tension: 0.4,
          fill: true
        },
        {
          label: "Custos (R$)",
          data: data.map(d => d.custos),
          borderColor: "#e63946",
          backgroundColor: "rgba(230,57,70,0.15)",
          tension: 0.4,
          fill: true
        },
        {
          label: "Lucro Líquido (R$)",
          data: data.map(d => d.lucro),
          borderColor: "#2fbf71",
          backgroundColor: "rgba(47,191,113,0.15)",
          tension: 0.4,
          fill: true
        }
      ]
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

function renderFinanceSummary(resumo) {
  const lucro = Number(resumo.totalLucroAno || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const margem = `${resumo.margemMedia.toFixed(1)}%`;
  const crescimento = `${resumo.crescimento.toFixed(1)}%`;

  document.getElementById("lucroAnual").textContent = lucro;
  document.getElementById("margemMedia").textContent = margem;
  document.getElementById("crescimentoMes").textContent = crescimento;

  // cor dinâmica no crescimento
  const el = document.getElementById("crescimentoMes");
  el.style.color = resumo.crescimento >= 0 ? "var(--success)" : "var(--danger)";
}

async function loadIndicadoresGerais() {
  try {
    const res = await fetch("/api/admin/indicadores");
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Erro ao carregar indicadores");

    const main = document.querySelector(".main");
    const section = document.createElement("section");
    section.className = "summary dashboard-summary";
    section.innerHTML = `
      <h2>Indicadores da Plataforma</h2>
      <div class="grid-indicadores">
        <div class="card accent"><h3>Pedidos</h3><p>${data.pedidos.total}</p></div>
        <div class="card success"><h3>Vendas Totais</h3><p>R$ ${data.pedidos.vendasTotais.toFixed(2)}</p></div>
        <div class="card warning"><h3>Ticket Médio</h3><p>R$ ${data.pedidos.ticketMedio.toFixed(2)}</p></div>
        <div class="card accent"><h3>Clientes</h3><p>${data.clientes.total}</p></div>
        <div class="card success"><h3>Novos Clientes</h3><p>${data.clientes.novos}</p></div>
        <div class="card accent"><h3>Produtos</h3><p>${data.produtos.total}</p></div>
        <div class="card warning"><h3>Estoque Baixo</h3><p>${data.produtos.baixoEstoque}</p></div>
        <div class="card success"><h3>Carrinhos Ativos</h3><p>${data.carrinhos.ativos}</p></div>
        <div class="card warning"><h3>Carrinhos Abandonados</h3><p>${data.carrinhos.abandonados}</p></div>
        <div class="card accent"><h3>Newsletter</h3><p>${data.newsletter.total}</p></div>
      </div>
    `;
    main.appendChild(section);
  } catch (err) {
    console.error(err);
    showToast(err.message, "error");
  }
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
    console.log(c)
    tr.innerHTML = `
      <td>#${c.id}</td>
      <td>${escapeHtml(c.nome || "—")}</td>
      <td>${escapeHtml(c.email || "—")}</td>
      <td>${escapeHtml(c.celular || "—")}</td>
      <td>${escapeHtml(created)}</td>
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
      <h3>Detalhes #${cliente.id || ""}</h3>
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

async function openProdutoModal(id = null) {
  const isNew = !id;
  const produto = isNew ? {} : (produtosCache.find(p => String(p.id) === String(id)) || {});
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  // util: normaliza valores que podem vir como array, JSON string ou CSV
  function normalizeArray(val) {
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
      const s = val.trim();
      if (!s) return [];
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
      return s.split(",").map(v => v.trim()).filter(Boolean);
    }
    return [];
  }

  let imagensState = normalizeArray(produto.imagens)
    .concat(normalizeArray(produto.imagem))
    .filter(Boolean);

  const coresState = normalizeArray(produto.cores);

  overlay.innerHTML = `
    <div class="modal modal-produto">
      <h3>${isNew ? "Novo Produto" : "Editar Produto"}</h3>

      <div class="produto-info editable-grid">
        ${
          isNew
            ? `
          <label>Nome</label>
          <input id="new_nome" type="text" placeholder="Nome do produto">

          <label>Descrição</label>
          <textarea id="new_descricao" placeholder="Descrição detalhada..."></textarea>

          <label>Categoria</label>
          <input id="new_categoria" type="text" placeholder="Ex: Bandejas">

          <label>Preço</label>
          <input id="new_valor" type="number" step="0.01" placeholder="0.00">

          <label>Preço Promocional</label>
          <input id="new_valorPromocional" type="number" step="0.01" placeholder="0.00">

          <label>Estoque</label>
          <input id="new_estoque" type="number" placeholder="0">

          <label>Peso (kg)</label>
          <input id="new_peso" type="number" step="0.001" placeholder="0.000">

          <label>Altura (cm)</label>
          <input id="new_altura" type="number" step="0.01" placeholder="0.00">

          <label>Largura (cm)</label>
          <input id="new_largura" type="number" step="0.01" placeholder="0.00">

          <label>Comprimento (cm)</label>
          <input id="new_comprimento" type="number" step="0.01" placeholder="0.00">

          <label>Cores (separe por vírgula)</label>
          <input id="new_cores" type="text" placeholder="Ex: BRANCO, AZUL, VERMELHO">
        `
            : Object.entries(produto)
                .map(([key, value]) => {
                  if (["id", "createdAt", "updatedAt", "imagens"].includes(key)) return "";
                  if (Array.isArray(value)) value = value.join(", ");
                  if (value === true) value = "✅ Sim";
                  if (value === false) value = "❌ Não";
                  return `
                    <p data-prop="${key}" class="editable">
                      <strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong>
                      <span class="value">${value ?? "—"}</span>
                    </p>`;
                })
                .join("")
        }

        <div class="imagens-bloco">
          <h4>Imagens</h4>
          <div class="imagens-grid" id="imagensContainer"></div>
          <button id="addImagemBtn" class="add-btn">+ Adicionar Imagem</button>
        </div>
      </div>

      <div id="saveChangesContainer" class="modal-actions ${isNew ? "" : "hidden"}">
        <button id="saveProduto" class="update">${isNew ? "Criar Produto" : "Salvar Alterações"}</button>
        <button id="closeProdutoModal" class="success">Fechar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const changedData = {};
  const container = overlay.querySelector("#imagensContainer");

  function renderImagens() {
    container.innerHTML = "";
    if (!imagensState.length) {
      container.innerHTML = "<p><em>Sem imagens disponíveis.</em></p>";
      return;
    }
    imagensState.forEach((url, index) => {
      const div = document.createElement("div");
      div.className = "img-box fade-in";
      div.draggable = true;
      div.dataset.index = index;
      div.innerHTML = `
        <img src="${url}" alt="Imagem do Produto" loading="lazy" />
        <button class="remove-img" title="Remover">×</button>
        <span class="drag-handle" title="Mover">⋮⋮</span>
      `;
      container.appendChild(div);
    });
  }
  renderImagens();

  // === EDIÇÃO INLINE ===
  if (!isNew) {
    overlay.querySelectorAll(".editable").forEach(el => {
      el.addEventListener("click", () => {
        const key = el.dataset.prop;
        const valueSpan = el.querySelector(".value");
        const currentValue = valueSpan.textContent.trim();

        if (el.querySelector("input, textarea")) return;
        const input = document.createElement(currentValue.length > 40 ? "textarea" : "input");
        input.value = currentValue === "—" ? "" : currentValue;
        input.className = "edit-input";
        valueSpan.replaceWith(input);
        input.focus();

        input.addEventListener("blur", () => {
          const newValue = input.value.trim() || "—";
          if (key === "cores" && newValue !== "—") {
            const arr = newValue.split(",").map(c => c.trim().toUpperCase()).filter(Boolean);
            changedData[key] = arr;
          } else if (newValue !== currentValue) {
            changedData[key] = newValue;
          }
          const span = document.createElement("span");
          span.className = "value";
          span.textContent = newValue;
          input.replaceWith(span);
          document.getElementById("saveChangesContainer").classList.remove("hidden");
        });
      });
    });
  }

  // === ADICIONAR / REMOVER IMAGEM ===
  const addBtn = overlay.querySelector("#addImagemBtn");
  addBtn.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Cole a URL da imagem e pressione Enter";
    input.className = "edit-input";
    addBtn.insertAdjacentElement("beforebegin", input);
    input.focus();

    const commit = () => {
      const url = (input.value || "").trim();
      if (!url) { input.remove(); return; }
      if (imagensState.includes(url)) {
        showToast("Essa imagem já existe!", "error");
        input.remove();
        return;
      }
      imagensState.push(url);
      renderImagens();
      input.remove();
      if (!isNew) {
        changedData.imagens = [...imagensState];
        document.getElementById("saveChangesContainer").classList.remove("hidden");
      }
      showToast("Imagem adicionada!", "success");
    };
    input.addEventListener("keydown", e => { if (e.key === "Enter") commit(); if (e.key === "Escape") input.remove(); });
    input.addEventListener("blur", commit);
  });

  container.addEventListener("click", e => {
    if (!e.target.classList.contains("remove-img")) return;
    const url = e.target.previousElementSibling?.src || "";
    imagensState = imagensState.filter(u => u !== url);
    renderImagens();
    if (!isNew) {
      changedData.imagens = [...imagensState];
      document.getElementById("saveChangesContainer").classList.remove("hidden");
    }
    showToast("Imagem removida!", "error");
  });

  // === SALVAR ALTERAÇÕES / CRIAR NOVO PRODUTO ===
  overlay.querySelector("#saveProduto").addEventListener("click", async () => {
    if (isNew) {
      // criação
      const body = {
        nome: document.querySelector("#new_nome").value.trim(),
        descricao: document.querySelector("#new_descricao").value.trim(),
        categoria: document.querySelector("#new_categoria").value.trim(),
        valor: parseFloat(document.querySelector("#new_valor").value) || 0,
        valorPromocional: parseFloat(document.querySelector("#new_valorPromocional").value) || 0,
        estoque: parseInt(document.querySelector("#new_estoque").value) || 0,
        peso: document.querySelector("#new_peso").value || "0",
        altura: document.querySelector("#new_altura").value || "0",
        largura: document.querySelector("#new_largura").value || "0",
        comprimento: document.querySelector("#new_comprimento").value || "0",
        cores: document.querySelector("#new_cores").value.split(",").map(c => c.trim().toUpperCase()).filter(Boolean),
        imagens: imagensState
      };
      if (!body.nome || !body.valor) {
        showToast("Preencha o nome e o preço.", "error");
        return;
      }
      try {
        const res = await fetch("/api/admin/produtos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Erro ao criar produto");
        showToast("Produto criado com sucesso!", "success");
        overlay.remove();
        await loadProdutos();
      } catch (err) {
        console.error(err);
        showToast(err.message, "error");
      }
      return;
    }

    // edição normal
    imagensState = [...container.querySelectorAll(".img-box img")].map(img => img.src);
    const originalImagens = normalizeArray(produto.imagens).concat(normalizeArray(produto.imagem));
    const imagensChanged = JSON.stringify(originalImagens) !== JSON.stringify(imagensState);
    if (imagensChanged) changedData.imagens = [...imagensState];
    if (typeof changedData.cores === "string") {
      try { changedData.cores = JSON.parse(changedData.cores); }
      catch { changedData.cores = normalizeArray(changedData.cores).map(c => c.toUpperCase()); }
    }
    try {
      const res = await fetch(`/api/admin/produtos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changedData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao salvar alterações");
      showToast("Produto atualizado com sucesso!", "success");
      overlay.remove();
      await loadProdutos();
    } catch (err) {
      console.error(err);
      showToast(err.message || "Erro ao salvar alterações", "error");
    }
  });

  overlay.querySelector("#closeProdutoModal").onclick = () => overlay.remove();
  overlay.onclick = e => e.target === overlay && overlay.remove();
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

// -------------------- CUPONS (CRUD) --------------------
let cuponsPage = 1;
const cuponsLimit = 10;
let cuponsTotalPages = 1;
let cuponsCache = [];

async function initCupons() {
  clearMain();
  const main = document.querySelector(".main");

  main.innerHTML = `
    <header>
      <h1>Cupons</h1>
      <button id="addCoupon" class="update">+ Novo Cupom</button>
    </header>

    <section class="table-section">
      <h2>Lista de Cupons</h2>
      <div class="filters">
        <label>Buscar:</label>
        <input type="text" id="searchCupons" placeholder="Código ou descrição">
      </div>

      <table>
        <thead>
          <tr><th>ID</th><th>Código</th><th>Descrição</th><th>Desconto (%)</th><th>Expira em</th><th>Ativo</th><th>Ações</th></tr>
        </thead>
        <tbody id="cuponsTableBody"></tbody>
      </table>

      <div class="pagination">
        <button id="prevCupons">«</button>
        <span id="cuponsPageInfo"></span>
        <button id="nextCupons">»</button>
      </div>
    </section>
  `;

  document.getElementById("addCoupon").addEventListener("click", () => openCouponModal());
  document.getElementById("searchCupons").addEventListener("input", debounce(() => { cuponsPage = 1; loadCupons(); }, 300));
  document.getElementById("prevCupons").addEventListener("click", () => { if (cuponsPage > 1) { cuponsPage--; loadCupons(); } });
  document.getElementById("nextCupons").addEventListener("click", () => { if (cuponsPage < cuponsTotalPages) { cuponsPage++; loadCupons(); } });

  await loadCupons();
}

async function loadCupons() {
  const search = document.getElementById("searchCupons")?.value || "";
  try {
    const res = await fetch(`/api/admin/cupons/paginados?page=${cuponsPage}&limit=${cuponsLimit}&search=${encodeURIComponent(search)}`);
    if (!res.ok) throw new Error("Erro ao carregar cupons");
    const data = await res.json();

    cuponsCache = data.cupons || [];
    cuponsTotalPages = data.totalPages || 1;
    document.getElementById("cuponsPageInfo").textContent = `Página ${data.page} de ${data.totalPages || 1}`;

    renderCuponsTable(cuponsCache);
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar cupons", "error");
  }
}

function renderCuponsTable(cupons) {
  const tbody = document.getElementById("cuponsTableBody");
  tbody.innerHTML = "";

  cupons.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>#${c.id}</td>
      <td>${c.code}</td>
      <td>${c.description || "—"}</td>
      <td>${parseFloat(c.discount_percent).toFixed(2)}%</td>
      <td>${c.expires_at ? new Date(c.expires_at).toLocaleDateString("pt-BR") : "—"}</td>
      <td>${c.active ? "✅" : "❌"}</td>
      <td>
        <button class="edit" data-id="${c.id}">Editar</button>
        <button class="delete" data-id="${c.id}">Excluir</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".edit").forEach(btn => btn.addEventListener("click", () => openCouponModal(btn.dataset.id)));
  tbody.querySelectorAll(".delete").forEach(btn => btn.addEventListener("click", () => excluirCoupon(btn.dataset.id)));
}

async function openCouponModal(id = null) {
  const isNew = !id;
  const coupon = isNew ? {} : (cuponsCache.find(c => String(c.id) === String(id)) || {});
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  overlay.innerHTML = `
    <div class="modal modal-coupon">
      <h3>${isNew ? "Novo Cupom" : "Editar Cupom"}</h3>
      <label>Código</label>
      <input id="coupon_code" type="text" value="${coupon.code || ""}" placeholder="Ex: PROMO10">

      <label>Descrição</label>
      <input id="coupon_description" type="text" value="${coupon.description || ""}" placeholder="Ex: Desconto de 10%">

      <label>Desconto (%)</label>
      <input id="coupon_discount" type="number" step="0.01" value="${coupon.discount_percent || ""}">

      <label>Data de expiração</label>
      <input id="coupon_expiry" type="date" value="${coupon.expires_at ? new Date(coupon.expires_at).toISOString().split('T')[0] : ""}">

      <label>Ativo</label>
      <select id="coupon_active">
        <option value="true" ${coupon.active ? "selected" : ""}>Sim</option>
        <option value="false" ${!coupon.active ? "selected" : ""}>Não</option>
      </select>

      <div class="modal-actions">
        <button id="saveCoupon" class="update">${isNew ? "Criar Cupom" : "Salvar Alterações"}</button>
        <button id="closeCouponModal" class="success">Fechar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector("#saveCoupon").addEventListener("click", async () => {
    const body = {
      code: document.getElementById("coupon_code").value.trim(),
      description: document.getElementById("coupon_description").value.trim(),
      discount_percent: parseFloat(document.getElementById("coupon_discount").value) || 0,
      expires_at: document.getElementById("coupon_expiry").value || null,
      active: document.getElementById("coupon_active").value === "true"
    };

    try {
      const res = await fetch(isNew ? "/api/admin/cupons" : `/api/admin/cupons/${id}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao salvar cupom");

      showToast(isNew ? "Cupom criado com sucesso!" : "Cupom atualizado!", "success");
      overlay.remove();
      await loadCupons();
    } catch (err) {
      console.error(err);
      showToast(err.message, "error");
    }
  });

  overlay.querySelector("#closeCouponModal").onclick = () => overlay.remove();
  overlay.onclick = e => e.target === overlay && overlay.remove();
}

async function excluirCoupon(id) {
  const ok = await confirmarModal(`Deseja excluir o cupom #${id}?`);
  if (!ok) return;
  try {
    const res = await fetch(`/api/admin/cupons/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Erro ao excluir cupom");
    showToast("Cupom excluído com sucesso", "success");
    await loadCupons();
  } catch (err) {
    console.error(err);
    showToast(err.message, "error");
  }
}

// ==================== CARRINHOS (ADMIN) ====================
// Endpoints que usaremos (Admin + cart público)
const CART_API_BASE = "/api/cart";               // rotas já existentes que você mandou
const CART_ADMIN_API = "/api/admin/carrinhos";   // novas rotas admin (ver item 4)

function fmtMoney(n) {
  const v = Number(n || 0);
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function isAbandoned(cart) {
  // regra simples: carrinho com itens e atualizado há > 24h, sem pedido finalizado
  const updated = new Date(cart.updatedAt || cart._updatedAt || cart._ts || Date.now());
  const diffH = (Date.now() - updated.getTime()) / 36e5;
  return (cart.items?.length || 0) > 0 && diffH >= 24 && !cart.orderId;
}

let carrinhosPage = 1;
const carrinhosLimit = 10;
let carrinhosTotalPages = 1;

async function initCarrinhos() {
  clearMain();
  const main = document.querySelector(".main");

  main.innerHTML = `
    <header>
      <h1>Carrinhos</h1>
      <div style="display:flex;gap:10px;align-items:center;">
        <button id="refreshCarts" class="update">Recarregar</button>
      </div>
    </header>

    <section class="table-section">
      <h2>Lista de carrinhos</h2>

      <div class="filters">
        <label>Filtro:</label>
        <select id="cartStatusFilter">
          <option value="">Todos</option>
          <option value="ativos">Ativos</option>
          <option value="abandonados">Abandonados (24h+)</option>
        </select>

        <label>Buscar:</label>
        <input type="text" id="searchCarts" placeholder="ID do carrinho, ID do usuário, e-mail ou nome">

        <button id="bulkRemind" class="update">Lembrar Abandonados (E-mail)</button>
      </div>
      <section class="summary" id="cartSummary">
        <div class="card">Total de Carrinhos: —</div>
        <div class="card success">Ativos: —</div>
        <div class="card warning">Abandonados: —</div>
      </section>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Usuário</th>
            <th>Itens</th>
            <th>Subtotal</th>
            <th>Frete</th>
            <th>Total</th>
            <th>Atualizado</th>
            <th>Status</th>
            <th style="width:220px">Ações</th>
          </tr>
        </thead>
        <tbody id="cartsTableBody"></tbody>
      </table>

      <div class="pagination">
        <button id="prevCarts">«</button>
        <span id="cartsPageInfo"></span>
        <button id="nextCarts">»</button>
      </div>
    </section>
  `;

  document.getElementById("refreshCarts").onclick = () => loadCarts();
  document.getElementById("prevCarts").onclick = () => { if (carrinhosPage > 1) { carrinhosPage--; loadCarts(); } };
  document.getElementById("nextCarts").onclick = () => { if (carrinhosPage < carrinhosTotalPages) { carrinhosPage++; loadCarts(); } };

  document.getElementById("cartStatusFilter").onchange = () => { carrinhosPage = 1; loadCarts(); };
  document.getElementById("searchCarts").addEventListener("input", debounce(() => {
  const term = event.target.value.toLowerCase();
  document.querySelectorAll("#cartsTableBody tr").forEach(tr => {
    tr.style.display = tr.textContent.toLowerCase().includes(term) ? "" : "none";
  });
}, 200));

  document.getElementById("bulkRemind").onclick = async () => {
    try {
      const res = await fetch(`${CART_ADMIN_API}/lembrar-abandonados`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha no disparo de lembretes");
      showToast(`Lembretes enviados: ${data.sent || 0}`, "success");
    } catch (err) {
      console.error(err);
      showToast(err.message, "error");
    }
  };

  await loadCarts();
}

async function loadCarts() {
  const q = document.getElementById("searchCarts")?.value || "";
  const status = document.getElementById("cartStatusFilter")?.value || "";

  try {
    const url = new URL(`${location.origin}${CART_ADMIN_API}/paginados`);
    url.searchParams.set("page", carrinhosPage);
    url.searchParams.set("limit", carrinhosLimit);
    if (q) url.searchParams.set("search", q);
    if (status) url.searchParams.set("status", status);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error("Erro ao carregar carrinhos");
    const data = await res.json();

    const carrinhos = data.carrinhos || [];

    // === Atualiza resumo ===
    const total = carrinhos.length;
    const abandonados = carrinhos.filter(isAbandoned).length;
    const ativos = total - abandonados;

    console.log(total, abandonados, ativos)

    const summary = document.getElementById("cartSummary");
    summary.innerHTML = `
      <div class="card">
        <h3>Total de Carrinhos</h3>
        <p>${total}</p>
      </div>
      <div class="card success">
        <h3>Ativos</h3>
        <p>${ativos}</p>
      </div>
      <div class="card warning">
        <h3>Abandonados</h3>
        <p>${abandonados}</p>
      </div>
    `;

    carrinhosTotalPages = data.totalPages || 1;
    carrinhosPage = data.page || 1;

    document.getElementById("cartsPageInfo").textContent = `Página ${carrinhosPage} de ${carrinhosTotalPages}`;
    renderCartsTable(data.carrinhos || []);
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar carrinhos", "error");
  }
}

function renderCartsTable(carts) {
  const tbody = document.getElementById("cartsTableBody");
  tbody.innerHTML = "";
  carts.forEach(c => {
    const status = isAbandoned(c) ? "Abandonado" : "Ativo";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>#${c.id}</td>
      <td>
        ${c.user?.nome 
          ? escapeHtml(c.user.nome) 
          : (c.guestId ? `Visitante (${c.guestId})` : "—")}
      </td>
      <td>${(c.items?.length || 0)}</td>
      <td>${fmtMoney(c.subtotal)}</td>
      <td>${fmtMoney((c.frete?.price || c.frete?.custom_price || 0))}</td>
      <td>${fmtMoney(c.totalFinal)}</td>
      <td>${c.updatedAt ? new Date(c.updatedAt).toLocaleString("pt-BR") : "—"}</td>
      <td><span class="status ${status === "Abandonado" ? "pendente" : "processando"}">${status}</span></td>
      <td>
        <button class="btn view-cart" data-id="${c.id}">Ver</button>
        <button class="btn remind-cart" data-id="${c.id}">Lembrar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll(".view-cart").forEach(btn => {
    btn.onclick = () => openCartModal(btn.dataset.id);
  });
  tbody.querySelectorAll(".remind-cart").forEach(btn => {
    btn.onclick = () => remindCart(btn.dataset.id);
  });
}

async function remindCart(cartId) {
  try {
    const res = await fetch(`${CART_ADMIN_API}/${cartId}/lembrar`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Falha ao enviar lembrete");
    showToast("Lembrete enviado por e-mail!", "success");
  } catch (err) {
    console.error(err);
    showToast(err.message, "error");
  }
}

async function openCartModal(cartId) {
  // Busca carrinho formatado (usa seu /api/cart/:id)
  let cart;
  try {
    const res = await fetch(`${CART_API_BASE}/${cartId}`);
    if (!res.ok) throw new Error("Erro ao obter carrinho");
    cart = await res.json();
  } catch (err) {
    console.error(err);
    showToast(err.message, "error");
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal modal-produto" style="max-width:900px">
      <div class="pedido-header" style="display:flex;justify-content:space-between;align-items:center;">
        <h3>Carrinho #${cart.id}</h3>
        <button id="closeCartModal" class="pedido-close">&times;</button>
      </div>

      <div class="pedido-info" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px;">
        <p><strong>Usuário:</strong> ${cart.userId || "guest: " + (cart.guestId || "—")}</p>
        <p><strong>Itens:</strong> ${(cart.items?.length || 0)}</p>
        <p><strong>Subtotal:</strong> ${fmtMoney(cart.subtotal)}</p>
        <p><strong>Desconto:</strong> ${fmtMoney(cart.desconto)}</p>
        <p><strong>Frete:</strong> ${fmtMoney(cart.frete?.price || cart.frete?.custom_price || 0)}</p>
        <p><strong>Total:</strong> ${fmtMoney(cart.totalFinal)}</p>
      </div>

      <h4>Itens</h4>
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Cor</th>
            <th>Preço</th>
            <th>Qtd</th>
            <th>Subtotal</th>
            <th style="width:140px">Ações</th>
          </tr>
        </thead>
        <tbody id="cartItemsBody">
          ${renderCartItemsRows(cart.items)}
        </tbody>
      </table>

      <div class="filters" style="margin-top:12px;">
        <input type="number" id="newProductId" placeholder="ID do produto" style="max-width:140px">
        <input type="text" id="newProductCor" placeholder="Cor (opcional)" style="max-width:160px">
        <input type="number" id="newProductQty" placeholder="Qtd" value="1" style="max-width:100px">
        <button id="addItemToCart" class="update">+ Adicionar Item</button>
      </div>

      <div class="filters">
        <input type="text" id="cartCoupon" placeholder="Cupom de desconto" style="max-width:220px" value="${cart.cupom || ""}">
        <button id="applyCoupon" class="update">Aplicar Cupom</button>
      </div>

      <div class="filters">
        <input type="number" id="freteValor" placeholder="Frete R$" style="max-width:120px" value="${cart.frete?.price || cart.frete?.custom_price || ""}">
        <button id="saveFrete" class="update">Atualizar Frete</button>
      </div>

      <div class="modal-actions">
        <button id="remindThisCart" class="update">Enviar Lembrete (E-mail)</button>
        <button id="closeCartModal2" class="success">Fechar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // ações
  overlay.querySelector("#closeCartModal").onclick = () => overlay.remove();
  overlay.querySelector("#closeCartModal2").onclick = () => overlay.remove();

  overlay.querySelector("#addItemToCart").onclick = async () => {
    const productId = parseInt(document.getElementById("newProductId").value);
    const quantity  = parseInt(document.getElementById("newProductQty").value || "1");
    const cor       = (document.getElementById("newProductCor").value || "").trim() || null;
    if (!productId || quantity <= 0) return showToast("Produto e quantidade válidos", "error");
    try {
      const res = await fetch(`${CART_API_BASE}/item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId: cart.id, productId, quantity, cor })
      });
      if (!res.ok) throw new Error((await res.json())?.error || "Erro ao adicionar item");
      showToast("Item adicionado!", "success");
      overlay.remove();
      openCartModal(cart.id);
    } catch (err) { console.error(err); showToast(err.message, "error"); }
  };

  overlay.querySelector("#applyCoupon").onclick = async () => {
    const code = (document.getElementById("cartCoupon").value || "").trim();
    if (!code) return showToast("Informe o cupom", "error");
    try {
      const res = await fetch(`${CART_API_BASE}/${cart.id}/coupon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      if (!res.ok) throw new Error((await res.json())?.error || "Erro ao aplicar cupom");
      showToast("Cupom aplicado!", "success");
      overlay.remove();
      openCartModal(cart.id);
    } catch (err) { console.error(err); showToast(err.message, "error"); }
  };

  overlay.querySelector("#saveFrete").onclick = async () => {
    const v = parseFloat(document.getElementById("freteValor").value || 0);
    try {
      const res = await fetch(`${CART_API_BASE}/update-frete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId: cart.id, frete: { price: v } })
      });
      if (!res.ok) throw new Error((await res.json())?.error || "Erro ao atualizar frete");
      showToast("Frete atualizado!", "success");
      overlay.remove();
      openCartModal(cart.id);
    } catch (err) { console.error(err); showToast(err.message, "error"); }
  };

  overlay.querySelector("#remindThisCart").onclick = () => remindCart(cart.id);

  // eventos de linha (incremento, decremento, remover)
  overlay.querySelector("#cartItemsBody").addEventListener("click", async (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;
    const itemId = tr.dataset.itemId;

    if (e.target.classList.contains("inc")) {
      const qtyEl = tr.querySelector(".qty");
      const newQty = parseInt(qtyEl.value || "1") + 1;
      await updateCartItem(itemId, newQty, cart.id);
    }

    if (e.target.classList.contains("dec")) {
      const qtyEl = tr.querySelector(".qty");
      const newQty = Math.max(0, parseInt(qtyEl.value || "1") - 1);
      await updateCartItem(itemId, newQty, cart.id);
    }

    if (e.target.classList.contains("remove")) {
      await removeCartItem(itemId, cart.id);
    }
  });

  // edição manual de quantidade
  overlay.querySelector("#cartItemsBody").addEventListener("change", async (e) => {
    if (!e.target.classList.contains("qty")) return;
    const tr = e.target.closest("tr");
    const itemId = tr.dataset.itemId;
    const newQty = Math.max(0, parseInt(e.target.value || "0"));
    await updateCartItem(itemId, newQty, cart.id);
  });
}

function renderCartItemsRows(items = []) {
  if (!items.length) {
    return `<tr><td colspan="6" style="text-align:center;color:var(--muted)">Carrinho vazio</td></tr>`;
  }
  return items.map(it => `
    <tr data-item-id="${it.id}">
      <td>${escapeHtml(it.nome || "Produto")}<br><small>#${it.productId}</small></td>
      <td>${escapeHtml(it.cor || "—")}</td>
      <td>${fmtMoney(it.precoUnitario)}</td>
      <td>
        <div style="display:flex;align-items:center;gap:6px">
          <button class="btn dec">−</button>
          <input class="qty" type="number" min="0" value="${it.quantidade}" style="width:70px">
          <button class="btn inc">+</button>
        </div>
      </td>
      <td>${fmtMoney(it.totalItem)}</td>
      <td>
        <button class="btn remove">Remover</button>
      </td>
    </tr>
  `).join("");
}

async function updateCartItem(itemId, quantity, cartId) {
  try {
    const res = await fetch(`${CART_API_BASE}/item/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity })
    });
    if (!res.ok) throw new Error((await res.json())?.error || "Erro ao atualizar item");
    showToast(quantity === 0 ? "Item removido!" : "Quantidade atualizada!", "success");
    // reabrir preenchido
    const overlay = document.querySelector(".modal-overlay");
    if (overlay) overlay.remove();
    openCartModal(cartId);
  } catch (err) {
    console.error(err);
    showToast(err.message, "error");
  }
}

async function removeCartItem(itemId, cartId) {
  try {
    const res = await fetch(`${CART_API_BASE}/item/${itemId}`, { method: "DELETE" });
    if (!res.ok) throw new Error((await res.json())?.error || "Erro ao remover item");
    showToast("Item removido!", "success");
    const overlay = document.querySelector(".modal-overlay");
    if (overlay) overlay.remove();
    openCartModal(cartId);
  } catch (err) {
    console.error(err);
    showToast(err.message, "error");
  }
}

function confirmDialog(msg) {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal confirm-modal">
        <p>${msg}</p>
        <div class="actions">
          <button class="btn yes">Sim</button>
          <button class="btn no">Cancelar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector(".yes").onclick = () => { resolve(true); overlay.remove(); };
    overlay.querySelector(".no").onclick = () => { resolve(false); overlay.remove(); };
  });
}

  window.addEventListener("beforeunload", () => {
    localStorage.setItem("lastTab", currentTab);
  });
  window.addEventListener("DOMContentLoaded", () => {
    const tab = localStorage.getItem("lastTab");
    if (tab) switchTab(tab);
  });

// ==================== NEWSLETTER (ADMIN) ====================

let newsletterPage = 1;
const newsletterLimit = 10;
let newsletterTotalPages = 1;

async function initNewsletter() {
  clearMain();
  const main = document.querySelector(".main");

  main.innerHTML = `
    <header>
      <h1>Newsletter</h1>
      <div style="display:flex;gap:10px;align-items:center;">
        <button id="refreshNewsletter" class="update">Recarregar</button>
        <button id="sendNewsletter" class="success">Enviar Campanha</button>
      </div>
    </header>

    <section class="summary newsletter-summary">
      <div class="card total"><h3>Total Inscritos</h3><p id="totalSubs">--</p></div>
      <div class="card success"><h3>Ativos</h3><p id="ativosSubs">--</p></div>
      <div class="card warning"><h3>Descadastrados</h3><p id="inativosSubs">--</p></div>
      <div class="card accent"><h3>Boas-vindas Enviadas</h3><p id="enviadosSubs">--</p></div>
    </section>

    <section class="chart-section">
      <h2>Envios Automáticos (Últimos 7 dias)</h2>
      <canvas id="newsletterChart"></canvas>
    </section>

    <section class="table-section">
      <h2>Inscritos</h2>
      <div class="filters">
        <label>Buscar:</label>
        <input type="text" id="searchNewsletter" placeholder="Buscar por e-mail ou nome">
      </div>

      <table>
        <thead>
          <tr><th>ID</th><th>Nome</th><th>E-mail</th><th>Status</th><th>Último Envio</th><th>Data</th></tr>
        </thead>
        <tbody id="newsletterTableBody"></tbody>
      </table>
    </section>
  `;

  document.getElementById("refreshNewsletter").onclick = () => loadNewsletterData();
  document.getElementById("sendNewsletter").onclick = () => openNewsletterModal();
  document.getElementById("searchNewsletter").addEventListener("input", debounce(filterNewsletterTable, 300));

  await loadNewsletterData();
}

async function loadNewsletterData() {
  try {
    const [statsRes, listRes] = await Promise.all([
      fetch("/api/newsletter/stats"),
      fetch("/api/newsletter")
    ]);
    const stats = await statsRes.json();
    const list = await listRes.json();
    if (!statsRes.ok) throw new Error(stats?.error || "Erro nas estatísticas");
    if (!listRes.ok) throw new Error(list?.error || "Erro na listagem");

    document.getElementById("totalSubs").textContent = stats.total;
    document.getElementById("ativosSubs").textContent = stats.ativos;
    document.getElementById("inativosSubs").textContent = stats.inativos;
    document.getElementById("enviadosSubs").textContent = stats.enviados;

    renderNewsletterTable(list);

    // Gráfico de linha
    // Gráfico de linha (com destruição segura)
    const ctx = document.getElementById("newsletterChart").getContext("2d");
    const labels = stats.logs.map(l => new Date(l.dia).toLocaleDateString("pt-BR"));
    const dataPoints = stats.logs.map(l => l.total);

    // Se já houver gráfico, destrói antes de criar outro
    if (window.newsletterChartInstance) {
      window.newsletterChartInstance.destroy();
    }

    // Cria novo gráfico e salva referência
    window.newsletterChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Envios de Boas-vindas",
          data: dataPoints,
          backgroundColor: "rgba(231,255,20,0.4)",
          borderColor: "#E7FF14",
          borderWidth: 2
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

  } catch (err) {
    console.error(err);
    showToast(err.message, "error");
  }
}

async function loadNewsletter() {
  try {
    const res = await fetch(`/api/newsletter`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Erro ao carregar inscritos");
    renderNewsletterTable(data);
  } catch (err) {
    console.error(err);
    showToast(err.message, "error");
  }
}

function renderNewsletterTable(subs) {
  const tbody = document.getElementById("newsletterTableBody");
  tbody.innerHTML = "";
  subs.forEach(s => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>#${s.id}</td>
      <td>${s.nome || "—"}</td>
      <td>${s.email}</td>
      <td><span class="status ${s.ativo ? "success" : "danger"}">${s.ativo ? "Ativo" : "Inativo"}</span></td>
      <td>${s.ultimo_envio ? new Date(s.ultimo_envio).toLocaleString("pt-BR") : "—"}</td>
      <td>${new Date(s.createdAt).toLocaleDateString("pt-BR")}</td>
    `;
    tbody.appendChild(tr);
  });
}

function filterNewsletterTable() {
  const term = document.getElementById("searchNewsletter").value.toLowerCase();
  document.querySelectorAll("#newsletterTableBody tr").forEach(tr => {
    tr.style.display = tr.textContent.toLowerCase().includes(term) ? "" : "none";
  });
}

function openNewsletterModal() {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal" style="max-width:600px;">
      <h3>Enviar Campanha de Newsletter</h3>
      <div class="editable-grid">
        <label>Assunto</label>
        <input type="text" id="newsSubject" placeholder="Assunto da mensagem">

        <label>Mensagem</label>
        <textarea id="newsMessage" rows="6" placeholder="Digite aqui o conteúdo do e-mail..."></textarea>

        <label>ID do Cupom (opcional)</label>
        <input type="number" id="newsCoupon" placeholder="Ex: 5">
      </div>

      <div class="modal-actions">
        <button id="sendNewsConfirm" class="update">Enviar</button>
        <button id="closeNewsModal" class="success">Fechar</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector("#closeNewsModal").onclick = () => overlay.remove();
  overlay.onclick = e => e.target === overlay && overlay.remove();

  overlay.querySelector("#sendNewsConfirm").onclick = async () => {
    const assunto = document.getElementById("newsSubject").value.trim();
    const mensagem = document.getElementById("newsMessage").value.trim();
    const cupomId = document.getElementById("newsCoupon").value.trim() || null;
    if (!assunto || !mensagem) return showToast("Preencha assunto e mensagem.", "error");

    try {
      const res = await fetch("/api/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assunto, mensagem, cupomId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao enviar e-mails");
      showToast(`Campanha enviada para ${data.enviados} assinantes!`, "success");
      overlay.remove();
      await loadNewsletter();
    } catch (err) {
      console.error(err);
      showToast(err.message, "error");
    }
  };
}

// -------------------- NAV / INIT --------------------
function switchTab(tab) {
  if (tab === "dashboard") initDashboard();
  else if (tab === "pedidos") initPedidos();
  else if (tab === "clientes") initClientes();
  else if (tab === "produtos") initProdutos();
  else if (tab === "cupons") initCupons();
  else if (tab === "carrinhos") initCarrinhos();
  else if (tab === "newsletter") initNewsletter();
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