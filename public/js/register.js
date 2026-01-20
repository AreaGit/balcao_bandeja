const form = document.querySelector(".register-form");
const senha = document.getElementById("senha");
const confirmSenha = document.getElementById("confirm-senha");

function showNotification(message, type = "info") {
  const container = document.getElementById("notifications");
  const notification = document.createElement("div");
  notification.classList.add("notification", type);
  notification.innerText = message;

  container.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 5000); // desaparece após 5s
}

// Funções de máscara -----------------
function maskCPF(value) {
  return value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function maskCelular(value) {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/g, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}
function maskTelefone(value) {
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{2})(\d)/g, "($1) $2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}
function maskCEP(value) {
  return value.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2");
}

// Aplicar máscaras em tempo real ----
document.getElementById("cpf").addEventListener("input", (e) => {
  e.target.value = maskCPF(e.target.value);
});
document.getElementById("celular").addEventListener("input", (e) => {
  e.target.value = maskCelular(e.target.value);
});
document.getElementById("telefoneFixo").addEventListener("input", (e) => {
  e.target.value = maskTelefone(e.target.value);
});
document.getElementById("cep").addEventListener("input", (e) => {
  e.target.value = maskCEP(e.target.value);
});

// Consulta ViaCEP -------------------
async function buscarCEP(cep) {
  cep = cep.replace(/\D/g, "");
  if (cep.length !== 8) return;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();

    if (data.erro) {
      showNotification("❌ CEP Não Encontrado!!!", "error");
      return;
    }

    document.getElementById("rua").value = data.logradouro || "";
    document.getElementById("bairro").value = data.bairro || "";
    document.getElementById("cidade").value = data.localidade || "";
    document.getElementById("estado").value = data.uf || "";

  } catch (err) {
    showNotification("❌ Erro ao buscar CEP", "error");
  }
}

document.getElementById("cep").addEventListener("blur", (e) => {
  buscarCEP(e.target.value);
});

// Validações extras -----------------
function validarCPF(cpf) {
  cpf = cpf.replace(/[^\d]+/g, "");
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;

  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Regex simples: texto@texto.dominio
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Submissão do formulário ----------
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Verifica se todos os campos obrigatórios foram preenchidos
  const camposObrigatorios = [
    "nome", "cpf", "celular", "sexo", "dataNascimento",
    "cep", "rua", "numero", "bairro", "cidade", "estado",
    "email", "senha", "confirm-senha"
  ];

  for (const campo of camposObrigatorios) {
    const input = document.getElementById(campo);
    if (!input || input.value.trim() === "") {
      showNotification(`❌ O campo "${campo}" é obrigatório!`, "error");
      input.focus();
      return;
    }
  }

  if (senha.value !== confirmSenha.value) {
    showNotification("❌ As senhas não coincidem!", "error");
    return;
  }

  const cpf = document.getElementById("cpf").value;
  if (!validarCPF(cpf)) {
    showNotification("❌ CPF inválido!", "error");
    return;
  }

  const email = document.getElementById("email").value;
  if (!emailRegex.test(email)) {
    showNotification("Digite um e-mail válido (ex: exemplo@dominio.com).", "error");
    return;
  }

  // Se tudo passou, cria objeto com os dados
  const data = {
    nome: document.getElementById("nome").value,
    cpf: document.getElementById("cpf").value,
    celular: document.getElementById("celular").value,
    telefoneFixo: document.getElementById("telefoneFixo").value,
    sexo: document.getElementById("sexo").value,
    dataNascimento: document.getElementById("dataNascimento").value,
    email: document.getElementById("email").value,
    senha: document.getElementById("senha").value,
    cep: document.getElementById("cep").value,
    rua: document.getElementById("rua").value,
    numero: document.getElementById("numero").value,
    complemento: document.getElementById("complemento").value,
    referencia: document.getElementById("referencia").value,
    bairro: document.getElementById("bairro").value,
    cidade: document.getElementById("cidade").value,
    estado: document.getElementById("estado").value,
  };

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!res.ok) {
      showNotification("❌ " + (result.error || "Erro ao cadastrar"), "error");
      return;
    }

    showNotification("📩 Código de verificação enviado para seu e-mail", "success");
    form.reset();
    window.scrollTo({ top: 0, behavior: "smooth" });

    setTimeout(() => {
      window.location.href = `/autentication?userId=${result.userId}`;
    }, 1500);
  } catch (err) {
    showNotification("❌ Erro de conexão com o servidor", "error");
  }
});

// Mostrar/Esconder senha -------------------
document.querySelectorAll(".toggle-senha").forEach(btn => {
  btn.addEventListener("click", () => {
    const targetId = btn.getAttribute("data-target");
    const input = document.getElementById(targetId);

    if (input.type === "password") {
      input.type = "text";
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1E1939"><path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z"/></svg>`; // troca o ícone
    } else {
      input.type = "password";
      btn.innerHTML = `              <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1E1939"><path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z"/></svg>`; // volta o ícone
    }
  });
});
