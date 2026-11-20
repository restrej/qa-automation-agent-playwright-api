# Casos de prueba generados

## TC-001 · Registro exitoso de un usuario nuevo con datos válidos

**Prioridad:** Highest · **Componente:** Registro · **Tipo:** UI · **Labels:** registro, smoke, automatizado

**Precondición:** El usuario no está autenticado y navega en https://demowebshop.tricentis.com

**Descripción:** Validar que un visitante puede crear una cuenta diligenciando: First name, Last name, Email, Password, Confirm password.

| # | Acción | Datos | Resultado esperado |
|---|---|---|---|
| 1 | Ingresar a la página de inicio y dar clic en "Register" | https://demowebshop.tricentis.com | Se muestra el formulario de registro |
| 2 | Seleccionar género y diligenciar nombre, apellido, correo único y contraseña | Jose Elver / Arturo / correo único / Qa#123456 | Los campos aceptan los datos |
| 3 | Confirmar la contraseña y dar clic en "Register" |  | Se muestra el mensaje "Your registration completed" |
| 4 | Verificar la cabecera |  | Se ve el correo del usuario y el enlace "Log out" |

## TC-002 · Registro fallido con campos obligatorios vacíos

**Prioridad:** High · **Componente:** Registro · **Tipo:** UI · **Labels:** registro, negativo, automatizado

**Descripción:** Validar los mensajes de obligatoriedad. Campos obligatorios detectados: First name, Last name, Email, Password, Confirm password.

| # | Acción | Datos | Resultado esperado |
|---|---|---|---|
| 1 | Ingresar a la página de registro | https://demowebshop.tricentis.com/register/ | Se muestra el formulario |
| 2 | Dar clic en "Register" sin diligenciar datos |  | Se muestran mensajes "... is required." en cada campo obligatorio |

## TC-003 · Registro fallido con correo electrónico de formato inválido

**Prioridad:** Medium · **Componente:** Registro · **Tipo:** UI · **Labels:** registro, negativo

| # | Acción | Datos | Resultado esperado |
|---|---|---|---|
| 1 | Diligenciar el formulario con un correo sin formato válido | correo: usuario@@dominio |  |
| 2 | Dar clic en "Register" |  | Se muestra el mensaje "Wrong email" y no se crea la cuenta |

## TC-004 · Registro fallido cuando la confirmación de contraseña no coincide

**Prioridad:** Medium · **Componente:** Registro · **Tipo:** UI · **Labels:** registro, negativo

| # | Acción | Datos | Resultado esperado |
|---|---|---|---|
| 1 | Diligenciar el formulario con contraseñas diferentes | Password: Qa#123456 / Confirm: Qa#654321 |  |
| 2 | Dar clic en "Register" |  | Se muestra el mensaje de que las contraseñas no coinciden |

## TC-005 · Registro fallido con un correo ya registrado

**Prioridad:** Medium · **Componente:** Registro · **Tipo:** UI · **Labels:** registro, negativo

**Precondición:** Existe un usuario registrado con el correo a utilizar

| # | Acción | Datos | Resultado esperado |
|---|---|---|---|
| 1 | Diligenciar el formulario con un correo existente | correo existente |  |
| 2 | Dar clic en "Register" |  | Se muestra "The specified email already exists" |

## TC-006 · Compra exitosa de "14.1-inch Laptop" pagando con tarjeta de crédito Visa

**Prioridad:** Highest · **Componente:** Checkout · **Tipo:** UI · **Labels:** compra, e2e, smoke, automatizado

**Precondición:** Usuario recién registrado y autenticado con el carrito vacío

**Descripción:** Flujo E2E: registro > categoría > subcategoría > producto > carrito > checkout > pago con tarjeta > confirmación. Validaciones: registro exitoso y mensaje final de compra.

| # | Acción | Datos | Resultado esperado |
|---|---|---|---|
| 1 | Registrar un usuario nuevo | correo único | Se muestra "Your registration completed" |
| 2 | Ir a la categoría "Computers" > "Notebooks" |  | Se listan los productos |
| 3 | Agregar el producto "14.1-inch Laptop" al carrito | Cantidad: 1 | Se muestra "The product has been added to your shopping cart" |
| 4 | Ingresar al carrito, aceptar términos y dar clic en "Checkout" |  | Se abre el checkout en el paso "Billing address" |
| 5 | Diligenciar la dirección de facturación (nombre, apellido y correo quedan por defecto) | Company: Empresa Demo QA  \| Country: Colombia \| State: Other (Non US) \| City: Medellín \| Address 1: calle 14 # 6-51 \| Address 2: Carrera 17 # 3-56 \| Zip: 12315 \| Phone: 3177777777 \| Fax: 15464 | Se habilita el paso "Shipping address" |
| 6 | Continuar con la dirección y el método de envío por defecto |  | Se habilita "Payment method" |
| 7 | Seleccionar "Credit Card" como método de pago |  | Se habilita "Payment information" |
| 8 | Completar la información de pago | Select credit card: Visa \| Cardholder name: Barbara Gordon \| Card number: 4485564059489345 \| Expiration date: 04/2039 \| Card code: 123 | Se habilita "Confirm order" |
| 9 | Dar clic en "Confirm" |  | Se muestra "Your order has been successfully processed!" y un número de orden |

