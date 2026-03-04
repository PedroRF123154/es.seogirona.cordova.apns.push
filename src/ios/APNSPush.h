#import <Cordova/CDV.h>
#import <UserNotifications/UserNotifications.h>

@interface APNSPush : CDVPlugin <UNUserNotificationCenterDelegate>

@property (nonatomic, strong) NSString *callbackId;

+ (instancetype)shared;

- (void)init:(CDVInvokedUrlCommand*)command;

- (void)handleDeviceToken:(NSData*)deviceToken;
- (void)handleNotification:(NSDictionary*)userInfo;

@end