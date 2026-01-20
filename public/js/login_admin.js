const loginForm = document.querySelector(".login-form");
const senhaInput = document.getElementById("password");
const toggleSenha = document.querySelector(".toggle-senha");
const twoFAContainer = document.getElementById("twofa-container");

// garante estado inicial
senhaInput.type = "password";
twoFAContainer.style.display = "none";

// =======================
// NOTIFICAÇÃO
// =======================
function showNotification(message, type = "info") {
  const container = document.getElementById("notifications");
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerText = message;

  container.appendChild(notification);
  setTimeout(() => notification.remove(), 4000);
}

// =======================
// TOGGLE SENHA
// =======================
toggleSenha.addEventListener("click", () => {
  const isPassword = senhaInput.type === "password";
  senhaInput.type = isPassword ? "text" : "password";

  document.getElementById("eye-open").style.display = isPassword ? "block" : "none";
  document.getElementById("eye-closed").style.display = isPassword ? "none" : "block";
});

// =======================
// LOGIN ADMIN
// =======================
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

    if (!res.ok && !data.twoFARequired) {
      showNotification(data.error || "Erro ao efetuar login", "error");
      return;
    }

    // 🔐 2FA necessário
    if (data.twoFARequired) {
      showNotification("📩 Código de verificação enviado para seu e-mail", "info");
      window.location.href = "/autentication_admin";
      return;
    }

    // 🔓 Login direto
    showNotification("✅ Login administrativo realizado!", "success");
    setTimeout(() => {
      window.location.href = "/administrativo";
    }, 1200);

  } catch (err) {
    console.error(err);
    showNotification("❌ Erro de conexão com o servidor", "error");
  }
});