# DeadByte Spawner

`deadbyte-spawner` é o orquestrador do DeadByte v4: um painel Nuxt 4 + Nuxt UI 4 com API Nitro, PostgreSQL (Drizzle) e gerenciamento dos processos do bot.

## Responsabilidade

- Cadastrar repositórios de bot e sincronizá-los (clone, install, build, manifesto).
- Importar os comandos que o manifesto do bot declara.
- Criar instâncias (uma por número de WhatsApp) e gerar o `runtime.config.json` de cada uma.
- Iniciar, parar e reiniciar os bots, com restart automático após crash e auto-start após redeploy.
- Capturar stdout/stderr, interpretar eventos `__DEADBYTE_EVENT__` e salvar logs e eventos no PostgreSQL.

O spawner não contém lógica de comandos. Ele só configura comandos que existem no manifesto do bot.

## Deploy na Coolify

O repositório traz `Dockerfile` e `docker-compose.yml` prontos. A stack sobe três serviços:

| Serviço | Função |
| --- | --- |
| `spawner` | Painel + bots (Node 24, Chromium, FFmpeg, git, pnpm) |
| `postgres` | Banco do painel (PostgreSQL 17) |
| `rembg` | Remoção de fundo do comando `.bg` (opcional) |

### Passo a passo

1. Na Coolify, crie um recurso: **+ New → Public Repository** (ou Private com a GitHub App), aponte para `sergiooak/deadbyte-spawner`, branch `main`.
2. Em **Build Pack**, escolha **Docker Compose** (arquivo `/docker-compose.yml`).
3. Em **Domains**, defina o domínio do serviço `spawner` com a porta interna no fim, por exemplo `https://deadbyte.seudominio.com:3000`. O acesso externo fica em 443 com HTTPS (o painel e o WebSocket `/_ws` passam pelo mesmo domínio).
4. Em **Environment Variables**:
   - `SERVICE_PASSWORD_64_ADMIN`: senha do painel, gerada pela Coolify. Copie para entrar ou troque por uma sua (16+ caracteres).
   - `SERVICE_PASSWORD_64_LOGS`: token só leitura da API de logs (`DEADBYTE_LOGS_TOKEN`), gerado pela Coolify.
   - `SERVICE_PASSWORD_POSTGRES`: gerada pela Coolify. Não mexa depois do primeiro deploy (o banco já foi criado com ela).
   - `DEADBYTE_TTP_API_KEY`: necessária para o `!ttp`. Sem ela o comando responde erro e o log explica o motivo.
   - Opcionais: `DEADBYTE_TEXAS_API_KEY` (bíblia, música, emoji), `DEADBYTE_TYPESAFE_API_KEY` e `DEADBYTE_OPENAI_API_KEY` (Jev).
5. Clique em **Deploy**. O primeiro build leva alguns minutos. Acompanhe em **Logs**: o boot aparece como um evento `spawner.boot`.
6. Abra o domínio, entre com a senha e siga o onboarding:
   1. Em **Repositórios**, o oficial (`sergiooak/deadbyte-bot`) já está cadastrado e marcado. Clique nele e em **Sincronizar**.
   2. **Instâncias → Nova instância** com "Iniciar agora".
   3. Conecte o WhatsApp: escaneie o QR (Aparelhos conectados → Conectar um aparelho) ou, sem um segundo aparelho, use a aba **Número**: o painel gera um código de 8 caracteres e o WhatsApp do celular mostra uma notificação para digitá-lo.

Forks do bot entram em **Repositórios → Adicionar fork**. O oficial não pode ser excluído nem ter a URL trocada.

### Sessões entre deploys

O WhatsApp de cada instância continua conectado depois de redeploys e reinícios, sem escanear o QR de novo, desde que:

- **O volume persista.** `deadbyte-data` (montado em `/data`) guarda sessões, repositórios, configs e logs. Na Coolify ele aparece em **Persistent Storage**. Não use "Delete volumes" ao parar ou excluir o recurso, e não renomeie o volume no compose.
- **O desligamento seja limpo.** O compose dá 60 s (`stop_grace_period`) para o spawner parar os bots, que fecham o Chromium e gravam a sessão no volume.
- **O auto-start esteja ligado.** No boot, as instâncias com auto-start (ligado ao clicar em Iniciar) sobem sozinhas e reconectam. O evento `spawner.boot` lista o resultado de cada uma.

