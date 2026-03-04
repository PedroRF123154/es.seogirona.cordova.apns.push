# es.seogirona.cordova.apns.push

Plugin Cordova para **iOS** que registra el dispositivo y recibe
**notificaciones push vía APNs** sin utilizar Firebase.

Permite obtener el **deviceToken** y recibir eventos de notificación
desde JavaScript.

Compatible con **Apache Cordova** y envío de notificaciones desde
backend usando **APNs (.p8)**.

------------------------------------------------------------------------

# Instalación

## Development

``` bash
cordova plugin add https://github.com/PedroRF123154/es.seogirona.cordova.apns.push --variable APNS_ENV=development
```

## Production

``` bash
cordova plugin add https://github.com/PedroRF123154/es.seogirona.cordova.apns.push --variable APNS_ENV=production
```

------------------------------------------------------------------------

# Uso

``` javascript
document.addEventListener('deviceready', function () {

    var push = PushNotification.init({});

    push.on('registration', function (data) {
        console.log('APNS token:', data.registrationId);

        // Enviar el token al backend
        // ejemplo:
        // fetch('https://tu-servidor.com/register-token', {
        //     method: 'POST',
        //     body: JSON.stringify({ token: data.registrationId })
        // });
    });

    push.on('notification', function (data) {
        console.log('Notification:', data);
    });

    push.on('error', function (e) {
        console.error('Push error:', e);
    });

});
```

------------------------------------------------------------------------

# Eventos disponibles

  Evento         Descripción
  -------------- ------------------------------------------------------
  registration   Se dispara cuando el dispositivo se registra en APNs
  notification   Se dispara cuando llega una notificación
  error          Se dispara si ocurre un error en el registro

------------------------------------------------------------------------

# Requisitos

Para usar este plugin necesitas:

-   Apple Developer Account
-   APNs Auth Key `.p8`
-   Bundle ID configurado en Apple Developer
-   Push Notifications habilitado en Xcode

También debes habilitar:

    Push Notifications
    Background Modes → Remote notifications

------------------------------------------------------------------------

# Envío de notificaciones (APNs)

Las notificaciones deben enviarse desde tu servidor usando **APNs
HTTP/2**.

Endpoint:

    https://api.push.apple.com/3/device/{deviceToken}

Headers necesarios:

    authorization: bearer <JWT>
    apns-topic: <bundle-id>
    apns-push-type: alert
    apns-priority: 10

Ejemplo de payload:

``` json
{
  "aps": {
    "alert": {
      "title": "Notificación",
      "body": "Mensaje de prueba"
    },
    "sound": "default",
    "badge": 1
  }
}
```

------------------------------------------------------------------------

# Notas

-   Las notificaciones **no funcionan en el simulador de iOS**.
-   Deben probarse en **dispositivo real**.
-   El `deviceToken` cambia entre **sandbox** y **producción**.

------------------------------------------------------------------------

# Licencia

MIT
