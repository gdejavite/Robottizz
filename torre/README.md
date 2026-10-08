# Torre Gabriel

Um prédio em que cada andar é uma empresa, com agentes de IA trabalhando, pedindo aprovação, sendo revisados e aprendendo. Hoje o prédio tem o **7º andar (Robotizz)**, o **6º andar (Dejavite)** e a **Cobertura** (painel dos sócios).

O resultado final é **um único arquivo**: `dist/torre-gabriel.html`, pronto para colar no Cowork ou publicar como artifact.

## Estrutura

```
torre/
├── build.mjs              junta tudo em dist/torre-gabriel.html (sem dependências)
├── dist/torre-gabriel.html   o arquivo para usar no Cowork / artifact
├── src/
│   ├── index.html         só o HTML (abas, painéis, janelas)
│   ├── css/torre.css
│   ├── js/                o motor, um assunto por arquivo (lidos em ordem numérica)
│   │   ├── 00-core.js         utilitários e constantes
│   │   ├── 01-floors.js       modelo de andar (createFloor, inFloor, registerFloor)
│   │   ├── 02-iso.js, 03-scene.js, 07-render.js   desenho isométrico
│   │   ├── 06-sim.js          tarefas, revisão (Íris/Rui com IA), aprovações, reuniões
│   │   ├── 08-ui.js           HUD, painel do agente, operação, cards
│   │   ├── 09-memory.js       memória do time, metas, verificação real (PDCA)
│   │   ├── 10..16             entregas, PDCA, configuração, avisos, consumo, painel, conectores
│   │   ├── 17-nav.js          Cobertura, elevador, chat (roteamento com IA), reunião com debate
│   │   ├── 18-xp.js           XP, níveis, agente do mês
│   │   ├── 19-sound.js        sons opcionais (Web Audio)
│   │   ├── 20-digest.js       "Enquanto você estava fora"
│   │   ├── 21-report.js       relatório semanal (imprimir/PDF)
│   │   ├── 22-timeline.js     linha do tempo do dia
│   │   ├── 23-keys.js         atalhos de teclado e janelas acessíveis
│   │   ├── 24-data.js         dados privados da empresa e sincronização com o Supabase
│   │   ├── 25-sync.js         pendências salvas e compartilhadas entre aparelhos
│   │   ├── 26-actions.js      n8n: execução real e decisões vindas do Slack
│   │   └── 99-start.js        inicialização
│   └── floors/            um arquivo por empresa
│       ├── 6-dejavite.js
│       └── 7-robotizz.js
├── tests/                 teste automatizado no Chromium (IA e conectores simulados)
└── private/               SEUS DADOS REAIS (ignorado pelo Git, nunca publicar)
```

## Como gerar o arquivo

```bash
cd torre
node build.mjs
# ok: dist/torre-gabriel.html (312 KB, 28 arquivos)
```

O build:
1. confere a sintaxe do script montado (falha se algo quebrar);
2. **bloqueia o build se algum valor de `private/dados-privados.json` aparecer no código**, para que número interno não vaze ao publicar;
3. gera `dist/torre-gabriel.html`.

## Como testar

```bash
cd torre
npm i --no-save playwright-core@1.56     # uma vez (e npx playwright install chromium, se não tiver navegador)
node tests/smoke.cjs
# 41/41 verificações passaram (42 quando o Otto pede a ação de dinheiro, que testa a confirmação dupla)
```

O teste abre a Torre no Chromium, roda a simulação acelerada e confere cerca de 40 pontos: andares, atalhos, elevador, Cobertura, relatório, aprovação com confirmação dupla, linha do tempo, versão de celular, IA real (tarefa, revisão da Íris, roteamento da Recepção, reunião com debate), Slack, Supabase, n8n e persistência ao recarregar. As capturas de tela vão para `test-results/`.

## Dados privados (números reais)

Os números internos (receita, permanência, LTV, CAC, situação do pipeline, restrição do WhatsApp etc.) **não ficam no código**. Os textos dos agentes usam variáveis como `{{receita_set}}` e `{{cac_max}}`, preenchidas pelos "Dados da empresa", que ficam salvos só na sua conta e no seu aparelho.

Para carregar: **Agentes → Dados da empresa → Importar arquivo** e escolha `private/dados-privados.json`. O arquivo leva:

```json
{
  "_notify": { "n8nProject": "…", "n8nTable": "…" },
  "rob": {
    "facts": "LINHA DE BASE REAL: …",
    "vars": { "receita_set": "R$ …", "cac_max": "R$ …" },
    "met": { "receita": { "v": 0, "h": [0, 0] } },
    "insights": [ { "author": "dara", "text": "…", "tags": ["receita"] } ],
    "supa": { "project": "", "q": {} },
    "auto": false
  }
}
```

Quem já usava a Torre não perde nada: memória, metas e configurações salvas continuam valendo. Depois de importar o arquivo uma vez, o bot do n8n volta a ter os IDs da fila.

### Metas automáticas pelo Supabase

Em **Dados da empresa**, preencha o ID do projeto e uma consulta por meta. Cada consulta deve devolver linhas em ordem cronológica com a coluna `valor`. A última linha vira o valor atual; as anteriores, o histórico do gráfico. Exemplo:

```sql
select date_trunc('month', pago_em) as mes, sum(valor) as valor
from faturas where status = 'paga'
group by 1 order by 1;
```

Marque "Sincronizar sozinho" para atualizar ao abrir a Torre e a cada 6 horas. A **verificação do PDCA** usa esses números: 7 dias depois de uma aprovação, a Torre compara a meta antes e depois e grava na memória o que funcionou e o que não funcionou.

## Como criar um andar novo (≈ 1 hora)

1. Copie `src/floors/6-dejavite.js` para `src/floors/5-novaempresa.js`.
2. Troque `meta` (id, nome, andar, `lsKey` e `docName` únicos), `ROOMS`, `AG`, `WORKERS`, `ORDER`, `OWNER`, `REVID` (revisor), `RECID` (recepção), `MET`, `TPL`, `DV`, `CTX`, `ROUTE` e `seed`.
3. `node build.mjs`. O elevador, a Cobertura, o relatório, os avisos e os canais do Slack passam a incluir o andar sozinhos.

## Integrações com o n8n

Veja [`docs/n8n-fluxos.md`](docs/n8n-fluxos.md): aprovação pelo Slack (botões) e execução real (por exemplo, criar a campanha **pausada** depois da aprovação).
