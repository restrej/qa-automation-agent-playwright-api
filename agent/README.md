# QA Automation Agent (localhost)

Agente local que **analiza un sitio web y una API REST** y genera:

- **Casos de prueba en formato Jira**: CSV para Xray (una fila por paso), CSV para Jira nativo, Markdown y JSON.
- **Automatización UI**: Page Objects con los localizadores recomendados, registro de páginas, pasos genéricos y features (Cucumber en español). El feature E2E de compra sale con los datos de prueba que configures en pantalla.
- **Automatización API**: cliente REST por recurso, esquema de validación, pasos CRUD y feature con los 5 bloques (creación, consulta, actualización, eliminación, validación final).
- **ZIP del proyecto**: framework base (`../automation`) + lo generado + casos Jira + pipeline de Azure DevOps.

## Ejecutar

```bash
cd agent
cp .env.example .env        # opcional
npm install
npx playwright install chromium
npm start
```

Abre **http://localhost:4000**. Si prefieres no descargar Chromium, usa el Chrome instalado con `AGENT_BROWSER_CHANNEL=chrome` en `.env`. Para ver el navegador mientras analiza: `AGENT_HEADLESS=false`.

## Cómo decide los localizadores

Para cada campo y botón calcula candidatos y elige el más robusto:

| Prioridad | Estrategia | Ejemplo |
|---|---|---|
| 1 | `data-testid` | `page.getByTestId('login')` |
| 2 | Rol + nombre accesible (si es único) | `page.getByRole('button', { name: 'Register', exact: true })` |
| 3 | Label (si es único) | `page.getByLabel('Password:', { exact: true })` |
| 4 | ID estable (descarta IDs con números largos o autogenerados) | `page.locator('#FirstName')` |
| 5 | Placeholder / `name` | `page.getByPlaceholder('Search store')` |
| 6 | CSS corto (último recurso, marcado en rojo) | `page.locator('div.inputs input')` |

## Cómo detecta los flujos

- **Registro**: página con 2 campos de contraseña o ruta `/register`.
- **Login**: 1 campo de contraseña o ruta `/login`.
- **Compra**: carrito o botón *Add to cart* + menú de categorías.
- **Navegación**: menú superior con listas anidadas (categoría › subcategorías).
- **API**: recursos con `POST /x`, `GET /x/{id}`, `PUT` y `DELETE` (por ruta o por query `?id=`).

Si el OpenAPI no se puede descargar, puedes pegar el JSON; para Tosca CoffeeShop hay una copia local de respaldo (`src/knowledge`).

## IA opcional

Con `ANTHROPIC_API_KEY` en `.env`, el botón *Proponer casos adicionales con IA* toma una historia de usuario y agrega casos nuevos (etiqueta `ia`). Sin la clave, el agente funciona con sus reglas.

## API local

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/health` | estado y datos de prueba por defecto |
| POST | `/api/analyze-site` | `{ url, maxPages }` |
| POST | `/api/analyze-api` | `{ specUrl, specText?, baseUrl? }` |
| POST | `/api/enrich` | `{ requirements, site, cases }` |
| POST | `/api/generate` | `{ site, api, testData, options, extraCases }` |
| GET | `/api/runs/:id/zip` | descarga el proyecto |
| GET | `/api/runs/:id/file?path=` | descarga un archivo generado |

Cada generación también se guarda en `agent/output/<fecha>/`.

## Código generado

- `features/generated/*.feature` de formularios llevan `@wip`: completa los `<valores>` y el resultado esperado y quita el tag. El pipeline excluye `@wip` por defecto.
- `features/generated/<recurso>_crud.feature` es ejecutable tal cual (`@api @generated`).
