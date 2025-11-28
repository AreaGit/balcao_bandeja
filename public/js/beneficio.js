// ========== GSAP ULTRA MODE ==========
gsap.registerPlugin(ScrollTrigger);

// Entrance
const t = gsap.timeline({defaults:{ease:"power3.out", duration:0.9}});
t.from("#logo",{y:-40, opacity:0, ease:"elastic.out(1,0.6)"})
 .from(".hero-left h1",{y:30, opacity:0}, "-=0.5")
 .from(".hero-left p",{y:20, opacity:0}, "-=0.6")
 .from(".hero-visual",{opacity:0, scale:0.5, ease:"back.out(1.8)"}, "-=0.6")
 .from(".card",{y:50, opacity:0}, "-=0.4")
 .from("aside .beneficio-item",{y:30, opacity:0, stagger:0.08});

// Parallax leve no Hero
gsap.to(".hero-visual", {
  yPercent:15,
  ease:"none",
  scrollTrigger:{
    trigger:".hero-visual",
    scrub:1,
    start:"top bottom",
    end:"bottom top",
  }
});

// Hover “magnet” nos benefícios
document.querySelectorAll(".beneficio-item").forEach(item=>{
  item.addEventListener("mousemove", e=>{
    const rect = item.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width/2) * 0.15;
    const y = (e.clientY - rect.top - rect.height/2) * 0.15;
    gsap.to(item,{x,y,duration:0.3});
  });
  item.addEventListener("mouseleave", ()=>{
    gsap.to(item,{x:0,y:0,duration:0.3, ease:"power3.out"});
  });
});

// Scroll reveal suave
gsap.utils.toArray(".card, aside").forEach(el=>{
  gsap.from(el,{
    y:30,
    opacity:0,
    duration:0.9,
    ease:"power3.out",
    scrollTrigger:{
      trigger:el,
      start:"top 85%"
    }
  });
});

// Botão com “pulse intelligence”
gsap.to(".btn-ativar", {
  scale:1.04,
  duration:2.4,
  yoyo:true,
  repeat:-1,
  ease:"sine.inOut",
  repeatDelay:4
});

// ========== FORM + TOAST ==========
const form = document.getElementById("beneficioForm");
const toast = document.getElementById("toast");

function showToast(msg){
  toast.textContent = msg;
  gsap.killTweensOf(toast);
  gsap.to(toast,{opacity:1, y:0, duration:0.4});
  gsap.to(toast,{opacity:0, y:20, delay:3, duration:0.6});
}

form.addEventListener("submit",(e)=>{
  e.preventDefault();

  const nome = form.nome.value.trim();
  const email = form.email.value.trim();
  const whatsapp = form.whatsapp.value.trim();

  if(!nome) return showToast("Informe seu nome.");
  if(!email && !whatsapp) return showToast("Informe e-mail ou WhatsApp.");

  gsap.fromTo(".btn-ativar",{scale:1},{scale:0.92, duration:0.08, yoyo:true, repeat:1});
  showToast("Enviado com sucesso!", true);
  setTimeout(()=>form.reset(),600);
});


// ======================================================
//  VALIDATION
// ======================================================
const btn = document.getElementById("btnAtivar");

function showToast(msg, success = false) {
  toast.textContent = msg;
  toast.style.background = success
    ? "linear-gradient(135deg, #1E8F3A, #36C46F)"
    : "linear-gradient(135deg, #D72638, #F2545B)";

  gsap.killTweensOf(toast);
  gsap.fromTo(toast, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.3 });
  gsap.to(toast, { opacity: 0, y: 20, delay: 3, duration: 0.6 });
}

function shake(el) {
  gsap.fromTo(el, { x: -6 }, { x: 0, duration: 0.4, ease: "elastic.out(1, 0.3)" });
}

function markInvalid(input, message) {
  input.classList.add("invalid");
  showToast(message, false);
  shake(input);
  input.scrollIntoView({ behavior: "smooth", block: "center" });
}

function clearInvalid(input) {
  input.classList.remove("invalid");
}

// Validação CPF/CNPJ
function isValidCpfCnpj(value) {
  const v = value.replace(/\D/g, "");
  return v.length === 11 || v.length === 14;
}

// Validação WhatsApp
function isValidPhone(value) {
  return /\(?\d{2}\)?\s?\d{4,5}\-?\d{4}/.test(value);
}

// Email
function isValidEmail(value) {
  return /\S+@\S+\.\S+/.test(value);
}

// Máscaras simples
form.cpf_cnpj.addEventListener("input", () => {
  let v = form.cpf_cnpj.value.replace(/\D/g, "");
  if (v.length <= 11)
    form.cpf_cnpj.value = v.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/,
      (_, a, b, c, d) => d ? `${a}.${b}.${c}-${d}` : `${a}.${b}.${c}`
    );
  else
    form.cpf_cnpj.value = v.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/,
      (_, a, b, c, d, e) => e ? `${a}.${b}.${c}/${d}-${e}` : `${a}.${b}.${c}/${d}`
    );
});

form.whatsapp.addEventListener("input", () => {
  let v = form.whatsapp.value.replace(/\D/g, "");
  form.whatsapp.value = v.replace(/(\d{2})(\d{5})(\d{4})/,
    (_, a, b, c) => `(${a}) ${b}-${c}`
  );
});

// ======================================================
//  SUBMIT
// ======================================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = form.nome.value.trim();
  const email = form.email.value.trim();
  const whatsapp = form.whatsapp.value.trim();
  const cpf = form.cpf_cnpj.value.trim();

  // ---- validações ----
  if (!nome) return markInvalid(form.nome, "Informe seu nome completo.");
  clearInvalid(form.nome);

  if (!cpf) return markInvalid(form.cpf_cnpj, "Informe seu CPF ou CNPJ.");
  if (!isValidCpfCnpj(cpf)) return markInvalid(form.cpf_cnpj, "CPF/CNPJ inválido.");
  clearInvalid(form.cpf_cnpj);

  if (!email && !whatsapp)
    return markInvalid(form.email, "Informe e-mail ou WhatsApp.");

  if (email && !isValidEmail(email))
    return markInvalid(form.email, "E-mail inválido.");

  clearInvalid(form.email);

  if (whatsapp && !isValidPhone(whatsapp))
    return markInvalid(form.whatsapp, "WhatsApp inválido.");
  clearInvalid(form.whatsapp);

  // Anima clique
  gsap.fromTo(btn, { scale: 1 }, { scale: 0.93, duration: 0.1, yoyo: true, repeat: 1 });

  // ---- envio ----
  try {
    const res = await fetch("/fale-conosco/beneficio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, cpf_cnpj: cpf, whatsapp, email })
    });

    if (!res.ok) {
      return showToast("Erro ao enviar. Tente novamente.", false);
    }
    
    showToast("Benefício ativado com sucesso!", true);
    form.reset();

  } catch (err) {
    showToast("Falha na conexão com o servidor.", false);
  }
});