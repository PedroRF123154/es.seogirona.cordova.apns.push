#import "APNSPush+Swizzle.h"
#import <objc/runtime.h>
#import <UIKit/UIKit.h>
#import "APNSPush.h"

@implementation APNSPushSwizzle

+ (void)install {
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    Class appDelegateClass = NSClassFromString(@"AppDelegate");
    if (!appDelegateClass) return;

    [self swizzleOrAdd:appDelegateClass
              original:@selector(application:didRegisterForRemoteNotificationsWithDeviceToken:)
             swizzled:@selector(apnspush_application:didRegisterForRemoteNotificationsWithDeviceToken:)];

    [self swizzleOrAdd:appDelegateClass
              original:@selector(application:didFailToRegisterForRemoteNotificationsWithError:)
             swizzled:@selector(apnspush_application:didFailToRegisterForRemoteNotificationsWithError:)];

    [self swizzleOrAdd:appDelegateClass
              original:@selector(application:didReceiveRemoteNotification:)
             swizzled:@selector(apnspush_application:didReceiveRemoteNotification:)];

    [self swizzleOrAdd:appDelegateClass
              original:@selector(application:didReceiveRemoteNotification:fetchCompletionHandler:)
             swizzled:@selector(apnspush_application:didReceiveRemoteNotification:fetchCompletionHandler:)];
  });
}

+ (void)swizzleOrAdd:(Class)cls original:(SEL)origSel swizzled:(SEL)swizSel {
  Method swizMethod = class_getInstanceMethod(self, swizSel);
  if (!swizMethod) return;

  BOOL didAddSwiz = class_addMethod(cls, swizSel, method_getImplementation(swizMethod), method_getTypeEncoding(swizMethod));
  if (!didAddSwiz) return;

  Method origMethod = class_getInstanceMethod(cls, origSel);
  Method newSwizMethod = class_getInstanceMethod(cls, swizSel);

  if (!origMethod) {
    class_addMethod(cls, origSel, method_getImplementation(newSwizMethod), method_getTypeEncoding(newSwizMethod));
    return;
  }

  method_exchangeImplementations(origMethod, newSwizMethod);
}

#pragma mark - Swizzled implementations

- (void)apnspush_application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {
  APNSPush *plugin = [APNSPush shared];
  if (plugin) [plugin handleDeviceToken:deviceToken];

  [self apnspush_application:application didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

- (void)apnspush_application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {
  APNSPush *plugin = [APNSPush shared];
  if (plugin) [plugin handleRegisterError:error];

  [self apnspush_application:application didFailToRegisterForRemoteNotificationsWithError:error];
}

- (void)apnspush_application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo {
  APNSPush *plugin = [APNSPush shared];
  if (plugin) [plugin handleRemoteNotification:userInfo];

  [self apnspush_application:application didReceiveRemoteNotification:userInfo];
}

- (void)apnspush_application:(UIApplication *)application
 didReceiveRemoteNotification:(NSDictionary *)userInfo
       fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler {

  APNSPush *plugin = [APNSPush shared];
  if (plugin) [plugin handleRemoteNotification:userInfo fetchCompletionHandler:completionHandler];

  [self apnspush_application:application didReceiveRemoteNotification:userInfo fetchCompletionHandler:completionHandler];
}

@end
