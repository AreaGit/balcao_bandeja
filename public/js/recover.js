const recoverForm = document.querySelector(".recover-form");

recoverForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();

  if (!email) {
    alert("Digite seu e-mail para continuar!");
    return;
  }

  // Aqui futuramente você pode integrar com backend
  alert("Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.");
  recoverForm.reset();
});
