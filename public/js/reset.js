const resetForm = document.querySelector(".reset-form");

resetForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const password = document.getElementById("password").value.trim();
  const confirmPassword = document.getElementById("confirm-password").value.trim();

  if (!password || !confirmPassword) {
    alert("Preencha todos os campos!");
    return;
  }

  if (password.length < 6) {
    alert("A senha deve ter pelo menos 6 caracteres.");
    return;
  }

  if (password !== confirmPassword) {
    alert("As senhas não coincidem!");
    return;
  }

  // Aqui futuramente vai integração com backend
  alert("Senha redefinida com sucesso! Agora você pode fazer login.");
  resetForm.reset();
});
