const loginForm = document.querySelector(".login-form");
const senhaInput = document.getElementById("password");
senhaInput.type = password;
const toggleSenha = document.querySelector(".toggle-senha");
const twoFAContainer = document.getElementById("twofa-container");
const twoFAInput = document.getElementById("twofa-code");
const verify2FAButton = document.getElementById("verify-2fa");

if (senhaInput.type === "password") {
  senhaInput.type = "text";
  document.getElementById("eye-open").style.display = "block";
  document.getElementById("eye-closed").style.display = "none";
} else {
  senhaInput.type = "password";
  document.getElementById("eye-closed").style.display = "block";
  document.getElementById("eye-open").style.display = "none";
}

// Função de notificação
function showNotification(message, type = "info") {
  const container = document.getElementById("notifications");
  const notification = document.createElement("div");
  notification.classList.add("notification", type);
  notification.innerText = message;

  container.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Mostrar/Esconder senha
toggleSenha.addEventListener("click", () => {
  if (senhaInput.type === "password") {
    senhaInput.type = "text";
    document.getElementById("eye-open").style.display = "block";
    document.getElementById("eye-closed").style.display = "none";
  } else {
    senhaInput.type = "password";
    document.getElementById("eye-closed").style.display = "block";
    document.getElementById("eye-open").style.display = "none";
  }
});


loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = senhaInput.value.trim();

  if (!email || !password) {
    showNotification("❌ Preencha todos os campos!", "error");
    return;
  }

    try {
    const res = await fetch("/api/auth/login-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha: password })
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.twoFARequired) {
        // Mostra o campo de 2FA
        twoFAContainer.style.display = "block";
        showNotification("📩 Código 2FA enviado para seu e-mail", "info");

        // Armazena usuário temporário no JS para enviar junto com o código
        loginForm.dataset.tempUserId = data.userId;
      } else {
        showNotification("❌ " + (data.error || "Erro ao efetuar login"), "error");
      }
      return;
    }

    // Login sem 2FA
    showNotification("✅ Realizado com Sucesso!", "success");
    setTimeout(() => window.location.href = "/autentication_admin", 1500);

  } catch (err) {
    showNotification("❌ Erro de conexão com o servidor", "error");
  }

});