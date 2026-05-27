# Supabase Migrations

Esta pasta guarda tudo o que precisarmos copiar, colar, revisar e versionar antes de aplicar no Supabase.

## Regra do projeto

- SQL de tabelas, policies, triggers, functions e ajustes estruturais fica em `sql/`
- Edge Functions, contratos e instrucoes de deploy ficam em `edge-functions/`
- ao alterar algo existente, atualize o arquivo correspondente em vez de deixar a mudanca solta fora desta pasta
- nenhuma mudanca de banco deve acontecer sem refletir aqui primeiro
