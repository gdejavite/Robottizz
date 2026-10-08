// Teste de fumaça da Torre Gabriel no Chromium (Playwright).
// Uso: node tests/smoke.cjs [arquivo.html]   (PW=<pasta do playwright-core> e CHROME=<navegador> são opcionais)
// Sem rede: as fontes do Google são bloqueadas para o teste não depender de internet.
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PW ? path.resolve(process.env.PW) : 'playwright-core');
const CHROME = process.env.CHROME || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find((f) => fs.existsSync(f));

const FILE = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist', 'torre-gabriel.html'));
const URL = 'file://' + FILE;
const MOCK = fs.readFileSync(path.join(__dirname, 'mock-claude.js'), 'utf8');
const PRIV = path.join(__dirname, '..', 'private', 'dados-privados.json');
const SHOTS = process.env.SHOTS || path.join(__dirname, '..', 'test-results');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const ok = (name, cond, info) => { results.push({ name, ok: !!cond, info }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (info ? ' · ' + info : '')); };

async function newPage(browser, { mock, viewport } = {}) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1400, height: 950 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  if (mock) await ctx.addInitScript(MOCK);
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text())) page.errors.push('console: ' + m.text()); });
  await page.clock.install();
  await page.goto(URL);
  await page.clock.runFor(1500);
  return { ctx, page };
}
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const logs = (page) => ev(page, () => window.__torre.FLOORS[window.__torre.VIEW.id].journal.map((e) => e.x));

