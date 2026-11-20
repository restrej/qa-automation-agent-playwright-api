import 'allure-cucumberjs'; // registra el runtime de Allure (labels, parámetros, pasos)
import { Before } from '@cucumber/cucumber';
import * as allure from 'allure-js-commons';
import { env } from '../config/env';

/**
 * El navegador se registra como parámetro: así Allure no mezcla como "reintentos"
 * el mismo escenario ejecutado en Chromium, Firefox y WebKit.
 */
Before({ tags: '@ui' }, async function () {
  await allure.parameter('Navegador', env.browser);
  await allure.label('layer', 'ui');
});

Before({ tags: '@api' }, async function () {
  await allure.label('layer', 'api');
});
