# Logs do DeadByte

Os logs são **wide events** do [evlog](https://evlog.dev): um evento JSON por operação, com todo o contexto, em vez de várias linhas soltas. Erros estruturados trazem `why` (por que aconteceu) e `fix` (como resolver).

## Onde ficam

No container, dentro do volume persistente `/data`:

| Caminho | Serviço | Conteúdo |
| --- | --- | --- |
| `/data/logs/spawner/AAAA-MM-DD.jsonl` | `deadbyte-spawner` | Requisições da API e operações internas |
| `/data/logs/bots/<instância>/AAAA-MM-DD.jsonl` | `deadbyte-bot` | Uma linha por mensagem com comando e eventos do WhatsApp |

Um arquivo por dia, em NDJSON (um JSON por linha). Arquivos mais antigos que `DEADBYTE_LOG_RETENTION_DAYS` (padrão 180) são apagados. Também há uma cópia dos logs no stdout do container (aba **Logs** da Coolify) e os eventos dos bots ficam no Postgres para o painel.

## Campos comuns

Todo evento tem `timestamp`, `level` (`info`, `warn`, `error`), `service`, `environment`, `version` e, quando houver, `commitHash`.

## Eventos do spawner

| Identificação | Quando | Campos úteis |
| --- | --- | --- |
| `method` + `path` + `status` + `duration` | Requisição HTTP da API | Só 10% das leituras (GET) são gravadas; escritas, erros (status ≥ 400) e chamadas lentas (≥ 1,5 s) sempre |
| `operation: "spawner.boot"` | Boot do container | `officialRepository`, `staleStatusesReset`, `autoStart` (resultado por instância) |
| `operation: "repository.sync"` | Sincronização do bot | `steps.git/install/build/manifest.durationMs`, `commitHash`, `result` |
| `operation: "instance.start"` / `"instance.stop"` | Start/stop de bot | `instanceSlug`, `trigger` (`manual`/`automatic`), `pid`, `orphanKilled`, `strayBotsKilled`, `forcedKill` |
| `event: "instance.exit"` | Bot saiu sozinho | `exitCode`, `crashed`, `uptimeMs`, `restart`, `stderrTail` (últimas 30 linhas de stderr), `why`/`fix` quando desiste |
| `operation: "logs.prune"` | Limpeza do banco (de hora em hora) | `deleted.processLogs`, `deleted.runtimeEvents` |
| `event: "realtime.action_failed"` | Ação pelo WebSocket falhou | `action`, `slug`, `error` |
| `event: "auth.not_configured"` | Boot sem senha válida | `why`, `fix` |

## Eventos do bot

| Identificação | Quando | Campos úteis |
| --- | --- | --- |
| `operation: "message"` | Mensagem que acionou um comando | `outcome` (`ok`, `error`, `denied`, `disabled`, `incomplete`), `command.id/alias/group`, `chat.type/name`, `sender.name/number` (número completo, só dígitos), `steps` (eventos em ordem), `details` (dados de cada passo, ex.: figurinha), `durationMs`, `error` com `why`/`fix` |
| `event: "runtime.started"` | Bot subiu | `mode`, `clientId` |
| `event: "whatsapp.*"` | Login, conexão, desconexão | `reason` em desconexões |

Mensagens sem comando não são gravadas. O texto das mensagens nunca entra nos logs. QR e código de pareamento também não.

## Como ler

### Pela API (sem SSH)

Use o token só leitura `DEADBYTE_LOGS_TOKEN` (na Coolify ele é gerado como `SERVICE_PASSWORD_64_LOGS`):

```bash
curl -H "Authorization: Bearer $DEADBYTE_LOGS_TOKEN" https://SEU-DOMINIO/api/logs
```

```bash
curl -H "Authorization: Bearer $DEADBYTE_LOGS_TOKEN" "https://SEU-DOMINIO/api/logs/issues?days=7"
```

```bash
curl -H "Authorization: Bearer $DEADBYTE_LOGS_TOKEN" "https://SEU-DOMINIO/api/logs/file?scope=bots/nitro&name=2026-10-12.jsonl" -o nitro.jsonl
```

- `/api/logs`: lista os arquivos (`scope`, `name`, `size`, `modifiedAt`).
- `/api/logs/issues?days=7&levels=error,warn&limit=500`: erros e avisos de todos os serviços, do mais novo ao mais antigo, cada um com `_scope`.
- `/api/logs/file?scope=spawner|bots/<instância>&name=AAAA-MM-DD.jsonl`: arquivo NDJSON completo.

O token só funciona em `GET /api/logs*`; não abre o painel nem outras rotas.

### Pelo servidor

```bash
docker exec $(docker ps -qf name=spawner) sh -c 'ls -lh /data/logs/spawner /data/logs/bots/*'
```

## O que procurar numa revisão

1. `level: "error"` com `why`/`fix`: o próprio evento diz a correção (ex.: variável de ambiente faltando).
2. `instance.exit` com `crashed: true`: leia `stderrTail`; vários seguidos indicam loop de crash.
3. `operation: "message"` com `outcome: "error"`: agrupe por `command.id` para achar o comando que mais falha.
4. `durationMs` alto em `message` ou `repository.sync`: lentidão de API externa ou de build.
5. `strayBotsKilled` ou `orphanKilled` frequentes: o spawner está reiniciando sem parar os bots direito.
6. Requisições com `status` 5xx no spawner.

O comando `/revisar-logs` do Claude Code (em `.claude/commands/revisar-logs.md`) faz esse roteiro.

## LGPD

Nomes de exibição, nomes de grupo e números de telefone entram completos nos logs para identificar quem usou cada comando. E-mails, cartões e tokens são mascarados pelo `redact` do evlog. A retenção padrão de 180 dias acompanha o Marco Civil da Internet (art. 15). Prazo maior precisa de justificativa documentada.
