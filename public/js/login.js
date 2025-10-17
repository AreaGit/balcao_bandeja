const loginForm = document.querySelector(".login-form");
const senhaInput = document.getElementById("password");
const toggleSenha = document.querySelector(".toggle-senha");
const twoFAContainer = document.getElementById("twofa-container");
const twoFAInput = document.getElementById("twofa-code");
const verify2FAButton = document.getElementById("verify-2fa");

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
  } else {
    senhaInput.type = "password";
  }
});

// Login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = senhaInput.value.trim();

  if (!email || !password) {
    showNotification("❌ Preencha todos os campos!", "error");
    return;
  }

  try {
    const res = await fetch("/api/auth/login", {
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
    showNotification("✅ Código de Verifição de Duas Etapas Enviado!", "success");
    setTimeout(() => window.location.href = "/autentication", 1500);

  } catch (err) {
    showNotification("❌ Erro de conexão com o servidor", "error");
  }
});

// Verificar 2FA
verify2FAButton.addEventListener("click", async () => {
  const code = twoFAInput.value.trim();
  const userId = loginForm.dataset.tempUserId;

  if (!code) {
    showNotification("❌ Digite o código de verificação", "error");
    return;
  }

  try {
    const res = await fetch("/api/2fa/verify-2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, userId })
    });

    const data = await res.json();

    if (!res.ok) {
      showNotification("❌ " + (data.error || "Código inválido"), "error");
      return;
    }

    showNotification("✅ Código de Verifição de Duas Etapas Enviado!", "success");
    setTimeout(() => window.location.href = "/autentication", 1500);

  } catch (err) {
    showNotification("❌ Erro de conexão com o servidor", "error");
  }
});