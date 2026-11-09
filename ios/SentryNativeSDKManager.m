//
//  SentryNativeSDKManager.m
//  NewExpensify
//
//  Initializes the Sentry native SDK before JS loads so native code (e.g. certificate pinning
//  monitor reports) can capture events reliably. Uses the same initialization path as
//  @sentry/react-native (RNSentryStart) so JS Sentry.init() can attach with autoInitializeNativeSdk: false.
//

#import "SentryNativeSDKManager.h"
#import "RNCConfig.h"

@import Sentry;
#import <RNSentry/RNSentryStart.h>

@implementation SentryNativeSDKManager

static BOOL initialized = NO;

+ (instancetype)shared {
    static SentryNativeSDKManager *instance = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        instance = [[SentryNativeSDKManager alloc] init];
    });
    return instance;
}

- (NSString *)getConfigValue:(NSString *)key fallback:(NSString *)fallback {
    NSString *value = [RNCConfig envFor:key] ?: @"";
    return value.length > 0 ? value : fallback;
}

- (void)initialize {
    if (initialized) {
        return;
    }
    initialized = YES;

    NSString *environment = [self getConfigValue:@"ENVIRONMENT" fallback:@"development"];
    BOOL enableOnDev = [[self getConfigValue:@"ENABLE_SENTRY_ON_DEV" fallback:@"false"] isEqualToString:@"true"];
    if ([environment isEqualToString:@"development"] && !enableOnDev) {
        return;
    }

    NSString *dsn = [self getConfigValue:@"SENTRY_DSN"
        fallback:@"https://7b463fb4d4402d342d1166d929a62f4e@o4510228013121536.ingest.us.sentry.io/4510228107427840"];

    // CFBundleVersion is e.g. "9.4.14.0" but JS uses semantic version "new.expensify@9.4.14" and dist "0".
    NSString *version = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"CFBundleVersion"] ?: @"";
    NSRange lastDot = [version rangeOfString:@"." options:NSBackwardsSearch];
    NSString *semanticVersion = version;
    NSString *buildNumber = @"";
    if (lastDot.location != NSNotFound) {
        semanticVersion = [version substringToIndex:lastDot.location];
        buildNumber = [version substringFromIndex:lastDot.location + 1];
    }

    // On New Architecture, React Native wraps JS errors in C++ exceptions caught by the native crash
    // handler. Filter these out since the JS error handler already reports them. Matches prepareOptions:
    // in RNSentry.mm which is not called when we initialize natively.
    SentryBeforeSendEventCallback beforeSend = ^SentryEvent *(SentryEvent *event) {
        for (SentryException *exception in event.exceptions) {
            if (exception.value != nil &&
                [exception.value rangeOfString:@"ExceptionsManager.reportException"].location != NSNotFound) {
                return nil;
            }
        }

        // Filter false-positive AppHang events during background suspension where the main thread is idle in mach_msg
        SentryException *firstException = event.exceptions.firstObject;
        BOOL isAppHang = [firstException.type isEqualToString:@"AppHang"] ||
                         [firstException.mechanism.type isEqualToString:@"AppHang"];
        if (isAppHang) {
            UIApplicationState state = UIApplication.sharedApplication.applicationState;
            BOOL isBackgroundOrInactive = (state != UIApplicationStateActive);

            for (SentryThread *thread in event.threads) {
                if (thread.isMain && thread.stacktrace != nil) {
                    SentryFrame *topFrame = thread.stacktrace.frames.lastObject;
                    NSString *symbol = topFrame.function ?: @"";
                    if (isBackgroundOrInactive &&
                        ([symbol containsString:@"mach_msg"] || [symbol containsString:@"CFRunLoopServiceMachPort"])) {
                        // Drop idle run loop hang captured during OS background suspension
                        return nil;
                    }
                    break;
                }
            }

            // Tag native application state and split hang issues by screen
            NSString *stateString = state == UIApplicationStateActive ? @"active" :
                                    (state == UIApplicationStateBackground ? @"background" : @"inactive");
            NSMutableDictionary *tags = [event.tags mutableCopy] ?: [NSMutableDictionary dictionary];
            tags[@"ios.app_state"] = stateString;
            event.tags = tags;

            NSString *lastScreen = @"unknown";
            for (SentryBreadcrumb *breadcrumb in [event.breadcrumbs reverseObjectEnumerator]) {
                if ([breadcrumb.category isEqualToString:@"navigation.route"] ||
                    [breadcrumb.category isEqualToString:@"navigation"]) {
                    NSString *route = breadcrumb.data[@"route"] ?: breadcrumb.data[@"screen"];
                    if (route.length > 0) {
                        lastScreen = route;
                        break;
                    }
                }
            }
            NSString *hangType = [event.level isEqualToString:@"fatal"] ? @"fully_blocking" : @"non_fully_blocking";
            event.fingerprint = @[@"app-hang", hangType, lastScreen];
        }

        return event;
    };

    NSMutableDictionary *optionsDict = [@{
        @"dsn": dsn,
        @"environment": environment,
        @"debug": @([environment isEqualToString:@"development"]),
        @"beforeSend": beforeSend,
        @"enableMetricKit": @YES,
        @"enableReportNonFullyBlockingAppHangs": @NO,
    } mutableCopy];
    if (semanticVersion.length > 0) {
        optionsDict[@"release"] = [NSString stringWithFormat:@"new.expensify@%@", semanticVersion];
    }
    if (buildNumber.length > 0) {
        optionsDict[@"dist"] = buildNumber;
    }

    NSError *error = nil;
    [RNSentryStart startWithOptions:optionsDict error:&error];
    if (error != nil) {
        NSLog(@"[SentryNativeSDKManager] Failed to initialize Sentry: %@", error.localizedDescription);
    }
}

@end
