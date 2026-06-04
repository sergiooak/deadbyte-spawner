# DeadByte Spawner

`deadbyte-spawner` é o orquestrador do DeadByte v4. Ele é um painel Nuxt/Nitro com Nuxt UI, PostgreSQL e Drizzle.

## Responsabilidade

- Cadastrar repositórios de bot.
- Clonar/fazer fetch/checkout com `simple-git`.
- Instalar, buildar e executar o comando de manifesto.
- Sincronizar comandos e aliases existentes no manifesto.
- Criar instâncias.
- Gerar `runtime.config.json`.
- Iniciar/parar/reiniciar processos com `execa`.
- Capturar stdout/stderr, parsear eventos `__DEADBYTE_EVENT__` e salvar logs/eventos no PostgreSQL.

## O que ele não deve fazer

O spawner não contém lógica de comandos do bot. Ele não inventa comandos no banco. Ele só configura comandos que existem no manifesto emitido pelo bot.

## Instalação

```bash
pnpm install
```

## Configuração

Crie o `.env` real:

```bash
cp .env.example .env
```

Configure principalmente:

```env
DATABASE_URL=postgres://deadbyte:deadbyte@localhost:5432/deadbyte
DEADBYTE_DATA_DIR=./.deadbyte
DEADBYTE_INTERNAL_PORT_START=41000
DEADBYTE_INTERNAL_PORT_END=41999
DEADBYTE_CHROME_PATH=
FFMPEG_PATH=
FFPROBE_PATH=
```

O spawner exige PostgreSQL para rodar corretamente. Ele não assume Docker.

## Banco

O schema fica em `server/db/schema/index.ts`.

As tabelas usam nomes singulares e diretos, sem prefixo `bot_`:

- `repository`
- `repository_version`
- `command`
- `command_alias`
- `instance`
- `instance_command`
- `instance_command_alias`
- `runtime_event`
- `runtime_process_log`
- `seen_contact`
- `seen_chat`
- `command_execution`
- `message_event`
- `instance_daily_stat`

Gere e rode migrations:

```bash
pnpm db:generate
pnpm db:migrate
```

## Desenvolvimento

```bash
pnpm dev
```

## Build

```bash
pnpm build
```

## Criar repository

Via API:

```bash
curl -X POST http://localhost:3000/api/repositories \
  -H "content-type: application/json" \
  -d '{"name":"DeadByte Bot","slug":"deadbyte-bot","repositoryUrl":"https://github.com/sergiooak/deadbyte-bot.git","defaultBranch":"main"}'
```

## Sincronizar comandos

```bash
curl -X POST http://localhost:3000/api/repositories/deadbyte-bot/sync-manifest
```

Isso clona/fetch, instala, builda, executa `pnpm manifest`, valida o manifesto com schema do runtime e sincroniza comandos.

## Criar instance

```bash
curl -X POST http://localhost:3000/api/instances \
  -H "content-type: application/json" \
  -d '{"repositorySlug":"deadbyte-bot","name":"Nitro","slug":"nitro","clientId":"nitro","branch":"main"}'
```

## Start/stop/restart

```bash
curl -X POST http://localhost:3000/api/instances/nitro/start
curl -X POST http://localhost:3000/api/instances/nitro/stop
curl -X POST http://localhost:3000/api/instances/nitro/restart
```

## Editar comandos

Use `PATCH /api/instances/:slug/commands`. O endpoint valida colisão de aliases antes de salvar e regenera `runtime.config.json`.

## Expansão

- Trocar o `ChildProcessManager` por PM2, Docker ou systemd sem alterar o bot.
- Adicionar filas para operações longas de clone/build.
- Implementar jobs de agregação para `instance_daily_stat`.
- Adicionar autenticação no painel antes de expor em rede.

## Comunicação com outros projetos

- Importa `@deadbyte/runtime` para validar manifesto e eventos.
- Controla `deadbyte-bot` por processo e runtime config.
- Não importa código de comando do bot diretamente; usa apenas manifesto.
