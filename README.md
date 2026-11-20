# QA Automation Agent · Demo Web Shop + Tosca CoffeeShop

Monorepo con dos piezas:

| Carpeta | Qué es |
|---|---|
| [`agent/`](agent/README.md) | **Agente local (http://localhost:4000)** que analiza un sitio web y un OpenAPI, y genera casos de prueba en formato **Jira/Xray** y código de automatización **UI (POM)** y **API (CRUD)**. |
| [`automation/`](automation/README.md) | **Framework de automatización** Playwright + TypeScript + Cucumber BDD + POM + Serenity BDD + Allure, con los flujos de registro, compra y CRUD de Coffees. |
| `azure-pipelines.yml` + `pipelines/` | **CI/CD en Azure DevOps**: build, API, UI en Chromium/Firefox/WebKit y reportes. |

```
qa-automation-agent/
├── agent/                     # Agente (Node + Express + Playwright) y front web
│   ├── public/                # Front: index.html, app.js, styles.css
│   ├── server.js              # API local del agente
│   └── src/
│       ├── analyzer/          # Crawler del sitio, extractor de localizadores, lector OpenAPI
│       ├── generators/        # Casos Jira, POM/Cucumber UI, CRUD API, empaquetado ZIP
│       ├── knowledge/         # Copia local del OpenAPI de Tosca CoffeeShop (respaldo)
│       └── llm/               # Enriquecimiento opcional con Claude
├── automation/                # Framework de pruebas
│   ├── features/ui|api        # Gherkin en español
│   ├── src/pages              # Page Objects (POM) + componentes
│   ├── src/api                # Clientes REST, modelos, esquemas AJV
│   ├── src/steps              # Step definitions
│   ├── src/support            # World, hooks, Serenity, Allure
│   └── docs/jira              # Casos de prueba exportados (CSV Xray / CSV Jira / MD / JSON)
├── pipelines/templates/       # Plantillas reutilizables del pipeline
└── azure-pipelines.yml
```

## Inicio rápido

Requisitos: **Node.js 20+**, Git y (solo para el reporte Serenity) **Java 17+**.

```bash
# 1) Agente en localhost
cd agent
npm install
npx playwright install chromium     # o define AGENT_BROWSER_CHANNEL=chrome en agent/.env
npm start                           # abre http://localhost:4000

# 2) Framework de automatización
cd ../automation
npm install
npm run browsers:install            # Chromium, Firefox y WebKit
npm test                            # UI + API
npm run report:allure:open          # reporte Allure
```

## Flujo de trabajo con el agente

1. **Analizar sitio** → recorre el sitio (registro, login, carrito, categorías) y propone el mejor localizador por elemento.
2. **Analizar API** → lee el OpenAPI y detecta recursos CRUD (`POST`, `GET /{id}`, `PUT`, `DELETE`).
3. **Generar** → casos Jira, Page Objects, features, steps y clientes API.
4. **Descargar ZIP** → proyecto completo (framework + generado + pipeline), listo para subir a GitHub.

## Subir a GitHub y conectar Azure DevOps

```bash
git remote add origin https://github.com/<usuario>/<repositorio>.git
git push -u origin main
```

En Azure DevOps: **Pipelines → New pipeline → GitHub → (repositorio) → Existing Azure Pipelines YAML file → `/azure-pipelines.yml`**.
Al ejecutar puedes cambiar el filtro de tags (por defecto `not @wip`) y la lista de navegadores.