Se o container morrer no meio (OOM, reboot da VPS), o próximo start encerra bots e Chromium órfãos e limpa as travas do perfil antes de subir. Isso aparece como `orphanKilled`, `strayBotsKilled` ou `orphanChromiumKilled` no evento `instance.start`.

Faça backup do volume de tempos em tempos: é nele que estão as sessões.

### Atualizar o bot

Faça push no `deadbyte-bot`, abra o repositório no painel, clique em **Sincronizar** e depois em **Reiniciar** nas instâncias. Não precisa redeployar o spawner.

### Recursos da VPS

- Cada instância roda um Chromium: reserve cerca de 300–500 MB de RAM por número.
- O `rembg` usa cerca de 1 GB de RAM. Se não usar o comando de remover fundo, apague o serviço `rembg` do compose.
- O compose define `shm_size: 1gb` para o Chromium não travar.

### Logs

Wide events do evlog em `/data/logs` (spawner e um diretório por bot), com retenção de `DEADBYTE_LOG_RETENTION_DAYS` dias. Formato, API (`/api/logs` com o token `DEADBYTE_LOGS_TOKEN`) e roteiro de revisão em [LOGS.md](LOGS.md). O comando `/revisar-logs` do Claude Code automatiza a revisão.

## Segurança

- Login com a senha de `DEADBYTE_ADMIN_PASSWORD` (mínimo 16 caracteres). Sem senha válida, o build de produção fica bloqueado.
- Sessão em cookie `HttpOnly` criptografado (h3 sealed session), `SameSite=Lax`, `Secure` atrás de HTTPS, validade de 7 dias. Trocar a senha derruba todas as sessões.
- 5 tentativas erradas bloqueiam o IP por 15 minutos.
- Requisições de escrita de outra origem são recusadas (proteção CSRF por `Origin`).
- `/api/internal/*` só aceita chamadas de `127.0.0.1`.
- `DATABASE_URL`, `DEADBYTE_ADMIN_PASSWORD` e `SERVICE_PASSWORD_*` não são repassadas aos processos dos bots.
- O WebSocket `/_ws` exige um token de 60 s emitido só para sessões logadas.
- `DEADBYTE_LOGS_TOKEN` só lê `GET /api/logs*`; não abre o painel.
- A tela de configurações mostra só se cada segredo está definido, nunca o valor.

## Dados pessoais (LGPD)

O banco guarda logs dos bots, que podem conter números de telefone, nomes e trechos de mensagens. Para atender aos princípios de necessidade e minimização:

- Logs e eventos são apagados automaticamente após `DEADBYTE_LOG_RETENTION_DAYS` dias (padrão 180). A LGPD não fixa prazo máximo: exige guardar só enquanto houver finalidade (arts. 15 e 16). Os 180 dias acompanham o Marco Civil da Internet (art. 15), que manda guardar registros de acesso a aplicações por 6 meses. Prazo maior precisa de justificativa documentada.
- O número usado no pareamento por código não é salvo: passa só pela memória do bot e aparece mascarado nos eventos. O código de pareamento não vai para logs nem eventos.
- As tabelas `seen_contact`, `seen_chat` e `message_event` existem no schema mas ainda não são preenchidas. Antes de ativá-las, defina a finalidade e a base legal do tratamento.
- O painel exige login e não deve ser exposto sem HTTPS.

## Variáveis de ambiente

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | — | Conexão PostgreSQL |
| `DEADBYTE_ADMIN_PASSWORD` | — | Senha do painel (16+ caracteres) |
| `DEADBYTE_LOGS_TOKEN` | — | Token só leitura da API de logs (32+ caracteres) |
| `DEADBYTE_DATA_DIR` | `./.deadbyte` (`/data` no Docker) | Raiz de repos, instâncias e sessões |
| `DEADBYTE_BOT_DEFAULT_REPOSITORY_URL` | repo do `deadbyte-bot` | Repositório oficial, criado e protegido no boot |
| `DEADBYTE_INTERNAL_PORT_START`/`END` | `41000`/`41999` | Portas da API interna dos bots |
| `DEADBYTE_LOG_RETENTION_DAYS` | `180` | Retenção de logs e eventos (0 desliga) |
| `DEADBYTE_CHROME_PATH` | Chromium do sistema no Docker | Navegador do whatsapp-web.js |
| `FFMPEG_PATH`, `FFPROBE_PATH` | FFmpeg do sistema no Docker | Mídia |
| `DEADBYTE_REMBG_URL` | `http://rembg:7000` no compose | Servidor rembg (repassado aos bots) |
| `DEADBYTE_TEXAS_API_KEY`, `DEADBYTE_TTP_API_KEY`, `DEADBYTE_TYPESAFE_API_KEY`, `DEADBYTE_OPENAI_API_KEY` | — | Chaves opcionais repassadas aos bots |

