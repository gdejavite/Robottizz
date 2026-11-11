/** Página do painel /admin. O JavaScript do navegador fica aqui dentro (sem crases nem "${" no script). */
export function panelHtml(nonce: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>Painel do Bot</title>
<style nonce="${nonce}">
  :root { --bg:#f6f7f9; --card:#fff; --ink:#1b1f24; --mute:#667085; --line:#e4e7ec; --brand:#6d28d9; --ok:#067647; --warn:#b54708; --bad:#b42318; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0f1115; --card:#181b21; --ink:#eef0f3; --mute:#98a2b3; --line:#2a2f38; --brand:#a78bfa; --ok:#47cd89; --warn:#fdb022; --bad:#f97066; }
  }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }
  main { max-width:880px; margin:0 auto; padding:16px; }
  h1 { font-size:20px; margin:0; }
  h2 { font-size:16px; margin:28px 0 10px; }
  .bar { display:flex; gap:10px; align-items:center; justify-content:space-between; flex-wrap:wrap; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:14px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; }
  .metric b { display:block; font-size:26px; line-height:1.1; }
  .metric span { color:var(--mute); font-size:13px; }
  .small { color:var(--mute); font-size:13px; }
  .pill { display:inline-block; padding:3px 10px; border-radius:99px; font-size:13px; font-weight:600; }
  .pill.on { background:color-mix(in srgb,var(--ok) 18%,transparent); color:var(--ok); }
  .pill.off { background:color-mix(in srgb,var(--warn) 18%,transparent); color:var(--warn); }
  button { font:inherit; cursor:pointer; border:1px solid var(--line); background:var(--card); color:var(--ink); padding:8px 14px; border-radius:8px; }
  button.primary { background:var(--brand); border-color:var(--brand); color:#fff; font-weight:600; }
  button.danger { color:var(--bad); }
  button:disabled { opacity:.5; cursor:default; }
  label { display:block; font-weight:600; margin:12px 0 4px; }
  input[type=text], textarea { width:100%; font:inherit; color:var(--ink); background:var(--bg); border:1px solid var(--line); border-radius:8px; padding:8px 10px; }
  textarea { min-height:84px; resize:vertical; }
  .row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
  .row > input[type=text] { flex:1; min-width:200px; }
  .checks { display:flex; gap:18px; flex-wrap:wrap; margin-top:10px; }
  .checks label { display:flex; gap:6px; align-items:center; font-weight:500; margin:0; }
  details.camp { margin-bottom:10px; }
  details.camp > summary { cursor:pointer; list-style:none; display:flex; gap:10px; align-items:center; flex-wrap:wrap; font-weight:600; }
  .msg { margin:10px 0; padding:10px 12px; border-radius:8px; display:none; }
  .msg.ok { display:block; background:color-mix(in srgb,var(--ok) 15%,transparent); color:var(--ok); }
  .msg.err { display:block; background:color-mix(in srgb,var(--bad) 15%,transparent); color:var(--bad); }
  .savebar { position:sticky; bottom:0; background:var(--bg); padding:12px 0; border-top:1px solid var(--line); margin-top:16px; }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  td, th { text-align:left; padding:6px 8px; border-bottom:1px solid var(--line); }
</style>
</head>
<body>
<main>
  <div class="bar">
    <h1>🤖 Painel do Bot de Instagram</h1>
    <div class="row"><span id="status" class="pill on">carregando…</span><button id="btnPause">…</button></div>
  </div>
  <div id="flash" class="msg"></div>

  <h2>Métricas</h2>
  <div class="grid" id="metrics"></div>
  <p class="small" id="metricsNote"></p>

  <h2>Conexão</h2>
  <div class="card">
    <div class="row">
      <button id="btnHealth">Testar conexão com o Instagram</button>
      <button id="btnSubscribe">Inscrever webhooks (comentários e mensagens)</button>
    </div>
    <p class="small" id="conn"></p>
  </div>

  <h2>Campanhas</h2>
  <p class="small">Cada campanha tem palavras-chave e 4 mensagens. Use <code>{usuario}</code> para citar o @ da pessoa. A mesma palavra pode existir em campanhas de posts diferentes: o post do comentário decide qual conteúdo a pessoa recebe.</p>
  <div id="campaigns"></div>
  <button id="btnAdd">+ Nova campanha</button>

  <div class="savebar"><button id="btnSave" class="primary">Salvar alterações</button> <span class="small">Vale em poucos segundos, sem redeploy.</span></div>
</main>
<script nonce="${nonce}">
(function () {
  var cfg = { paused: false, campaigns: [] };
  var qs = function (id) { return document.getElementById(id); };

  function api(method, path, body) {
    return fetch(path, {
      method: method,
      headers: { "content-type": "application/json", "x-admin": "1" },
      body: body === undefined ? undefined : JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error || ("Erro " + r.status));
        return j;
      });
    });
  }

  function flash(text, ok) {
    var el = qs("flash");
    el.textContent = text;
    el.className = "msg " + (ok ? "ok" : "err");
    if (ok) setTimeout(function () { el.className = "msg"; }, 6000);
  }

  function h(tag, props, children) {
    var el = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === "text") el.textContent = props[k];
      else if (k === "class") el.className = props[k];
      else if (k.indexOf("on") === 0) el.addEventListener(k.slice(2), props[k]);
      else el[k] = props[k];
    });
    (children || []).forEach(function (c) { if (c) el.appendChild(c); });
    return el;
  }

  function field(label, hint, input) {
    return h("div", {}, [
      h("label", { text: label }),
      hint ? h("div", { class: "small", text: hint }) : null,
      input
    ]);
  }

  function textarea(value, onInput, rows) {
    var t = h("textarea", { value: value || "" });
    if (rows) t.rows = rows;
    t.addEventListener("input", function () { onInput(t.value); });
    return t;
  }

  function newId() { return Math.random().toString(36).slice(2, 10); }

  var DEFAULTS = {
    introMessage: "Oi {usuario}! 🎉 Que bom que você comentou! Responda essa mensagem com qualquer coisa (pode ser só um \\"oi\\") que eu já te envio o material.",
    followMessage: "Quase lá! 🙌 Pra liberar o material, você precisa seguir o meu perfil. Segue lá e me manda outra mensagem aqui que eu libero na hora!",
    deliveryMessage: "Aqui está! 🎁 Escreva aqui o link ou o texto que você quer entregar.",
    publicNotice: "{usuario} me chama no direct e escreve a palavra do post que eu te envio! 📩\\n{usuario} o direct está te esperando, é só mandar a palavra do post lá! 💬\\nOpa {usuario}! Manda a palavra-chave no meu direct que eu te mando o material 🚀"
  };

  function renderCampaigns() {
    var root = qs("campaigns");
    root.textContent = "";
    if (!cfg.campaigns.length) {
      root.appendChild(h("p", { class: "small", text: "Nenhuma campanha ainda. Clique em \\"+ Nova campanha\\"." }));
    }
    cfg.campaigns.forEach(function (c, idx) { root.appendChild(renderCampaign(c, idx)); });
  }

  function renderCampaign(c, idx) {
    var title = h("span", { text: c.name || "Campanha" });
    var badge = h("span", { class: "pill " + (c.active ? "on" : "off"), text: c.active ? "ativa" : "desativada" });
    var summary = h("summary", {}, [title, badge, c.isDefault ? h("span", { class: "pill on", text: "padrão" }) : null]);

    var name = h("input", { type: "text", value: c.name });
    name.addEventListener("input", function () { c.name = name.value; title.textContent = name.value || "Campanha"; });

    var kw = h("input", { type: "text", value: (c.keywords || []).join(", ") });
    kw.addEventListener("input", function () {
      c.keywords = kw.value.split(/[,\\n]/).map(function (s) { return s.trim(); }).filter(Boolean);
    });

    var link = h("input", { type: "text", value: c.mediaUrl || "", placeholder: "https://www.instagram.com/reel/XXXXXXXX/" });
    link.addEventListener("input", function () { c.mediaUrl = link.value; });
    var linked = h("div", { class: "small" });
    function showLinked() {
      linked.textContent = c.mediaId ? ("✅ Vinculada ao post (ID " + c.mediaId + "). Só comentários desse post ativam esta campanha.") : "Sem post vinculado: vale para comentários em qualquer post.";
    }
    showLinked();
    var bLink = h("button", { type: "button", text: "Vincular ao post", onclick: function () {
      if (!link.value.trim()) { flash("Cole primeiro o link do Reel.", false); return; }
      bLink.disabled = true; bLink.textContent = "Procurando…";
      api("POST", "/admin/api/media", { url: link.value.trim() }).then(function (r) {
        c.mediaId = r.mediaId; c.mediaUrl = link.value.trim(); showLinked(); flash("Post vinculado! Não esqueça de salvar.", true);
      }).catch(function (e) { flash(e.message, false); }).then(function () { bLink.disabled = false; bLink.textContent = "Vincular ao post"; });
    } });
    var bUnlink = h("button", { type: "button", text: "Desvincular", onclick: function () { c.mediaId = ""; c.mediaUrl = ""; link.value = ""; showLinked(); } });

    var active = h("input", { type: "checkbox", checked: !!c.active });
    active.addEventListener("change", function () { c.active = active.checked; badge.className = "pill " + (c.active ? "on" : "off"); badge.textContent = c.active ? "ativa" : "desativada"; });
    var def = h("input", { type: "checkbox", checked: !!c.isDefault });
    def.addEventListener("change", function () {
      cfg.campaigns.forEach(function (o) { o.isDefault = false; });
      c.isDefault = def.checked;
      renderCampaigns();
    });

    var remove = h("button", { type: "button", class: "danger", text: "Excluir campanha", onclick: function () {
      if (confirm("Excluir a campanha \\"" + (c.name || "") + "\\"?")) { cfg.campaigns.splice(idx, 1); renderCampaigns(); }
    } });

    var d = h("details", { class: "card camp" }, [
      summary,
      field("Nome da campanha", "", name),
      field("Palavras-chave", "Separe por vírgula. Casa só a palavra inteira (\\"01\\" não casa em \\"2016\\").", kw),
      field("Link do Reel/post (opcional)", "Cole o link e clique em Vincular. Sem vínculo, a campanha vale para qualquer post.", h("div", {}, [h("div", { class: "row" }, [link, bLink, bUnlink]), linked])),
      h("div", { class: "checks" }, [
        h("label", {}, [active, document.createTextNode("Campanha ativa")]),
        h("label", {}, [def, document.createTextNode("Campanha padrão (atende quem manda direct sem palavra)")])
      ]),
      field("1) Mensagem de intro", "Enviada como private reply no comentário. Peça para a pessoa responder no direct.", textarea(c.introMessage, function (v) { c.introMessage = v; }, 4)),
      field("2) Mensagem pedindo para seguir", "Enviada se a pessoa responder e ainda não seguir o perfil. Repete a cada nova mensagem dela.", textarea(c.followMessage, function (v) { c.followMessage = v; }, 3)),
      field("3) Mensagem de entrega", "Enviada quando a pessoa já segue o perfil.", textarea(c.deliveryMessage, function (v) { c.deliveryMessage = v; }, 4)),
      field("4) Aviso público (quando o direct falhar)", "UMA variação por linha. O bot sorteia uma a cada comentário, para não repetir a mesma frase. Só é usado quando a Meta bloqueia o direct.", textarea(c.publicNotice, function (v) { c.publicNotice = v; }, 6)),
      h("div", { class: "row", style: "margin-top:14px" }, [remove])
    ]);
    if (!c.name || c.name === "Nova campanha") d.open = true;
    return d;
  }

  var METRIC_LABELS = [
    ["comments", "Comentários recebidos"],
    ["dms", "DMs enviadas"],
    ["followsConverted", "Follows convertidos"],
    ["deliveries", "Entregas"]
  ];
  var EXTRA_LABELS = [
    ["commentsMatched", "Comentários com palavra-chave"],
    ["introSent", "Intros enviadas"],
    ["followAsked", "Pedidos de follow"],
    ["planB", "Plano B acionado"],
    ["publicReplies", "Avisos públicos"],
    ["retryOk", "Recuperadas pelo retry"]
  ];

  function renderMetrics(state) {
    var box = qs("metrics");
    box.textContent = "";
    var cnt = (state.metrics && state.metrics.counters) || {};
    METRIC_LABELS.concat(EXTRA_LABELS).forEach(function (m, i) {
      box.appendChild(h("div", { class: "card metric" }, [h("b", { text: String(cnt[m[0]] || 0) }), h("span", { text: m[1] })]));
    });
    box.appendChild(h("div", { class: "card metric" }, [h("b", { text: String(state.queue || 0) }), h("span", { text: "Na fila de retry agora" })]));
    var since = state.metrics && state.metrics.since ? new Date(state.metrics.since).toLocaleString("pt-BR") : "-";
    qs("metricsNote").textContent = "Contando desde " + since + ". Os números são atualizados a cada 25 interações ou 5 minutos.";
    var tok = "";
    if (state.tokenStatus) {
      tok = state.tokenStatus.ok ? "Última renovação do token: OK (" + new Date(state.tokenStatus.lastAttemptAt).toLocaleString("pt-BR") + ")." : "⚠️ Última renovação do token FALHOU: " + state.tokenStatus.error + " (tenta de novo na próxima semana).";
    } else { tok = "Token ainda não foi renovado pelo cron semanal."; }
    qs("conn").textContent = tok;
  }

  function renderStatus() {
    var s = qs("status");
    s.textContent = cfg.paused ? "⏸ Pausado" : "● Ativo";
    s.className = "pill " + (cfg.paused ? "off" : "on");
    qs("btnPause").textContent = cfg.paused ? "Reativar automação" : "Pausar automação";
  }

  function load() {
    return api("GET", "/admin/api/state").then(function (st) {
      cfg = st.config; renderStatus(); renderCampaigns(); renderMetrics(st);
    }).catch(function (e) { flash(e.message, false); });
  }

  qs("btnAdd").addEventListener("click", function () {
    cfg.campaigns.push({ id: newId(), name: "Nova campanha", active: true, isDefault: false, keywords: [], mediaId: "", mediaUrl: "",
      introMessage: DEFAULTS.introMessage, followMessage: DEFAULTS.followMessage, deliveryMessage: DEFAULTS.deliveryMessage, publicNotice: DEFAULTS.publicNotice });
    renderCampaigns();
    var all = document.querySelectorAll("details.camp");
    if (all.length) all[all.length - 1].open = true;
  });

  qs("btnSave").addEventListener("click", function () {
    for (var i = 0; i < cfg.campaigns.length; i++) {
      var c = cfg.campaigns[i];
      if (c.mediaUrl && !c.mediaId) { flash("A campanha \\"" + c.name + "\\" tem um link, mas ele ainda não foi vinculado. Clique em \\"Vincular ao post\\" (ou limpe o link).", false); return; }
    }
    qs("btnSave").disabled = true;
    api("PUT", "/admin/api/config", cfg).then(function (r) {
      cfg = r.config; renderStatus(); renderCampaigns(); flash("Salvo! As mudanças já valem (até ~1 minuto em todos os servidores).", true);
    }).catch(function (e) { flash(e.message, false); }).then(function () { qs("btnSave").disabled = false; });
  });

  qs("btnPause").addEventListener("click", function () {
    api("POST", "/admin/api/pause", { paused: !cfg.paused }).then(function (r) {
      cfg.paused = r.paused; renderStatus(); flash(cfg.paused ? "Automação pausada." : "Automação reativada.", true);
    }).catch(function (e) { flash(e.message, false); });
  });

  qs("btnHealth").addEventListener("click", function () {
    api("POST", "/admin/api/health").then(function (r) { flash("Conectado como @" + r.username + " ✅", true); })
      .catch(function (e) { flash("Falha na conexão: " + e.message, false); });
  });

  qs("btnSubscribe").addEventListener("click", function () {
    api("POST", "/admin/api/subscribe").then(function () { flash("Webhooks inscritos (comments, messages) ✅", true); })
      .catch(function (e) { flash("Não consegui inscrever: " + e.message, false); });
  });

  load();
})();
</script>
</body>
</html>`;
}
