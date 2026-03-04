#import "APNSPush.h"
#import "APNSPush+Swizzle.h"

@implementation APNSPush

static APNSPush *_shared = nil;

+ (instancetype)shared {
  return _shared;
}

- (void)pluginInitialize {
  [super pluginInitialize];
  _shared = self;

  // IMPORTANT: install swizzle to catch AppDelegate callbacks
  [APNSPushSwizzle install];

  if (@available(iOS 10.0, *)) {
    [UNUserNotificationCenter currentNotificationCenter].delegate = self;
  }
}

- (void)init:(CDVInvokedUrlCommand*)command {
  self.eventCallbackId = command.callbackId;

  CDVPluginResult *res = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];
  [res setKeepCallbackAsBool:YES];
  [self.commandDelegate sendPluginResult:res callbackId:self.eventCallbackId];

  [self registerForPush];
}

- (void)requestPermissions:(CDVInvokedUrlCommand*)command {
  if (@available(iOS 10.0, *)) {
    UNAuthorizationOptions opts = UNAuthorizationOptionAlert | UNAuthorizationOptionSound | UNAuthorizationOptionBadge;
    [[UNUserNotificationCenter currentNotificationCenter] requestAuthorizationWithOptions:opts
      completionHandler:^(BOOL granted, NSError * _Nullable error) {
        NSMutableDictionary *payload = [NSMutableDictionary dictionary];
        payload[@"granted"] = @(granted);
        if (error) payload[@"error"] = error.localizedDescription;

        CDVPluginResult *res = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:payload];
        [self.commandDelegate sendPluginResult:res callbackId:command.callbackId];
      }];
  } else {
    UIUserNotificationType types = (UIUserNotificationTypeAlert | UIUserNotificationTypeSound | UIUserNotificationTypeBadge);
    UIUserNotificationSettings *settings = [UIUserNotificationSettings settingsForTypes:types categories:nil];
    [[UIApplication sharedApplication] registerUserNotificationSettings:settings];

    CDVPluginResult *res = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:@{@"granted": @YES}];
    [self.commandDelegate sendPluginResult:res callbackId:command.callbackId];
  }
}

- (void)registerForPush {
  dispatch_async(dispatch_get_main_queue(), ^{
    if (@available(iOS 10.0, *)) {
      UNAuthorizationOptions options = UNAuthorizationOptionAlert | UNAuthorizationOptionSound | UNAuthorizationOptionBadge;
      [[UNUserNotificationCenter currentNotificationCenter] requestAuthorizationWithOptions:options
        completionHandler:^(BOOL granted, NSError * _Nullable error) {
          if (error) {
            [self sendEvent:@"error" data:@{@"message": error.localizedDescription ?: @"Permission error"}];
            return;
          }
          dispatch_async(dispatch_get_main_queue(), ^{
            [[UIApplication sharedApplication] registerForRemoteNotifications];
          });
        }];
    } else {
      UIUserNotificationType types = (UIUserNotificationTypeAlert | UIUserNotificationTypeSound | UIUserNotificationTypeBadge);
      UIUserNotificationSettings *settings = [UIUserNotificationSettings settingsForTypes:types categories:nil];
      [[UIApplication sharedApplication] registerUserNotificationSettings:settings];
      [[UIApplication sharedApplication] registerForRemoteNotifications];
    }
  });
}

#pragma mark - Swizzle callbacks

- (void)handleDeviceToken:(NSData *)deviceToken {
  if (![deviceToken isKindOfClass:[NSData class]]) return;

  const unsigned char *dataBuffer = (const unsigned char *)deviceToken.bytes;
  if (!dataBuffer) return;

  NSMutableString *hex = [NSMutableString stringWithCapacity:(deviceToken.length * 2)];
  for (int i = 0; i < (int)deviceToken.length; ++i) {
    [hex appendFormat:@"%02x", dataBuffer[i]];
  }

  [self sendEvent:@"registration" data:@{@"registrationId": hex}];
}

- (void)handleRemoteNotification:(NSDictionary *)userInfo {
  if (!userInfo) userInfo = @{};
  [self sendEvent:@"notification" data:userInfo];
}

- (void)handleRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler {
  if (!userInfo) userInfo = @{};
  [self sendEvent:@"notification" data:userInfo];
  if (completionHandler) completionHandler(UIBackgroundFetchResultNoData);
}

- (void)handleRegisterError:(NSError *)error {
  NSString *msg = error.localizedDescription ?: @"APNs registration error";
  [self sendEvent:@"error" data:@{@"message": msg}];
}

#pragma mark - UNUserNotificationCenterDelegate

- (void)userNotificationCenter:(UNUserNotificationCenter *)center
       willPresentNotification:(UNNotification *)notification
         withCompletionHandler:(void (^)(UNNotificationPresentationOptions options))completionHandler API_AVAILABLE(ios(10.0)) {

  NSDictionary *userInfo = notification.request.content.userInfo ?: @{};
  NSMutableDictionary *data = [userInfo mutableCopy];
  data[@"foreground"] = @YES;

  [self sendEvent:@"notification" data:data];

  completionHandler(UNNotificationPresentationOptionAlert |
                    UNNotificationPresentationOptionSound |
                    UNNotificationPresentationOptionBadge);
}

- (void)userNotificationCenter:(UNUserNotificationCenter *)center
didReceiveNotificationResponse:(UNNotificationResponse *)response
         withCompletionHandler:(void (^)(void))completionHandler API_AVAILABLE(ios(10.0)) {

  NSDictionary *userInfo = response.notification.request.content.userInfo ?: @{};
  NSMutableDictionary *data = [userInfo mutableCopy];
  data[@"tap"] = @YES;

  [self sendEvent:@"notification" data:data];
  if (completionHandler) completionHandler();
}

#pragma mark - Event bridge

- (void)sendEvent:(NSString*)type data:(NSDictionary*)data {
  if (!self.eventCallbackId) return;

  NSDictionary *payload = @{
    @"type": type ?: @"notification",
    @"data": data ?: @{}
  };

  CDVPluginResult *result = [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:payload];
  [result setKeepCallbackAsBool:YES];
  [self.commandDelegate sendPluginResult:result callbackId:self.eventCallbackId];
}

@end
