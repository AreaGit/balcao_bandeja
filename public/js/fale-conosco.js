document.getElementById("contactForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("statusMsg");
  status.textContent = "Enviando...";
  status.className = "status-msg";

  const payload = {
    nome: document.getElementById("nome").value.trim(),
    email: document.getElementById("email").value.trim(),
    assunto: document.getElementById("assunto").value.trim(),
    mensagem: document.getElementById("mensagem").value.trim()
  };

  try {
    const res = await fetch("/fale-conosco", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      const firstErr = data?.errors?.[0]?.msg || data?.error || "Erro ao enviar mensagem.";
      status.textContent = firstErr;
      status.classList.add("error");
      return;
    }

    status.textContent = "Mensagem enviada com sucesso! ✅";
    status.classList.add("success");
    e.target.reset();
  } catch (err) {
    status.textContent = "Erro ao enviar mensagem. Tente novamente.";
    status.classList.add("error");
    console.error(err);
  }
});