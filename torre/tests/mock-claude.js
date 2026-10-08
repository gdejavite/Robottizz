// Simula o runtime do artifact (window.claude) para os testes: IA (sample),
// banco da conta (db, persistido em localStorage para sobreviver ao reload),
// usuário, permissões e conectores MCP (Gmail, Slack, n8n, Supabase).
(function () {
  const LS = 'mock_db_v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch (e) { return {}; } };
  const save = (o) => localStorage.setItem(LS, JSON.stringify(o));
  const calls = (window.__mockCalls = []);
  const n8nRows = (window.__n8nRows = { dec: [] });
  let reviews = 0;
  const sample = {
    async json(prompt) {
      calls.push({ t: 'sample', kind: /JSON: \{"aprovado"/.test(prompt) ? 'revisao' : /"agente":"id da lista/.test(prompt) ? 'roteamento' : /"posicao"/.test(prompt) ? 'posicao' : /"a":"opção A"/.test(prompt) ? 'consolida' : /"resumo":"3 a 5/.test(prompt) ? 'resumo' : /"licoes"/.test(prompt) ? 'retro' : 'tarefa', len: prompt.length, prompt });
      await new Promise((r) => setTimeout(r, 200));
      if (/JSON: \{"aprovado"/.test(prompt)) { reviews++; return reviews === 1 ? { aprovado: false, motivo: 'faltou o aviso de risco', trecho: 'lucro todo mês', licao: 'Sempre incluir aviso de risco.' } : { aprovado: true }; }
      if (/"agente":"id da lista/.test(prompt)) return { agente: 'rita', area: 'Retenção', pergunta: '' };
      if (/"posicao"/.test(prompt)) return { posicao: 'Minha posição: priorizar retenção.' };
      if (/"a":"opção A"/.test(prompt)) return { resumo: 'Debate sobre retenção', a: 'Onboarding 30 dias', b: 'Reativação', recomendacao: 'A, porque segura quem chega.' };
      if (/"resumo":"3 a 5/.test(prompt)) return { resumo: 'Resumo de teste.', prioridade: 'Aprovar o plano.' };
      if (/"licoes"/.test(prompt)) return { licoes: [{ kind: 'insight', text: 'Lição de teste da retrospectiva', tags: ['conteudo'] }] };
      return { tipo: 'Legenda', entrega: 'Texto final da entrega de teste. Aviso: resultados passados não garantem resultados futuros.', resumo: 'Entrega de teste', impacto: 'Mais leads', depois: 'Publica', checagem: ['a', 'b', 'c'], precisa_de_voce: true, nivel: 'amarelo', pergunta: 'Aprovar a entrega de teste?', aprendizado: '', pdca: { plan: { objetivo: 'o', indicador: 'i', meta: 'm', hipotese: 'h', causa_raiz: '', w5h2: ['O quê: x'] }, do: 'd', check: { como: 'c', quando: '7 dias', criterio: 'x' }, act: { se_sucesso: 's', se_falha: 'f' }, ferramentas: ['PDCA'] } };
    }
  };
  const db = {
    doc(path) {
      return {
        async get() { const o = load(); return { exists: path in o, data: () => JSON.parse(JSON.stringify(o[path])) }; },
        async set(v) { const o = load(); o[path] = v; save(o); calls.push({ t: 'db.set', path }); }
      };
    }
  };
  const tools = {
    Slack: { slack_send_message: { inputSchema: { properties: { channel_id: {}, message: {}, thread_ts: {} }, required: ['channel_id', 'message'] } } },
    n8n: { get_data_table_rows: { inputSchema: { properties: { dataTableId: {}, projectId: {}, limit: {} } } } }
  };
  const mcp = {
    async listTools() { return { servers: [{ server: 'Gmail', authStatus: 'connected' }, { server: 'Slack', authStatus: 'connected' }, { server: 'Supabase', authStatus: 'connected' }, { server: 'n8n', authStatus: 'connected' }] }; },
    async describeTool(s, n) { const t = tools[s] && tools[s][n]; if (!t) throw { code: 'tool_error', message: 'unknown tool' }; return t; },
    async callTool(server, tool, input) {
      calls.push({ t: 'mcp', server, tool, input });
      if (server === 'Supabase' && tool === 'execute_sql') {
        const rows = /receita/.test(input.query) ? [{ mes: '2026-08', valor: 1771 }, { mes: '2026-09', valor: 1878 }, { mes: '2026-10', valor: 2100 }] : [{ valor: 7 }];
        return { content: [{ type: 'text', text: 'Below is the result <untrusted-data>' + JSON.stringify(rows) + '</untrusted-data>' }] };
      }
      if (server === 'n8n' && tool === 'get_data_table_rows') return { content: [{ type: 'text', text: JSON.stringify(n8nRows.dec) }] };
      if (server === 'Slack') return { ok: true, ts: '1700000000.000100' };
      return { ok: true };
    }
  };
  window.claude = {
    async use(name) {
      if (name === 'sample') return sample;
      if (name === 'db') return db;
      if (name === 'user') return { id: async () => 'u-teste' };
      if (name === 'mcp') return mcp;
      if (name === 'permissions') return { request: async () => true };
      throw { code: 'not_declared' };
    }
  };
})();
