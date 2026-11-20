# language: es
@api @coffees
Característica: CRUD del recurso Coffees en Tosca Cloud CoffeeShop
  Como consumidor de la API REST de CoffeeShop
  Quiero crear, consultar, actualizar y eliminar cafés
  Para garantizar la integridad del ciclo de vida del recurso

  @smoke @crud
  Escenario: Ciclo de vida completo de un Coffee
    # BLOQUE 1: Creación
    Dado que tengo un nuevo coffee con nombre único y descripción "Café de origen colombiano"
    Cuando creo el coffee con POST /api/v1/Coffees
    Entonces el código de respuesta debe ser 200
    Y la respuesta debe cumplir el esquema de Coffee
    Y el coffee creado debe tener un id generado y los datos enviados
    # BLOQUE 2: Consulta
    Cuando consulto el coffee creado con GET /api/v1/Coffees/{id}
    Entonces el código de respuesta debe ser 200
    Y la respuesta debe cumplir el esquema de Coffee
    Y el coffee consultado debe corresponder al creado
    # BLOQUE 3: Actualización
    Cuando actualizo el coffee con PUT /api/v1/Coffees con nombre "QA Coffee Actualizado" y descripción "Tostión media - actualizado"
    Entonces el código de respuesta debe ser 200
    Y la respuesta debe reflejar los cambios enviados
    Y al consultar nuevamente el coffee debe tener los datos actualizados
    # BLOQUE 4: Eliminación
    Cuando elimino el coffee con DELETE /api/v1/Coffees?id={id}
    Entonces el código de respuesta debe ser 200
    # BLOQUE 5: Validación final
    Cuando consulto nuevamente el coffee eliminado
    Entonces el recurso no debe existir

  @regresion
  Escenario: Consultar un coffee inexistente
    Cuando consulto el coffee con id 2147483000
    Entonces el recurso no debe existir
