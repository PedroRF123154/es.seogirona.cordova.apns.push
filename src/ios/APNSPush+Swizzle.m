#import "APNSPush+Swizzle.h"
#import "APNSPush.h"
#import <objc/runtime.h>

@implementation APNSPushSwizzle

+ (void)install {

    Class appDelegate = NSClassFromString(@"AppDelegate");

    Method original =
    class_getInstanceMethod(appDelegate,
    @selector(application:didRegisterForRemoteNotificationsWithDeviceToken:));

    Method swizzled =
    class_getInstanceMethod(self,
    @selector(swizzled_application:didRegisterForRemoteNotificationsWithDeviceToken:));

    method_exchangeImplementations(original, swizzled);

}

- (void)swizzled_application:(UIApplication*)application
didRegisterForRemoteNotificationsWithDeviceToken:(NSData*)deviceToken {

    [[APNSPush shared] handleDeviceToken:deviceToken];

}

@end