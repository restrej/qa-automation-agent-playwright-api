# language: es
@ui @compra
Característica: Proceso de compra con tarjeta de crédito
  Como cliente registrado de Demo Web Shop
  Quiero comprar un producto pagando con tarjeta de crédito
  Para recibirlo en mi dirección de entrega

  Antecedentes:
    Dado que el usuario se encuentra en la página de inicio de Demo Web Shop
    Y se registra con datos válidos y un correo único
    Y debe ver el mensaje de registro "Your registration completed"

  @smoke @e2e
  Esquema del escenario: Compra exitosa de "<producto>" pagando con tarjeta Visa
    Cuando navega a la categoría "<categoria>" y subcategoría "<subcategoria>"
    Y agrega el producto "<producto>" al carrito
    Y ingresa al carrito y da clic en Checkout
    Y diligencia la dirección de facturación con los datos:
      | Company           | Empresa Demo QA   |
      | Country           | Colombia          |
      | State / province  | Other (Non US)    |
      | City              | Medellín          |
      | Address 1         | calle 14 # 6-51   |
      | Address 2         | Carrera 17 # 3-56 |
      | Zip / postal code | 12315             |
      | Phone number      | 3177777777        |
      | Fax number        | 15464             |
    Y deja por defecto la dirección y el método de envío
    Y selecciona "Credit Card" como método de pago
    Y completa la información de pago con los datos:
      | Select credit card | Visa             |
      | Cardholder name    | Barbara Gordon   |
      | Card number        | 4485564059489345 |
      | Expiration date    | 04/2039          |
      | Card code          | 123              |
    Y confirma la orden
    Entonces debe ver el mensaje "Your order has been successfully processed!"
    Y debe generarse un número de orden

    Ejemplos:
      | categoria | subcategoria | producto               |
      | Computers | Notebooks    | 14.1-inch Laptop       |
      | Books     |              | Computing and Internet |
