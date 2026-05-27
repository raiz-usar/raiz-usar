# Integracao com Supabase

## Objetivo

Centralizar toda a comunicacao com o Supabase em um unico ponto do frontend e manter a documentacao tecnica do projeto no mesmo fluxo.

## Estrutura criada

```text
src/
  integrations/
    supabase/
      index.ts
      types/
        api.ts
        database.ts
        index.ts
  vite-env.d.ts

supabase-migrations/
  README.md
  sql/
    README.md
  edge-functions/
    README.md
```

## Arquivo central

Use sempre [index.ts](/C:/Users/Administrador/Documents/angolabs/raiz-front/src/integrations/supabase/index.ts) como porta de entrada.

Ele concentra:

- configuracao do projeto Supabase
- criacao lazy do client
- chamadas genericas para `select`, `insert`, `update`, `delete`, `rpc`, `storage` e `auth`
- exportacao das tipagens compartilhadas

## Variaveis de ambiente

Crie um `.env` na raiz baseado em [.env.example](/C:/Users/Administrador/Documents/angolabs/raiz-front/.env.example):

```env
VITE_SUPABASE_PROJECT_ID=umcscokdtviwklxcrwkx
VITE_SUPABASE_URL=https://umcscokdtviwklxcrwkx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_publishable_key_aqui
```

Observacoes:

- `VITE_SUPABASE_PROJECT_ID` ja vem preenchido com o project id informado.
- `VITE_SUPABASE_URL` ja aponta para o endpoint padrao do projeto.
- `VITE_SUPABASE_PUBLISHABLE_KEY` deve receber a chave publica atual do projeto.
- sem a `publishable key`, o app nao executa chamadas ao Supabase.
- nao usar `secret key` nem `service_role` no frontend.

## Como usar no codigo

```ts
import { supabaseApi } from "@/integrations/supabase";

const usuarios = await supabaseApi.list("usuarios", {
  filters: [{ column: "ativo", value: true }],
  orderBy: { column: "created_at", ascending: false },
});

const usuario = await supabaseApi.insert("usuarios", {
  nome: "Maria",
  email: "maria@email.com",
});
```

## Padrao de organizacao

### 1. Integracao

- toda chamada ao Supabase deve nascer em `src/integrations/supabase/index.ts`
- se precisarmos criar helpers mais especificos, eles devem ser expostos por esse arquivo central
- componentes e hooks nao devem instanciar `createClient` diretamente

### 2. Tipagens

- tipagens ficam em arquivos separados dentro de `src/integrations/supabase/types`
- `database.ts` guarda a tipagem estrutural do banco
- `api.ts` guarda DTOs e contratos utilitarios do frontend
- quando novas entidades surgirem, podemos criar arquivos adicionais como `user.dto.ts`, `appointments.dto.ts`, `profile.types.ts` e reexportar em `types/index.ts`

### 3. APIs e DTOs

Documente neste arquivo, sempre que uma nova integracao entrar:

- nome da tabela, view ou edge function
- objetivo da API
- payload de entrada
- payload de saida
- regras de acesso esperadas
- exemplos de uso no frontend

Sugestao de secao para repetir:

````md
## API: nome_da_tabela_ou_funcao

### Objetivo
Descreve o que essa integracao faz.

### DTO de entrada
```ts
type CreateExampleDto = {
  ...
};
```

### DTO de saida
```ts
type ExampleResponseDto = {
  ...
};
```

### Observacoes
- RLS
- indices
- triggers
- dependencias
````

## Regra obrigatoria para migrations e edge functions

Sempre que precisarmos criar ou alterar estruturas do Supabase:

- criar um arquivo novo em `supabase-migrations/` ou editar o arquivo existente correspondente
- registrar SQL de criacao/alteracao de tabelas em `supabase-migrations/sql/`
- registrar codigo, instrucoes ou payloads de Edge Functions em `supabase-migrations/edge-functions/`
- atualizar esta documentacao quando a API, DTO ou regra de negocio mudar

Essa passa a ser a regra do projeto: qualquer mudanca de banco, policy, trigger, function, bucket ou edge function deve deixar rastro versionado nessa pasta antes de ser aplicada no painel do Supabase.

## Proximo passo recomendado

Com a `publishable key` configurada e quando voce me passar a primeira estrutura de tabelas, eu posso:

- tipar o `database.ts` com as entidades reais
- criar os DTOs por dominio
- gerar os primeiros arquivos em `supabase-migrations/sql/`
- conectar as telas atuais com leitura e escrita reais

## API: raiz_profiles

### Objetivo
Guardar o perfil capilar principal da conta autenticada. Essa tabela eh a base da heuristica do app.

### Campos principais
- `user_id`: chave da conta autenticada
- `display_name`: nome exibido no app
- `hair_type`, `texture`, `porosity`, `density`, `scalp_oiliness`
- `wash_frequency`, `care_frequency`
- `blow_dryer_frequency`, `flat_iron_frequency`
- `nighttime_habits`, `sleeps_with_bonnet`, `uses_hair_protection`
- `protective_styles`: lace, trancas, dread, nina soft, natural solto etc
- `chemical_processes`
- `current_goals`, `main_challenges`, `recurring_symptoms`
- `region_climate`, `city_or_region`
- `reminders_enabled`, `onboarding_completed_at`

### Observacoes
- RLS por `auth.uid() = user_id`
- uma linha por usuario
- onboarding grava e atualiza essa tabela

## API: raiz_products

### Objetivo
Persistir os produtos que pertencem exclusivamente ao usuario autenticado e entram como contexto real nas recomendacoes.

### Campos principais
- `id`
- `user_id`
- `name`
- `category`
- `brand`
- `purpose`
- `is_active`

### Observacoes
- RLS por `auth.uid() = user_id`
- indice unico por `user_id + lower(name)`
- o onboarding inicial recria a base de produtos da conta

## API: raiz_checkins

### Objetivo
Persistir os registros diarios da conta: sintomas, produtos ativos, etapas concluidas, clima e scores calculados.

### Campos principais
- `user_id`
- `checkin_date`
- `selected_symptoms`
- `completed_steps`
- `selected_product_ids`
- `selected_habits`
- `daily_note`
- `photo_logged`
- `humidity`, `temperature`
- `hydration_score`, `strength_score`, `definition_score`, `ends_score`, `overall_score`
- `summary_title`, `summary_description`, `focus_label`

### Observacoes
- RLS por `auth.uid() = user_id`
- `unique (user_id, checkin_date)` para manter um check-in principal por dia
- o frontend atual faz upsert desse registro conforme o contexto do usuario muda
