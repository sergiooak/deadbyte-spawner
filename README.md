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

1. Na Coolify, crie um recurso: **+ New → Public/Private Repository**, aponte para `deadbyte-spawner`, branch `main`.
2. Em **Build Pack**, escolha **Docker Compose** (arquivo `/docker-compose.yml`).
3. Em **Domains**, defina o domínio do serviço `spawner`, por exemplo `https://deadbyte.seudominio.com:3000`. O `:3000` diz à Coolify a porta interna; o acesso externo fica em 443 com HTTPS.
4. Em **Environment Variables**, confira:
   - `SERVICE_PASSWORD_64_ADMIN`: senha do painel. A Coolify gera automaticamente. Para usar uma sua, troque o valor (mínimo 16 caracteres).
   - `SERVICE_PASSWORD_POSTGRES`: gerada automaticamente. Não precisa mexer.
   - Opcionais: `DEADBYTE_TEXAS_API_KEY`, `DEADBYTE_TTP_API_KEY`, `DEADBYTE_TYPESAFE_API_KEY`, `DEADBYTE_OPENAI_API_KEY` (comandos de música, figurinha de texto, Jev e parser).
5. Clique em **Deploy**. O primeiro build leva alguns minutos.
6. Abra o domínio, entre com a senha e siga o onboarding do painel:
   1. **Repositórios → Novo repositório** (já vem preenchido com `sergiooak/deadbyte-bot`) com "Sincronizar logo depois" ligado.
   2. **Instâncias → Nova instância** com "Iniciar agora".
   3. Conecte o WhatsApp: escaneie o QR (Aparelhos conectados → Conectar um aparelho) ou, sem um segundo aparelho, use a aba **Número**: o painel gera um código de pareamento de 8 caracteres e o WhatsApp do celular mostra uma notificação para digitar o código.

### O que persiste entre deploys

O volume `deadbyte-data` (montado em `/data`) guarda repositórios clonados, sessões do WhatsApp e configs das instâncias. Não apague esse volume, senão todos os números precisam escanear o QR de novo.

Depois de um redeploy, as instâncias que estavam ligadas sobem sozinhas (auto-start) e reconectam com a sessão salva.

### Atualizar o bot

Faça push no `deadbyte-bot`, abra o repositório no painel, clique em **Sincronizar** e depois em **Reiniciar** nas instâncias. Não precisa redeployar o spawner.

### Recursos da VPS

- Cada instância roda um Chromium: reserve cerca de 300–500 MB de RAM por número.
- O `rembg` usa cerca de 1 GB de RAM. Se não usar o comando de remover fundo, apague o serviço `rembg` do compose.
- O compose define `shm_size: 1gb` para o Chromium não travar.

## Segurança

- Login com a senha de `DEADBYTE_ADMIN_PASSWORD` (mínimo 16 caracteres). Sem senha válida, o build de produção fica bloqueado.
- Sessão em cookie `HttpOnly` criptografado (h3 sealed session), `SameSite=Lax`, `Secure` atrás de HTTPS, validade de 7 dias. Trocar a senha derruba todas as sessões.
- 5 tentativas erradas bloqueiam o IP por 15 minutos.
- Requisições de escrita de outra origem são recusadas (proteção CSRF por `Origin`).
- `/api/internal/*` só aceita chamadas de `127.0.0.1`.
- `DATABASE_URL`, `DEADBYTE_ADMIN_PASSWORD` e `SERVICE_PASSWORD_*` não são repassadas aos processos dos bots.
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
| `DEADBYTE_DATA_DIR` | `./.deadbyte` (`/data` no Docker) | Raiz de repos, instâncias e sessões |
| `DEADBYTE_BOT_DEFAULT_REPOSITORY_URL` | repo do `deadbyte-bot` | Sugestão no cadastro |
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
