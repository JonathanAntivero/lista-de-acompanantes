(() => {
  "use strict";

  const CFG = window.CONFIG || {};
  const HORAS = CFG.HORAS || [];
  const DIAS = CFG.DIAS || [0, 1, 2, 3, 4, 5, 6];
  const NOMBRES_DIA = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
  const CORTO_DIA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const $ = (id) => document.getElementById(id);

  // ---------- Estado ----------
  const estado = {
    offset: 0,          // semanas respecto a la actual
    diaSel: 0,          // índice dentro de DIAS
    turnos: [],
    perfil: leer("perfil", null),
    dispositivo: dispositivoId(),
    pendiente: null     // acción a retomar después de pedir los datos
  };

  // ---------- Utilidades ----------
  function leer(clave, def) {
    try {
      const v = localStorage.getItem(clave);
      return v === null ? def : JSON.parse(v);
    } catch { return def; }
  }
  function guardar(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
  }
  function dispositivoId() {
    let id = leer("dispositivo", null);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) ||
        "d-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      guardar("dispositivo", id);
    }
    return id;
  }
  function pad(n) { return String(n).padStart(2, "0"); }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function lunesDe(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dow = (x.getDay() + 6) % 7; // lunes = 0
    x.setDate(x.getDate() - dow);
    return x;
  }
  function sumarDias(d, n) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() + n);
    return x;
  }
  function lunesSeleccionado() { return sumarDias(lunesDe(new Date()), estado.offset * 7); }
  function fechaDelDia(dia) { return sumarDias(lunesSeleccionado(), dia); }
  function fechaHoraSlot(dia, hora) {
    const f = fechaDelDia(dia);
    const [h, m] = hora.split(":").map(Number);
    f.setHours(h, m || 0, 0, 0);
    return f;
  }
  function slotPasado(dia, hora) {
    // Se considera pasado cuando terminó la hora (dura 60 min).
    return fechaHoraSlot(dia, hora).getTime() + 60 * 60 * 1000 <= Date.now();
  }
  function el(tag, props = {}, ...hijos) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    hijos.forEach((h) => h && e.append(h));
    return e;
  }
  let toastTimer;
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("visible"), 2400);
  }
  function aviso(msg) {
    const a = $("aviso");
    if (msg) { a.textContent = msg; a.hidden = false; } else { a.hidden = true; }
  }

  // ---------- Almacenamiento (Supabase o modo demo) ----------
  const usaSupabase = Boolean(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase);
  const sb = usaSupabase ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY) : null;

  const almacen = usaSupabase ? {
    async listar(semana) {
      const { data, error } = await sb.from("turnos").select("*").eq("semana", semana).order("created_at");
      if (error) throw error;
      return data;
    },
    async anotar(t) {
      const { error } = await sb.from("turnos").insert(t);
      if (error && error.code !== "23505") throw error; // 23505 = ya estaba anotado
    },
    async quitar(id) {
      const { error } = await sb.from("turnos").delete().eq("id", id);
      if (error) throw error;
    }
  } : {
    async listar(semana) {
      return leer("turnos_demo", []).filter((t) => t.semana === semana);
    },
    async anotar(t) {
      const todos = leer("turnos_demo", []);
      const dup = todos.some((x) => x.semana === t.semana && x.dia === t.dia &&
        x.hora === t.hora && x.dispositivo === t.dispositivo);
      if (dup) return;
      todos.push({ ...t, id: "demo-" + Date.now() + Math.random().toString(36).slice(2, 6) });
      guardar("turnos_demo", todos);
    },
    async quitar(id) {
      guardar("turnos_demo", leer("turnos_demo", []).filter((t) => t.id !== id));
    }
  };

  // ---------- Carga ----------
  async function cargar() {
    try {
      estado.turnos = await almacen.listar(iso(lunesSeleccionado()));
      aviso(usaSupabase ? "" :
        "Modo demo: los datos se guardan solo en este teléfono. Configurá Supabase en config.js para compartirlos.");
    } catch (err) {
      console.error(err);
      aviso("No se pudo conectar. Mostrando lo último que había; revisá tu conexión.");
    }
    render();
  }

  // ---------- Render ----------
  function textoSemana() {
    const lun = lunesSeleccionado();
    const dom = sumarDias(lun, 6);
    const f = new Intl.DateTimeFormat("es", { day: "numeric", month: "long" });
    const base = "Semana del " + f.format(lun) + " al " + f.format(dom);
    return estado.offset === 0 ? base + " (actual)" : base;
  }

  function turnosDe(dia, hora) {
    return estado.turnos.filter((t) => t.dia === dia && t.hora === hora);
  }

  function renderDias() {
    const cont = $("dias");
    cont.replaceChildren();
    const hoy = iso(new Date());
    DIAS.forEach((dia, i) => {
      const f = fechaDelDia(dia);
      const total = estado.turnos.filter((t) => t.dia === dia).length;
      const clases = ["dia"];
      if (i === estado.diaSel) clases.push("activo");
      if (iso(f) < hoy) clases.push("pasado");
      if (iso(f) === hoy) clases.push("hoy");
      const b = el("button", {
        class: clases.join(" "),
        role: "tab",
        "aria-selected": String(i === estado.diaSel),
        onclick: () => { estado.diaSel = i; render(); }
      },
        el("small", { text: CORTO_DIA[dia] }),
        el("strong", { text: String(f.getDate()) }),
        total ? el("span", { class: "pto", text: String(total) }) : null
      );
      cont.append(b);
    });
    const activo = cont.querySelector(".activo");
    if (activo && activo.scrollIntoView) activo.scrollIntoView({ inline: "center", block: "nearest" });
  }

  function renderHoras() {
    const ul = $("horas");
    ul.replaceChildren();
    const dia = DIAS[estado.diaSel];
    HORAS.forEach((hora) => {
      const gente = turnosDe(dia, hora);
      const pasada = slotPasado(dia, hora);
      const yaEstoy = gente.some((t) => t.dispositivo === estado.dispositivo);
      const caja = el("div", { class: "gente" });

      gente.forEach((t) => {
        if (t.dispositivo === estado.dispositivo) {
          caja.append(el("button", {
            class: "chip mio",
            title: "Tocá para quitarte",
            text: t.nombre,
            onclick: () => quitar(t)
          }));
        } else {
          caja.append(el("span", { class: "chip", text: t.nombre }));
        }
      });

      if (!yaEstoy && !pasada) {
        caja.append(el("button", {
          class: "btn-anotar",
          text: gente.length ? "+ Anotarme" : "Anotarme",
          onclick: () => anotar(dia, hora)
        }));
      } else if (!gente.length) {
        caja.append(el("span", { class: "vacio", text: "Sin anotados" }));
      }

      ul.append(el("li", { class: "hora" + (pasada ? " pasada" : "") },
        el("span", { class: "h", text: hora }),
        caja
      ));
    });
  }

  function renderResumen() {
    const cont = $("resumen");
    cont.replaceChildren();
    let hayAlgo = false;
    DIAS.forEach((dia) => {
      const f = fechaDelDia(dia);
      const bloque = el("div", { class: "res-dia" },
        el("h3", { text: NOMBRES_DIA[dia] + " " + f.getDate() }));
      let n = 0;
      HORAS.forEach((hora) => {
        const gente = turnosDe(dia, hora);
        if (!gente.length) return;
        n++;
        const nombres = el("span", {});
        gente.forEach((t, i) => {
          if (i) nombres.append(document.createTextNode(", "));
          nombres.append(document.createTextNode(t.nombre));
          if (t.telefono) nombres.append(el("span", { class: "tel", text: " (" + t.telefono + ")" }));
        });
        bloque.append(el("div", { class: "res-linea" }, el("b", { text: hora }), nombres));
      });
      if (!n) bloque.append(el("div", { class: "res-vacio", text: "Nadie anotado todavía." }));
      else hayAlgo = true;
      cont.append(bloque);
    });
    $("btnCopiar").disabled = !hayAlgo;
  }

  function textoParaCopiar() {
    const lineas = ["*" + (CFG.TITULO_RESUMEN || "Disponibilidad") + "*", textoSemana(), ""];
    DIAS.forEach((dia) => {
      const f = fechaDelDia(dia);
      const filas = [];
      HORAS.forEach((hora) => {
        const gente = turnosDe(dia, hora);
        if (gente.length) filas.push(hora + " → " + gente.map((t) => t.nombre).join(", "));
      });
      if (filas.length) {
        lineas.push("*" + NOMBRES_DIA[dia][0].toUpperCase() + NOMBRES_DIA[dia].slice(1) + " " + f.getDate() + "*");
        lineas.push(...filas, "");
      }
    });
    return lineas.join("\n").trim();
  }

  function renderPie() {
    $("miNombre").textContent = estado.perfil ? "👤 " + estado.perfil.nombre : "Sin nombre aún";
  }

  function render() {
    $("semanaTxt").textContent = textoSemana();
    $("btnHoy").disabled = estado.offset === 0;
    renderDias();
    renderHoras();
    renderResumen();
    renderPie();
  }

  // ---------- Acciones ----------
  function pedirDatos(despues) {
    estado.pendiente = despues || null;
    $("inNombre").value = estado.perfil ? estado.perfil.nombre : "";
    $("inTel").value = estado.perfil ? (estado.perfil.telefono || "") : "";
    $("dlgDatos").showModal();
    $("inNombre").focus();
  }

  async function anotar(dia, hora) {
    if (!estado.perfil) return pedirDatos(() => anotar(dia, hora));
    try {
      await almacen.anotar({
        semana: iso(lunesSeleccionado()),
        dia, hora,
        nombre: estado.perfil.nombre,
        telefono: estado.perfil.telefono || null,
        dispositivo: estado.dispositivo
      });
      toast("¡Anotado! " + NOMBRES_DIA[dia] + " " + hora);
      await cargar();
    } catch (err) {
      console.error(err);
      toast("No se pudo anotar. Probá de nuevo.");
    }
  }

  async function quitar(t) {
    if (!confirm("¿Quitarte de " + NOMBRES_DIA[t.dia] + " a las " + t.hora + "?")) return;
    try {
      await almacen.quitar(t.id);
      toast("Listo, te quitaste del horario.");
      await cargar();
    } catch (err) {
      console.error(err);
      toast("No se pudo quitar. Probá de nuevo.");
    }
  }

  function cambiarSemana(delta) {
    const nuevo = estado.offset + delta;
    if (nuevo < -4 || nuevo > 8) return;
    estado.offset = nuevo;
    cargar();
  }

  function mostrarVista(v) {
    const anotarVista = v === "anotar";
    $("vistaAnotar").hidden = !anotarVista;
    $("vistaResumen").hidden = anotarVista;
    $("tabAnotar").classList.toggle("activa", anotarVista);
    $("tabResumen").classList.toggle("activa", !anotarVista);
    $("tabAnotar").setAttribute("aria-selected", String(anotarVista));
    $("tabResumen").setAttribute("aria-selected", String(!anotarVista));
  }

  // ---------- Eventos ----------
  $("btnPrev").addEventListener("click", () => cambiarSemana(-1));
  $("btnNext").addEventListener("click", () => cambiarSemana(1));
  $("btnHoy").addEventListener("click", () => { estado.offset = 0; irAHoy(); cargar(); });
  $("tabAnotar").addEventListener("click", () => mostrarVista("anotar"));
  $("tabResumen").addEventListener("click", () => mostrarVista("resumen"));
  $("btnCambiarNombre").addEventListener("click", () => pedirDatos(null));

  $("formDatos").addEventListener("submit", (e) => {
    e.preventDefault();
    const nombre = $("inNombre").value.trim();
    if (!nombre) return;
    estado.perfil = { nombre, telefono: $("inTel").value.trim() };
    guardar("perfil", estado.perfil);
    $("dlgDatos").close();
    renderPie();
    const siguiente = estado.pendiente;
    estado.pendiente = null;
    if (siguiente) siguiente();
  });

  $("btnCopiar").addEventListener("click", async () => {
    const texto = textoParaCopiar();
    try {
      await navigator.clipboard.writeText(texto);
      toast("Resumen copiado. Pegalo en WhatsApp.");
    } catch {
      window.prompt("Copiá el resumen:", texto);
    }
  });

  // Instalación como app
  let eventoInstalar = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    eventoInstalar = e;
    $("btnInstalar").hidden = false;
  });
  $("btnInstalar").addEventListener("click", async () => {
    if (!eventoInstalar) return;
    eventoInstalar.prompt();
    await eventoInstalar.userChoice;
    eventoInstalar = null;
    $("btnInstalar").hidden = true;
  });
  window.addEventListener("appinstalled", () => { $("btnInstalar").hidden = true; });

  // Refrescar cada tanto y al volver a la app
  setInterval(() => { if (!document.hidden && usaSupabase) cargar(); }, 30000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) cargar(); });
  // Si la app queda abierta de una semana a otra, se "reinicia" sola
  let semanaActual = iso(lunesDe(new Date()));
  setInterval(() => {
    const ahora = iso(lunesDe(new Date()));
    if (ahora !== semanaActual) { semanaActual = ahora; estado.offset = 0; irAHoy(); cargar(); }
  }, 60000);

  // ---------- Inicio ----------
  function irAHoy() {
    const dow = (new Date().getDay() + 6) % 7;
    const idx = DIAS.indexOf(dow);
    estado.diaSel = estado.offset === 0 && idx >= 0 ? idx : 0;
  }

  function pedirCodigo() {
    return new Promise((resolve) => {
      if (!CFG.CODIGO_ACCESO || leer("acceso", "") === CFG.CODIGO_ACCESO) return resolve();
      const dlg = $("dlgCodigo");
      dlg.addEventListener("cancel", (e) => e.preventDefault()); // no se puede cerrar con Esc
      $("formCodigo").addEventListener("submit", (e) => {
        e.preventDefault();
        if ($("inCodigo").value.trim() === CFG.CODIGO_ACCESO) {
          guardar("acceso", CFG.CODIGO_ACCESO);
          dlg.close();
          resolve();
        } else {
          $("errCodigo").hidden = false;
        }
      });
      dlg.showModal();
    });
  }

  async function iniciar() {
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    }
    irAHoy();
    render();
    await pedirCodigo();
    await cargar();
  }

  iniciar();
})();
