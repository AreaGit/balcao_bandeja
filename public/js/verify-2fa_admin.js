const inputs = document.querySelectorAll('.code-inputs input');
  const form = document.getElementById('verify-form');

  // Auto foco
  inputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      if(input.value && index < inputs.length - 1){
        inputs[index + 1].focus();
      }
    });
    input.addEventListener('keydown', (e) => {
      if(e.key === "Backspace" && !input.value && index > 0){
        inputs[index - 1].focus();
      }
    });
  });

  // Submissão para o backend
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const code = Array.from(inputs).map(i => i.value).join('');
    if(code.length !== 6){
      showNotification("Digite os 6 dígitos", "error");
      return;
    }

    try {
      const res = await fetch("/api/2fa/verify-2fa-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });

      const data = await res.json();
      if(!res.ok){
        showNotification(data.error || "Erro na verificação", "error");
        return;
      }

      showNotification("Login confirmado!", "success");
      setTimeout(() => {
        window.location.href = "/administrativo"; // Redireciona para o painel
      }, 1500);

    } catch (err) {
      console.error(err);
      showNotification("Erro de conexão", "error");
    }
  });

  function showNotification(message, type="info"){
    const notif = document.getElementById('notifications');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 4000);
  }