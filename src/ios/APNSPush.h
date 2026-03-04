#import <Cordova/CDV.h>
#import <UserNotifications/UserNotifications.h>

@interface APNSPush : CDVPlugin <UNUserNotificationCenterDelegate>

@property (nonatomic, strong) NSString *eventCallbackId;

+ (instancetype)shared;

- (void)init:(CDVInvokedUrlCommand*)command;
- (void)requestPermissions:(CDVInvokedUrlCommand*)command;

// Called by swizzled AppDelegate methods:
- (void)handleDeviceToken:(NSData *)deviceToken;
- (void)handleRemoteNotification:(NSDictionary *)userInfo;
- (void)handleRemoteNotification:(NSDictionary *)userInfo fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler;
- (void)handleRegisterError:(NSError *)error;

@end
