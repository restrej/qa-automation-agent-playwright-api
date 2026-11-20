# language: es
@ui @registro
Característica: Registro de usuario en Demo Web Shop
  Como visitante de la tienda Demo Web Shop
  Quiero crear una cuenta de usuario
  Para poder realizar compras en el sitio

  @smoke
  Escenario: Registro exitoso de un usuario nuevo
    Dado que el usuario se encuentra en la página de inicio de Demo Web Shop
    Cuando se registra con datos válidos y un correo único
    Entonces debe ver el mensaje de registro "Your registration completed"
    Y debe quedar autenticado con su correo en la cabecera

  @regresion
  Escenario: Registro fallido con campos obligatorios vacíos
    Dado que el usuario se encuentra en la página de registro
    Cuando envía el formulario de registro sin diligenciar datos
    Entonces debe ver el mensaje de validación "First name is required."
    Y debe ver el mensaje de validación "Email is required."
