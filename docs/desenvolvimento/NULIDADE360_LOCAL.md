# Nulidade360 em modo simulado, para o adaptador da Evidia

2026-11-17. Como exercitar a integração (T008) **sem custo** e sem tocar nos dados do
Nulidade360. Nada aqui executa análise real.

## O que o modo simulado é — e o que não é

- O Nulidade360 tem um modo de teste (`MOCK_AI=true`) que devolve blocos e achados fixos, sem
  chamar o provedor de IA. Serve para testar o caminho de ponta a ponta, **não** para analisar
  documentos: os achados e os índices são de teste.
- O modo só é livre de custo com arquivos de texto (`.txt`, `.md`). Com PDF, o motor envia o
  arquivo ao provedor antes de checar o modo. Por isso a Evidia **recusa PDF** enquanto a
  integração estiver em `mock` (erro `engine_requires_paid_run`).
- A análise real consome API paga e não está habilitada nesta versão.

## Subir os serviços

```powershell
# 1. Nulidade360 simulado e isolado (terminal próprio)
.\backend\scripts\start_nulidade360_mock.ps1 -Nulidade360Home "<pasta do projeto do Nulidade360>"

# 2. Evidia com a integração ligada só para este terminal (não altera o backend\.env)
$env:EVIDIA_NULIDADE360_MODE = "mock"
$env:EVIDIA_NULIDADE360_BASE_URL = "http://127.0.0.1:8530"
.\_start.ps1 -NoBrowser

# 3. Verificação (em backend\)
$env:PYTHONPATH = "."
.\.venv\Scripts\python.exe scripts\nulidade360_check.py
.\.venv\Scripts\python.exe scripts\ui_journey.py
```

Para deixar a integração ligada de forma permanente, coloque as duas variáveis no
`backend\.env`. Com `EVIDIA_NULIDADE360_MODE=disabled` (padrão), iniciar uma execução responde
erro de configuração e a tela informa que a integração não está configurada.

## Salvaguardas do script

| Risco | Como é evitado |
|---|---|
| Consumo de API paga | `MOCK_AI=true`; chave de IA do processo propositalmente inválida; a Evidia só envia `.txt`/`.md` |
| Alterar dados do Nulidade360 | O motor grava banco, uploads e logs relativos à pasta de trabalho; o script usa `backend\data\nulidade360_sandbox` (ignorada pelo Git) |
| Motor fora do modo simulado sem ninguém perceber | A execução só é marcada como simulada quando o próprio motor declara o modo; se não declarar, a Evidia registra o alerta de possível consumo de API paga |

## Ao encerrar

Encerrar os três processos (Nulidade360, API e frontend). O `--reload` da API deixa um
processo filho segurando a porta 8007 se só o pai for encerrado: encerrar a árvore inteira.

## Modo real (consome API paga)

Só com autorização de custo. A chave do provedor entra por variável de ambiente do terminal,
nunca por parâmetro nem por arquivo versionado:

```powershell
$env:NULIDADE360_GEMINI_API_KEY = "<chave>"
.\backend\scripts\start_nulidade360_live.ps1 -Nulidade360Home "<pasta do projeto do Nulidade360>"

# em outro terminal
$env:EVIDIA_NULIDADE360_MODE = "live"
$env:EVIDIA_NULIDADE360_BASE_URL = "http://127.0.0.1:8530"
.\_start.ps1 -NoBrowser
```

O motor roda em `backend\data\nulidade360_live` (ignorada pelo Git), separada do modo
simulado. A Evidia ainda envia só `.txt` e `.md`. A execução real não leva a marca de modo
simulado; se o motor responder simulado com a Evidia em modo real, isso aparece como
limitação da execução. O motor não informa custo nem tokens: o valor fica no painel do provedor.
O trecho de cada citação é conferido contra a página do documento — com modelo real, parte das
citações vem com a página errada.
