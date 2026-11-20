# Automatización UI + API

**Stack:** Playwright · TypeScript · Cucumber BDD (Gherkin en español) · Page Object Model · Serenity BDD (Serenity/JS) · Allure · Ajv (contratos JSON)

## Escenarios

| Feature | Tags | Qué valida |
|---|---|---|
| `features/ui/registro.feature` | `@ui @registro @smoke` | **Validación 1:** registro exitoso ("Your registration completed" + usuario autenticado). Negativo de campos obligatorios. |
| `features/ui/compra.feature` | `@ui @compra @e2e @smoke` | Registro → Categoría > Subcategoría → producto al carrito → Checkout → facturación → envío por defecto → **Credit Card** (Visa / Barbara Gordon / 4485564059489345 / 04-2039 / 123) → confirmar. **Validación 2:** "Your order has been successfully processed!" + número de orden. Se ejecuta con *Computers > Notebooks* y con *Books* (sin subcategoría). |
| `features/api/coffees_crud.feature` | `@api @crud @smoke` | Bloques 1-5: POST (200, esquema, ID persistido) → GET /{id} (corresponde al creado) → PUT (cambios en respuesta y en nueva consulta) → DELETE ?id= (200) → GET final (no existe). |

## Ejecución

```bash
npm install
npm run browsers:install

npm test                              # todo
npm run test:ui                       # solo UI
npm run test:api                      # solo API
npm run test:chrome | test:firefox | test:webkit

# Navegador y filtros por variables / tags
BROWSER=firefox HEADLESS=false npm test -- --tags "@compra"
# Windows PowerShell
$env:BROWSER="webkit"; npm run test:ui
```

`BROWSER` acepta `chromium`, `chrome` (Chrome instalado), `firefox`, `webkit`. Copia `.env.example` a `.env` para fijar valores.

## Reportes

| Reporte | Comando | Ubicación |
|---|---|---|
| Allure | `npm run report:allure` y `npm run report:allure:open` | `allure-report/` |
| Serenity BDD | `npm run serenity:download` (una vez) y `npm run report:serenity` | `target/site/serenity/index.html` |
| Cucumber HTML / JUnit / JSON | automático | `reports/` |

Cada escenario UI adjunta captura final; si falla, guarda un *trace* de Playwright en `test-results/traces/` (ábrelo con `npx playwright show-trace <archivo>`). Las peticiones API se adjuntan como JSON en ambos reportes.

> Serenity/JS requiere ejecución en el proceso principal: deja `PARALLEL=0` (el paralelismo se logra en CI con la matriz de navegadores).

## Buenas prácticas aplicadas

- **POM:** `BasePage` + una clase por página + `HeaderComponent` reutilizable; `PageManager` crea los page objects por escenario.
- **Localizadores:** primero roles y labels accesibles únicos (`getByRole`, `getByLabel`), luego IDs estables del backend, y clases semánticas **acotadas a su contenedor** (p. ej. el botón *Continue* de cada paso del checkout). Sin XPath absolutos ni índices.
- **Esperas:** solo aserciones web-first (`expect(locator)`), sin `sleep`; espera explícita de los indicadores AJAX del checkout.
- **Datos:** usuario único por ejecución; datos de negocio en tablas Gherkin; builder para payloads API.
- **API:** cliente por recurso sobre `BaseApiClient`, validación de contrato con Ajv (`additionalProperties: false`), tiempo de respuesta, limpieza en `After` si el escenario falla antes del DELETE.
- **Aislamiento:** un `BrowserContext` y un `World` por escenario.

## Estructura

```
src/
├── config/env.ts                 # variables de entorno y navegador
├── pages/                        # POM (BasePage, HomePage, RegisterPage, CategoryPage, ProductPage, CartPage, CheckoutPage, OrderCompletedPage)
│   └── components/HeaderComponent.ts
├── api/clients|models|schemas    # CoffeeClient, Coffee + CoffeeBuilder, esquema Ajv
├── steps/ui|api                  # step definitions
├── support/                      # world, hooks, serenity.config, allure
└── data/                         # datos de prueba
docs/jira/                        # casos para importar en Jira (CSV Xray / CSV Jira)
```

## Importar los casos en Jira

- **Xray:** *Xray → Import → Test Case Importer → CSV* con `docs/jira/casos-prueba-xray.csv` (una fila por paso, agrupadas por `TCID`).
- **Jira nativo:** *Configuración del sistema → Importación externa → CSV* con `docs/jira/casos-prueba-jira.csv` (pasos en tabla dentro de la descripción; mapea "Issue Type" al tipo de tu proyecto).
