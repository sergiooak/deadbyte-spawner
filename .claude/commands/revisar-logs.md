---
description: Revisa os logs de produção do DeadByte e propõe correções
argument-hint: "[dias, padrão 7]"
---

Revise os logs de produção do DeadByte dos últimos ${ARGUMENTS:-7} dias e proponha melhorias ou correções.

## Acesso

- URL do painel: variável de ambiente `DEADBYTE_URL` (ex.: `https://deadbyte.seudominio.com`).
- Token só leitura: variável de ambiente `DEADBYTE_LOGS_TOKEN`. Nunca imprima o valor do token.
- Se alguma das duas não existir, pare e peça ao usuário para defini-las.

## Passos

1. Leia `LOGS.md` neste repositório para entender o formato dos eventos.
2. Baixe os problemas recentes:
   `curl -s -H "Authorization: Bearer $DEADBYTE_LOGS_TOKEN" "$DEADBYTE_URL/api/logs/issues?days=${ARGUMENTS:-7}&limit=2000"`
3. Se precisar de contexto (por exemplo, a taxa de erro de um comando), baixe os arquivos do período com `/api/logs` e `/api/logs/file`.
4. Agrupe e conte:
   - erros por `command.id` (eventos `operation: "message"` com `outcome: "error"`), com a mensagem, o `why` e o `fix` mais comuns;
   - crashes (`event: "instance.exit"`, `crashed: true`) por instância, com o `stderrTail`;
   - operações lentas (`durationMs` acima do normal) e falhas de `repository.sync`;
   - respostas 5xx do spawner por `path`.
5. Para cada problema relevante, localize a causa no código: `../deadbyte-bot` para comandos e WhatsApp, e este repositório para o spawner.
6. Entregue um relatório curto em português:
   - **Resumo:** volume de mensagens, taxa de erro e crashes no período.
   - **Problemas:** do mais grave para o menos grave, com evidência (contagem e um exemplo), causa provável (arquivo:linha) e correção sugerida.
   - **Melhorias de log:** onde faltou contexto para diagnosticar.
7. Não altere código nem faça commit sem o usuário aprovar. Para correções triviais e seguras, ofereça já o patch.

## Cuidados

- Os eventos têm nomes de pessoas e grupos. Os números vêm completos nos logs; no relatório, cite só o necessário para identificar o caso.
- Não imprima tokens, chaves ou o conteúdo de variáveis de ambiente.