## Identidade visual

- Tema só escuro, quadrado (`--ui-radius: 0`), alto contraste, primary `emerald` com brilho neon e cinzas `neutral`.
- Fontes (Google Fonts via `@nuxt/fonts`): **Pixelify Sans** nos títulos e números, **Chakra Petch** no corpo, **JetBrains Mono** em código, logs e controles.
- Imagens da marca em `public/brand/` (logo, favicons, hero do login, OG e ilustrações de estado). Hoje são placeholders; os prompts para gerar cada uma, usando as artes originais de `brand/reference/` como referência, estão em [brand/PROMPTS.md](brand/PROMPTS.md). Basta trocar o arquivo mantendo nome e tamanho.

### Ícones Nucleo Pixel

Os ícones são do **Nucleo Pixel** (`i-nucleo-<nome>`), no mesmo esquema do nuxt-layer da Supporte: CLI `nucleo`, mapa de decisões em `icons/map.json` e página `/dev/icons` em dev. Logo de marca vem do simple-icons. Os SVGs ficam exatamente como o Nucleo exportou.

A licença do Nucleo não permite publicar o catálogo e este repo é público. Por isso:

- O catálogo completo fica em `icons/nucleo-source.json`, fora do git. Copie o export do Nucleo Pixel para lá.
- O repo guarda só `icons/nucleo.json`, recortado com os ícones usados.

```bash
node cli/nucleo.mjs search robot bot
node cli/nucleo.mjs map instancia
pnpm icons:build
pnpm icons:check
```

`pnpm build` roda o `icons:check` antes e falha se algum ícone usado não estiver na coleção. Passo a passo para escolher ícone: [.agents/skills/nucleo-icons/SKILL.md](.agents/skills/nucleo-icons/SKILL.md).

## Desenvolvimento local

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Em `pnpm dev`, sem `DEADBYTE_ADMIN_PASSWORD`, o painel abre sem login e mostra um aviso. As migrations rodam sozinhas no boot.

No Windows, use um `DEADBYTE_SESSIONS_DIR` curto (ex.: `C:/dbt/sessions`): caminhos longos estouram o limite de 260 caracteres do Chromium e o WhatsApp Web desloga na hora.

### Banco

O schema fica em `server/db/schema/index.ts`. Para criar uma migration depois de alterar o schema:

```bash
pnpm db:generate
```

As migrations em `server/db/migrations` são aplicadas automaticamente quando o servidor sobe.

### Build

```bash
pnpm build
node .output/server/index.mjs
```

### Docker local

Crie um `.env` com `SERVICE_PASSWORD_POSTGRES` e `SERVICE_PASSWORD_64_ADMIN` e rode:

```bash
docker compose up --build
```

## API

Todas as rotas exigem sessão, exceto `/api/health` e `/api/auth/*`.

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Login (`{ password }`) |
| `GET` | `/api/repositories` | Lista repositórios |
| `POST` | `/api/repositories/:slug/sync-manifest` | Clona, instala, builda e importa comandos |
| `POST` | `/api/instances` | Cria instância (`start: true` já inicia) |
| `POST` | `/api/instances/:slug/start` \| `stop` \| `restart` | Controla o bot |
| `PATCH` | `/api/instances/:slug/commands` | Liga/desliga comandos e edita aliases |
| `GET` | `/api/instances/:slug/qr` | QR atual em SVG |
| `POST` | `/api/instances/:slug/pairing-code` | Gera código de pareamento (`{ phoneNumber }`) |
| `GET` \| `DELETE` | `/api/instances/:slug/pairing-code` | Código atual / volta para o QR |

## Comunicação com outros projetos

- Importa `@deadbyte/runtime` (npm) para validar manifesto e eventos.
- Controla `deadbyte-bot` por processo e runtime config, sem importar código de comando.
