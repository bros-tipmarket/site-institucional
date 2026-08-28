# Tipmarket — Site Institucional

Site institucional da Tipmarket, infraestrutura white-label de prediction markets.

Página estática, sem build: HTML, CSS e JavaScript puro (Tailwind via bundle local).

## Estrutura

```
index.html      página principal
contact.html    formulário de contato
assets/
  site.css      camada do site
  site.js       comportamento (mocks, tickers, formulário)
  base.css      reset, botões, tipografia
  base.js       navegação, menu mobile, scroll reveal
  tailwind.js   Tailwind 3.4.17
```

## Rodando localmente

Basta servir a pasta por HTTP:

```bash
python -m http.server 8000
```

E abrir <http://localhost:8000>.
