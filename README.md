# es.seogirona.cordova.apns.push

Plugin Cordova para iOS que registra y recibe notificaciones push vía APNs (sin Firebase).

## Instalar desde GitHub

Development:
```bash
cordova plugin add https://github.com/PedroRF123154/es.seogirona.cordova.apns.push --variable APNS_ENV=development
```

Production:
```bash
cordova plugin add https://github.com/PedroRF123154/es.seogirona.cordova.apns.push --variable APNS_ENV=production
```
USO
```bash
document.addEventListener('deviceready', function () {
  var push = PushNotification.init({});

  push.on('registration', function (data) {
    console.log('APNS token:', data.registrationId);
  });

  push.on('notification', function (data) {
    console.log('Notification:', data);
  });

  push.on('error', function (e) {
    console.error('Push error:', e);
  });
});
```