(async () => {
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});

  /* ---------- 1. modo demonstração (sem IA, sem conectores) ---------- */
  {
    const { page, ctx } = await newPage(browser);
    ok('carrega sem erros', page.errors.length === 0, page.errors.join(' | '));
    const floors = await ev(page, () => Object.keys(window.__torre.FLOORS));
    ok('dois andares registrados', floors.length === 2 && floors.includes('rob') && floors.includes('dej'), floors.join(','));
    ok('começa no 7º andar', (await ev(page, () => window.__torre.VIEW.id)) === 'rob');
    await page.clock.runFor(45000);
    const st = await ev(page, () => { const F = window.__torre.FLOORS; return { rob: F.rob.kpi.done, dej: F.dej.kpi.done, apR: F.rob.approvals.length, apD: F.dej.approvals.length }; });
    ok('simulação roda nos dois andares em paralelo', st.rob + st.dej > 0, JSON.stringify(st));
    await page.screenshot({ path: path.join(SHOTS, '01-escritorio.png') });

    // atalhos e abas
    for (const [k, id] of [['2', 'v-ops'], ['3', 'v-chat'], ['4', 'v-agents'], ['5', 'v-mem'], ['6', 'v-conn'], ['1', 'v-office']]) {
      await page.keyboard.press(k);
      ok('atalho ' + k + ' abre ' + id, await ev(page, (i) => document.getElementById(i).classList.contains('on'), id));
    }
    await page.focus('#tab-office'); await page.keyboard.press('ArrowRight');
    ok('seta → nas abas vai para Operação', await ev(page, () => document.getElementById('v-ops').classList.contains('on') && document.activeElement.id === 'tab-ops'));
    await page.keyboard.press('1');

    // elevador
    await page.keyboard.press('e'); await page.clock.runFor(2000);
    ok('tecla E desce ao 6º andar', (await ev(page, () => window.__torre.VIEW.id)) === 'dej');
    ok('título do 6º andar', /Dejavite/.test(await page.title()), await page.title());
    await page.keyboard.press('e'); await page.clock.runFor(2000);
    ok('tecla E vai à Cobertura', await ev(page, () => document.getElementById('v-top').classList.contains('on')));
    const topTxt = await page.textContent('#topBody');
    ok('Cobertura mostra gargalo e agente do mês', /Gargalo nº 1/.test(topTxt) && /Agente do mês/.test(topTxt));
    await page.screenshot({ path: path.join(SHOTS, '02-cobertura.png') });
    await page.click('#btnReport');
    ok('relatório semanal abre', await ev(page, () => document.getElementById('reportDlg').open && /Relatório semanal/.test(document.getElementById('reportBody').textContent)));
    await page.screenshot({ path: path.join(SHOTS, '03-relatorio.png') });
    await page.keyboard.press('Escape');
    ok('Esc fecha o relatório', await ev(page, () => !document.getElementById('reportDlg').open));
    await page.click('[data-go="rob"]'); await page.clock.runFor(2000);

    // aprovação: abre a próxima com R e aprova (vermelho pede duas vezes)
    await page.clock.runFor(30000);
    const hasAp = await ev(page, () => window.__torre.FLOORS.rob.approvals.filter((o) => o.view).length);
    if (hasAp) {
      await page.keyboard.press('r');
      ok('tecla R abre a revisão', await ev(page, () => document.getElementById('apDlg').open));
      const red = await ev(page, () => { const F = window.__torre.FLOORS.rob; return F.approvals.find((o) => o.view).kind === 'vermelho'; });
      await page.click('#apBody [data-m="ok"]'); if (red) await page.click('#apBody [data-m="ok"]');
      await page.clock.runFor(500);
      ok('aprovar registra no diário e dá XP', (await logs(page)).some((x) => /^Você aprovou/.test(x)) && (await ev(page, () => Object.values(window.__torre.FLOORS.rob.XP).some((x) => x.xp > 0))));
    } else ok('houve pedido de aprovação em 75 s', false);

    // bug corrigido 1: limpar memória
    await page.keyboard.press('5');
    await page.click('#btnMemClear'); await page.click('#btnMemClear'); await page.clock.runFor(300);
    const mem = await ev(page, () => window.__torre.FLOORS.rob.MEM.filter((m) => m.kind === 'regra').length);
    ok('"Limpar memória" recoloca as regras (antes dava erro)', mem >= 5 && page.errors.length === 0, 'regras: ' + mem);
    // bug corrigido 2: reunião sem participantes
    await page.keyboard.press('1');
    await page.click('#btnMeet'); await page.click('#mGo'); await page.clock.runFor(500);
    ok('"Reunir agora" sem escolher ninguém funciona (antes dava erro)', page.errors.length === 0 && (await logs(page)).some((x) => /^Reunião iniciada/.test(x)));
    // linha do tempo
    await page.click('#btnTimeline'); await page.click('#tlPlay'); await page.clock.runFor(3000);
    ok('linha do tempo reproduz', await ev(page, () => !document.getElementById('tlPanel').hidden && /\(\d+\/\d+\)/.test(document.getElementById('tlInfo').textContent)));
    await page.keyboard.press('Escape');
    // ajuda
    await page.keyboard.press('?');
    ok('tecla ? abre a ajuda', await ev(page, () => document.getElementById('helpDlg').open));
    await page.keyboard.press('Escape');
    // chat: palavra-chave "peças" vai para o Maestro (antes ia para o Otto)
    await page.keyboard.press('3');
    await page.fill('#chatIn', 'Publicar as peças paradas'); await page.press('#chatIn', 'Enter'); await page.clock.runFor(800);
    ok('pedido de peças vai para o Maestro', /Maestro/.test(await page.textContent('#msgs')));
    ok('sem erros no modo demonstração', page.errors.length === 0, page.errors.join(' | '));
    await ctx.close();
  }

  /* ---------- 2. celular ---------- */
  {
    const { page, ctx } = await newPage(browser, { viewport: { width: 390, height: 844 } });
    await page.clock.runFor(5000);
    await page.click('#btnTeam');
    ok('celular: botão Equipe abre a lista', await ev(page, () => getComputedStyle(document.getElementById('roster')).display !== 'none'));
    const overflow = await ev(page, () => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok('celular: sem rolagem horizontal', overflow <= 1, 'excesso: ' + overflow + 'px');
    await page.screenshot({ path: path.join(SHOTS, '04-celular.png') });
    await ctx.close();
  }

  /* ---------- 3. IA real e conectores (simulados) ---------- */
  {
    const { page, ctx } = await newPage(browser, { mock: true });
    await page.clock.runFor(1000);
    ok('IA real: carrega sem erros', page.errors.length === 0, page.errors.join(' | '));
    await page.keyboard.press('4');
    await page.check('#cfgReal'); await page.clock.runFor(200);
    // importar dados privados
    if (fs.existsSync(PRIV)) {
      await page.setInputFiles('#dataFile', PRIV); await page.clock.runFor(500);
      const d = await ev(page, () => ({ v: window.__torre.FLOORS.rob.MET.receita.v, vars: Object.keys(window.__torre.CFG.data.rob.vars).length, n8n: window.__torre.CFG.notify.n8nTable }));
      ok('importa o arquivo de dados privados', d.v === 1878 && d.vars > 10 && !!d.n8n, JSON.stringify(d));
    }
    // supabase
    await page.fill('#supaProject', 'proj-teste');
    await page.fill('#supaQ_receita', 'select mes, valor from vw_receita order by mes');
    await page.click('#supaSave'); await page.click('#supaSync'); await page.clock.runFor(1500);
    const rec = await ev(page, () => window.__torre.FLOORS.rob.MET.receita);
    ok('sincroniza meta com o Supabase', rec.v === 2100 && rec.syncedAt > 0, JSON.stringify({ v: rec.v, h: rec.h }));
    // chat com roteamento por IA (sem palavra-chave)
    await page.keyboard.press('3');
    await page.fill('#chatIn', 'quero que alguém cuide dos clientes antigos'); await page.press('#chatIn', 'Enter'); await page.clock.runFor(2500);
    ok('Recepção usa IA quando não reconhece o pedido', /com IA/.test(await page.textContent('#msgs')) && /Rita/.test(await page.textContent('#msgs')));
    // tarefa real → revisão real (1ª devolve, 2ª aprova) → pedido de aprovação
    await page.clock.runFor(60000);
    const kinds = await ev(page, () => window.__mockCalls.filter((c) => c.t === 'sample').map((c) => c.kind));
    ok('agente executa com IA', kinds.includes('tarefa'));
    ok('Íris revisa o texto com IA', kinds.filter((k) => k === 'revisao').length >= 2, kinds.join(','));
    ok('devolução da Íris vira lição e retrabalho', (await logs(page)).some((x) => /devolveu .*faltou o aviso de risco/.test(x)));
    const prompt = await ev(page, () => (window.__mockCalls.find((c) => c.kind === 'tarefa') || {}).prompt || '');
    ok('prompt leva os dados reais e nenhuma variável vazia', /DADOS REAIS DA EMPRESA/.test(prompt) && !/\[sem dado:/.test(prompt));
    // aprovação pelo Slack (n8n)
    await page.click('#tab-agents');
    await page.check('#cfgSlackApprove'); await page.fill('#cfgN8nDecTable', 'tab-dec'); await page.press('#cfgN8nDecTable', 'Tab');
    const key = await ev(page, () => { const F = window.__torre.FLOORS; const all = F.rob.approvals.concat(F.dej.approvals).filter((o) => o.kind !== 'vermelho'); return all[0] && all[0].key; });
    if (key) {
      await ev(page, (k) => window.__n8nRows.dec.push({ ap_key: k, decisao: 'aprovar' }), key);
      await page.click('#tstDec'); await page.clock.runFor(800);
      ok('decisão do Slack é aplicada', (await ev(page, (k) => !Object.values(window.__torre.FLOORS).some((F) => F.approvals.some((o) => o.key === k)), key)) && /aplicada/.test(await page.textContent('#msgN8n')));
    } else ok('havia pendência para testar o Slack', false);
    // reunião com debate por IA
    await page.keyboard.press('1');
    await page.click('#btnMeet'); await page.fill('#mPauta', 'retenção dos clientes');
    await page.click('#mPick [data-k="rita"]'); await page.click('#mPick [data-k="luna"]'); await page.click('#mGo');
    await page.clock.runFor(14000);
    ok('reunião com IA gera opções A/B para você', await ev(page, () => window.__torre.FLOORS.rob.approvals.some((o) => o.kind === 'reuniao' && /Onboarding/.test((o.opts || []).join(' ')))));
    // persistência: recarrega e confere pendências restauradas
    const before = await ev(page, () => window.__torre.FLOORS.rob.approvals.length + window.__torre.FLOORS.dej.approvals.length);
    await page.clock.runFor(2000);
    await page.reload(); await page.clock.runFor(2500);
    const after = await ev(page, () => window.__torre.FLOORS.rob.approvals.filter((o) => o.restored).length + window.__torre.FLOORS.dej.approvals.filter((o) => o.restored).length);
    ok('pendências sobrevivem ao recarregar (conta)', before > 0 && after >= before, before + ' → ' + after);
    ok('resumo "enquanto você estava fora" aparece', await ev(page, () => !document.getElementById('digest').hidden));
    await page.screenshot({ path: path.join(SHOTS, '05-resumo-ausencia.png') });
    // execução real: com a IA desligada, a rotina do Otto usa os modelos; aprovar a campanha manda para a fila do n8n
    await page.click('#digest [data-dg="close"]').catch(() => {});
    await page.click('#tab-agents');
    await page.uncheck('#cfgReal');
    await page.check('#cfgExecOn'); await page.fill('#cfgN8nExecTable', 'tab-exec'); await page.press('#cfgN8nExecTable', 'Tab');
    let exec = null;
    for (let i = 0; i < 8 && !exec; i++) {
      await page.click('.acard[data-k="otto"] [data-a="routine"]');
      await page.clock.runFor(40000);
      exec = await ev(page, () => { const o = window.__torre.FLOORS.rob.approvals.find((x) => x.exec && x.view); return o ? o.id : null; });
    }
    if (exec) {
      await page.click('#tab-office');
      await page.click('#approvals .appr[data-id="' + exec + '"] [data-a="open"]');
      const red = await ev(page, (id) => window.__torre.FLOORS.rob.approvals.find((x) => x.id === id).kind === 'vermelho', exec);
      await page.click('#apBody [data-m="ok"]');
      if (red) { ok('confirmação dupla: 1º clique não aprova', await ev(page, (id) => window.__torre.FLOORS.rob.approvals.some((x) => x.id === id), exec)); await page.click('#apBody [data-m="ok"]'); }
      await page.clock.runFor(800);
      const row = await ev(page, () => window.__mockCalls.find((c) => c.t === 'mcp' && c.server === 'n8n' && c.tool === 'add_data_table_rows' && c.input.dataTableId === 'tab-exec'));
      ok('aprovação envia a execução para a fila do n8n', !!row && /meta_campanha_pausada|instagram_agendar/.test(row.input.rows[0].acao), row ? row.input.rows[0].acao : 'nenhuma linha');
    } else ok('Otto pediu aprovação de uma ação executável', false);
    ok('IA real: sem erros', page.errors.length === 0, page.errors.join(' | '));
    await ctx.close();
  }

  await browser.close();
  const fail = results.filter((r) => !r.ok);
  console.log(`\n${results.length - fail.length}/${results.length} verificações passaram.`);
  fs.writeFileSync(path.join(SHOTS, 'resultado.json'), JSON.stringify(results, null, 2));
  process.exit(fail.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
