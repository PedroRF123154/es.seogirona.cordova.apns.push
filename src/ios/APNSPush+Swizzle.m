#import "APNSPush+Swizzle.h"
#import <objc/runtime.h>
#import <UIKit/UIKit.h>
#import "APNSPush.h"

@implementation APNSPushSwizzle

typedef void (*IMP_didRegister)(id, SEL, UIApplication*, NSData*);
typedef void (*IMP_didFail)(id, SEL, UIApplication*, NSError*);
typedef void (*IMP_didReceive)(id, SEL, UIApplication*, NSDictionary*);
typedef void (*IMP_didReceiveFetch)(id, SEL, UIApplication*, NSDictionary*, void (^)(UIBackgroundFetchResult));

static IMP_didRegister g_orig_didRegister = NULL;
static IMP_didFail g_orig_didFail = NULL;
static IMP_didReceive g_orig_didReceive = NULL;
static IMP_didReceiveFetch g_orig_didReceiveFetch = NULL;

+ (void)install {
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        Class appDelegateClass = NSClassFromString(@"AppDelegate");
        if (!appDelegateClass) return;

        [self hookDidRegister:appDelegateClass];
        [self hookDidFail:appDelegateClass];
        [self hookDidReceive:appDelegateClass];
        [self hookDidReceiveFetch:appDelegateClass];
    });
}

+ (void)hookDidRegister:(Class)cls {
    SEL sel = @selector(application:didRegisterForRemoteNotificationsWithDeviceToken:);
    Method m = class_getInstanceMethod(cls, sel);
    if (m) {
        g_orig_didRegister = (IMP_didRegister)method_getImplementation(m);
    }

    IMP newImp = imp_implementationWithBlock(^void(id selfObj, UIApplication *app, NSData *token){
        APNSPush *plugin = [APNSPush shared];
        if (plugin) [plugin handleDeviceToken:token];

        if (g_orig_didRegister) {
            g_orig_didRegister(selfObj, sel, app, token);
        }
    });

    const char *types = m ? method_getTypeEncoding(m) : "v@:@@";
    class_replaceMethod(cls, sel, newImp, types);
}

+ (void)hookDidFail:(Class)cls {
    SEL sel = @selector(application:didFailToRegisterForRemoteNotificationsWithError:);
    Method m = class_getInstanceMethod(cls, sel);
    if (m) {
        g_orig_didFail = (IMP_didFail)method_getImplementation(m);
    }

    IMP newImp = imp_implementationWithBlock(^void(id selfObj, UIApplication *app, NSError *err){
        APNSPush *plugin = [APNSPush shared];
        if (plugin) [plugin handleRegisterError:err];

        if (g_orig_didFail) {
            g_orig_didFail(selfObj, sel, app, err);
        }
    });

    const char *types = m ? method_getTypeEncoding(m) : "v@:@@";
    class_replaceMethod(cls, sel, newImp, types);
}

+ (void)hookDidReceive:(Class)cls {
    SEL sel = @selector(application:didReceiveRemoteNotification:);
    Method m = class_getInstanceMethod(cls, sel);
    if (m) {
        g_orig_didReceive = (IMP_didReceive)method_getImplementation(m);
    }

    IMP newImp = imp_implementationWithBlock(^void(id selfObj, UIApplication *app, NSDictionary *userInfo){
        APNSPush *plugin = [APNSPush shared];
        if (plugin) [plugin handleRemoteNotification:userInfo];

        if (g_orig_didReceive) {
            g_orig_didReceive(selfObj, sel, app, userInfo);
        }
    });

    const char *types = m ? method_getTypeEncoding(m) : "v@:@@";
    class_replaceMethod(cls, sel, newImp, types);
}

+ (void)hookDidReceiveFetch:(Class)cls {
    SEL sel = @selector(application:didReceiveRemoteNotification:fetchCompletionHandler:);
    Method m = class_getInstanceMethod(cls, sel);
    if (m) {
        g_orig_didReceiveFetch = (IMP_didReceiveFetch)method_getImplementation(m);
    }

    IMP newImp = imp_implementationWithBlock(^void(id selfObj, UIApplication *app, NSDictionary *userInfo, void (^completion)(UIBackgroundFetchResult)){
        APNSPush *plugin = [APNSPush shared];
        if (plugin) {
            [plugin handleRemoteNotification:userInfo fetchCompletionHandler:completion];
        } else {
            if (completion) completion(UIBackgroundFetchResultNoData);
        }

        if (g_orig_didReceiveFetch) {
            g_orig_didReceiveFetch(selfObj, sel, app, userInfo, completion);
        }
    });

    const char *types = m ? method_getTypeEncoding(m) : "v@:@@@?";
    class_replaceMethod(cls, sel, newImp, types);
}

@end
