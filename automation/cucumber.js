/**
 * Configuración de Cucumber.
 *  - Serenity/JS  -> genera los JSON para el reporte Serenity BDD (target/site/serenity)
 *  - Allure       -> genera allure-results
 *  - JUnit        -> reports/cucumber-junit.xml (lo publica Azure DevOps)
 * Filtra por tags con: npm test -- --tags "@ui and @compra"
 */
const common = {
  paths: ['features/**/*.feature'],
  requireModule: ['ts-node/register'],
  require: ['src/support/**/*.ts', 'src/steps/**/*.ts'],
  format: [
    'progress-bar',
    '@serenity-js/cucumber:./reports/serenity-adapter.log',
    'allure-cucumberjs/reporter:./reports/allure-adapter.log',
    'junit:./reports/cucumber-junit.xml',
    'html:./reports/cucumber-report.html',
    'json:./reports/cucumber-report.json',
  ],
  formatOptions: {
    specDirectory: 'features',
    resultsDir: 'allure-results',
    environmentInfo: {
      Navegador: process.env.BROWSER ?? 'chrome',
      BASE_URL: process.env.BASE_URL ?? 'https://demowebshop.tricentis.com',
      API_BASE_URL: process.env.API_BASE_URL ?? 'https://webservice.toscacloud.com',
      Node: process.version,
    },
    labels: [
      { pattern: [/@epic:(.*)/], name: 'epic' },
      { pattern: [/@severity:(.*)/], name: 'severity' },
    ],
    links: {
      issue: { pattern: [/@issue:(.*)/], urlTemplate: process.env.JIRA_BROWSE_URL ?? 'https://tu-jira.atlassian.net/browse/%s' },
    },
    snippetInterface: 'async-await',
  },
  retry: Number(process.env.RETRIES ?? 0),
  // Serenity/JS solo soporta ejecución en el proceso principal (parallel 0)
  parallel: Number(process.env.PARALLEL ?? 0),
};

module.exports = {
  default: common,
  ci: { ...common, retry: 1, format: common.format.filter((f) => f !== 'progress-bar').concat('summary') },
};