## TC-007 · Checkout bloqueado si no se aceptan los términos del servicio

**Prioridad:** Medium · **Componente:** Checkout · **Tipo:** UI · **Labels:** compra, negativo

**Precondición:** Usuario autenticado con al menos un producto en el carrito

| # | Acción | Datos | Resultado esperado |
|---|---|---|---|
| 1 | Ingresar al carrito |  | Se lista el producto agregado |
| 2 | Dar clic en "Checkout" sin marcar "I agree with the terms of service" |  | Se muestra la alerta de términos y no avanza al checkout |

## TC-008 · Pago rechazado por número de tarjeta inválido

**Prioridad:** Medium · **Componente:** Checkout · **Tipo:** UI · **Labels:** compra, negativo

**Precondición:** Usuario en el paso "Payment information"

| # | Acción | Datos | Resultado esperado |
|---|---|---|---|
| 1 | Diligenciar la tarjeta con un número inválido | Card number: 1234567890123456 |  |
| 2 | Dar clic en "Continue" |  | Se muestra "Wrong card number" y no avanza a la confirmación |

## TC-009 · Navegación por categoría "Computers" > subcategoría "Desktops"

**Prioridad:** Low · **Componente:** Catálogo · **Tipo:** UI · **Labels:** navegacion, catalogo

| # | Acción | Datos | Resultado esperado |
|---|---|---|---|
| 1 | Ingresar a la página de inicio | https://demowebshop.tricentis.com | Se muestra el menú superior de categorías |
| 2 | Posicionarse sobre "Computers" y dar clic en "Desktops" |  | Se muestra el listado de productos de "Desktops" |

## TC-010 · Navegación por categoría "Books"

**Prioridad:** Low · **Componente:** Catálogo · **Tipo:** UI · **Labels:** navegacion, catalogo

| # | Acción | Datos | Resultado esperado |
|---|---|---|---|
| 1 | Ingresar a la página de inicio | https://demowebshop.tricentis.com | Se muestra el menú superior de categorías |
| 2 | Dar clic en la categoría "Books" |  | Se muestra el listado de productos de "Books" |

## TC-011 · Envío del formulario "Search" en Demo Web Shop

**Prioridad:** Low · **Componente:** Formularios · **Tipo:** UI · **Labels:** formulario, home

**Descripción:** Campos detectados: q

| # | Acción | Datos | Resultado esperado |
|---|---|---|---|
| 1 | Ingresar a la página | https://demowebshop.tricentis.com/ | Se muestra el formulario |
| 2 | Diligenciar los campos con datos válidos | q |  |
| 3 | Dar clic en "Search" |  | El formulario se procesa sin errores de validación |

## TC-012 · [API] Ciclo de vida CRUD completo del recurso Coffees

**Prioridad:** Highest · **Componente:** API Coffees · **Tipo:** API · **Labels:** api, crud, coffees, automatizado, smoke

**Precondición:** API disponible en https://webservice.toscacloud.com

**Descripción:** Bloques: 1) Creación 2) Consulta 3) Actualización 4) Eliminación 5) Validación final. Esquema: Coffee (id, name, description).

| # | Acción | Datos | Resultado esperado |
|---|---|---|---|
| 1 | BLOQUE 1 - POST /api/v1/Coffees | { "id": 0, "name": "<único>", "description": "<único>" } | Status 200, estructura válida según el esquema y se persiste el ID generado |
| 2 | BLOQUE 2 - GET /api/v1/Coffees/{id} | id generado | Status 200, el objeto corresponde al creado y los campos son correctos |
| 3 | BLOQUE 3 - PUT /api/v1/Coffees | mismo id con nuevos valores | Status 200 y los cambios se reflejan (respuesta y nueva consulta) |
| 4 | BLOQUE 4 - DELETE /api/v1/Coffees?id={id} | id generado | Status 200 |
| 5 | BLOQUE 5 - GET /api/v1/Coffees/{id} | id eliminado | El recurso no existe (404/204 o respuesta vacía) |

## TC-013 · [API] Consultar un Coffee inexistente

**Prioridad:** Medium · **Componente:** API Coffees · **Tipo:** API · **Labels:** api, negativo, coffees, automatizado

| # | Acción | Datos | Resultado esperado |
|---|---|---|---|
| 1 | GET /api/v1/Coffees/{id} | id = 2147483000 | El recurso no existe (404/204 o respuesta vacía) |

## TC-014 · [API] Crear Coffee con propiedades no permitidas por el contrato

**Prioridad:** Medium · **Componente:** API Coffees · **Tipo:** API · **Labels:** api, negativo, contrato, coffees

**Descripción:** El esquema declara additionalProperties: false.

| # | Acción | Datos | Resultado esperado |
|---|---|---|---|
| 1 | POST /api/v1/Coffees | { "id": 0, "campoInexistente": "x" } | La API rechaza la petición (4xx) o ignora la propiedad sin persistirla |
