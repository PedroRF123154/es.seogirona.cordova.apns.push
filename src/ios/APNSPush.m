#import "APNSPush.h"

static APNSPush *sharedInstance;

@implementation APNSPush

+ (instancetype)shared {
    return sharedInstance;
}

- (void)pluginInitialize {

    sharedInstance = self;

    if (@available(iOS 10.0, *)) {
        [UNUserNotificationCenter currentNotificationCenter].delegate = self;
    }

}

- (void)init:(CDVInvokedUrlCommand*)command {

    self.callbackId = command.callbackId;

    CDVPluginResult *pluginResult =
    [CDVPluginResult resultWithStatus:CDVCommandStatus_OK];

    [pluginResult setKeepCallbackAsBool:YES];

    [self.commandDelegate sendPluginResult:pluginResult callbackId:self.callbackId];

    [[UIApplication sharedApplication] registerForRemoteNotifications];

}

- (void)handleDeviceToken:(NSData *)deviceToken {

    const unsigned char *dataBuffer = (const unsigned char *)deviceToken.bytes;

    NSMutableString *token  = [NSMutableString stringWithCapacity:(deviceToken.length * 2)];

    for (int i = 0; i < deviceToken.length; ++i) {
        [token appendFormat:@"%02x", dataBuffer[i]];
    }

    NSDictionary *payload = @{
        @"type": @"registration",
        @"data": @{@"registrationId": token}
    };

    CDVPluginResult *result =
    [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:payload];

    [result setKeepCallbackAsBool:YES];

    [self.commandDelegate sendPluginResult:result callbackId:self.callbackId];

}

- (void)handleNotification:(NSDictionary *)userInfo {

    NSDictionary *payload = @{
        @"type": @"notification",
        @"data": userInfo
    };

    CDVPluginResult *result =
    [CDVPluginResult resultWithStatus:CDVCommandStatus_OK messageAsDictionary:payload];

    [result setKeepCallbackAsBool:YES];

    [self.commandDelegate sendPluginResult:result callbackId:self.callbackId];

}

@end