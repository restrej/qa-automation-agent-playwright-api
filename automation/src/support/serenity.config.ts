import { BeforeAll } from '@cucumber/cucumber';
import { configure } from '@serenity-js/core';

/**
 * Serenity/JS escucha los eventos de Cucumber y produce los JSON que
 * el CLI de Serenity BDD convierte en el reporte HTML (living documentation).
 *   npm run serenity:download   (una sola vez, requiere Java 17+)
 *   npm run report:serenity
 */
BeforeAll(function () {
  configure({
    crew: [
      ['@serenity-js/serenity-bdd', { specDirectory: 'features' }],
      ['@serenity-js/core:ArtifactArchiver', { outputDirectory: 'target/site/serenity' }],
    ],
  });
});
