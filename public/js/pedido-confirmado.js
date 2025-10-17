async function carregarPedido() {
  const params = new URLSearchParams(window.location.search);
  const pedidoId = params.get("pedidoId");

  try {
    const res = await fetch(`/api/pedidos/${pedidoId}`);
    const pedido = await res.json();

    if (!pedido) throw new Error("Pedido não encontrado");
    
    if(pedido.paymentType == "BOLETO") {
      document.getElementById("tltPag").textContent = "Pedido em Aberto 🎉";
      document.getElementById("tltPed").textContent = "Pedido em Aberto 🎉";
      document.getElementById("subTltPed").innerHTML = "Seu pedido está em aberto esperando o pagamento do boleto! <br> Após o pagamento ele será registrado com sucesso."
    }

    document.getElementById("pedido-id").textContent = pedido.id;
    document.getElementById("pedido-nome").textContent = pedido.usuario.nome;
    document.getElementById("pedido-email").textContent = pedido.usuario.email;
    document.getElementById("pedido-endereco").textContent = JSON.parse(pedido.endereco);
    document.getElementById("pedido-frete").textContent = `${JSON.parse(pedido.frete).name} - R$ ${JSON.parse(pedido.frete).price}`;
    document.getElementById("pedido-prazo").textContent = `${JSON.parse(pedido.frete).delivery_time} dias úteis`;
    document.getElementById("pedido-frete-empresa").textContent = JSON.parse(pedido.frete).company.name;
    document.getElementById("pedido-frete-logo").src = JSON.parse(pedido.frete).company.picture;
    document.getElementById("pedido-pagamento").textContent = pedido.formaPagamento;
    document.getElementById("pedido-status").textContent = pedido.status;
    document.getElementById("pedido-total").textContent = `R$ ${pedido.total}`;
    document.getElementById("pedido-data").textContent = new Date(pedido.createdAt).toLocaleString();
    document.getElementById("total-pedido").textContent = `R$ ${pedido.total}`;

    const itensList = document.getElementById("pedido-itens-list");
    pedido.itens.forEach(item => {
      const produto = item.produto;
      const div = document.createElement("div");
      div.classList.add("item-card");
      div.innerHTML = `
        <img src="${produto.imagens[0]}" alt="${produto.nome}">
        <h3>${produto.nome}</h3>
        <p>Quantidade: ${item.quantidade}</p>
        <p>Preço unitário: R$ ${item.precoUnitario}</p>
      `;
      itensList.appendChild(div);
    });
  } catch (err) {
    
  }
}

carregarPedido();