#import "RCTMediaPlayerView.h"
@import AVFoundation;

@interface RCTMediaPlayerView ()

@property (nonatomic, strong) NSTimer *progressTimer;

@end

@implementation RCTMediaPlayerView {
@private
  AVPlayer *player;
  id progressObserverHandle;
  BOOL shouldResumePlay;
  BOOL shouldContinuePlayWhenForeground;
  BOOL firstLayout;
  BOOL firstReady;
}

+ (Class)layerClass {
  return [AVPlayerLayer class];
}
- (AVPlayer*)player {
  return [(AVPlayerLayer *)[self layer] player];
}
- (void)setPlayer:(AVPlayer *)player {
  [(AVPlayerLayer *)[self layer] setPlayer:player];
}


- (instancetype) init {
  self = [super init];
  return self;
}

- (void)willMoveToWindow:(UIWindow *)newWindow {
  NSLog(@"willMoveToWindow...%@", newWindow);
  if(!newWindow) {
    [self releasePlayer];
  }
}

- (void)willMoveToSuperview:(UIView *)newSuperview {
  NSLog(@"willMoveToSuperview...%@", newSuperview);
  if(!newSuperview) {
    [self releasePlayer];
  }
}

- (void)initPlayerIfNeeded {
  if(!player) {
    NSURL *url;
    NSString *httpPrefix = @"http";
    if ([self.src hasPrefix:httpPrefix] || [self.src hasPrefix:@"file"]) {
        url = [NSURL URLWithString:self.src];
        NSDictionary * options = nil;
        if (_httpHeaders.count > 0 && ![self.src hasPrefix:@"file"]) {
            options = @{@"AVURLAssetHTTPHeaderFieldsKey" : _httpHeaders};
        }
        AVURLAsset * asset = [AVURLAsset URLAssetWithURL:url options:options];
        AVPlayerItem * item = [AVPlayerItem playerItemWithAsset:asset];
        player = [[AVPlayer alloc] initWithPlayerItem:item];
    } else {
        NSString *resourceType = [self.src pathExtension];
        NSString *resource = [[self.src lastPathComponent] stringByDeletingPathExtension];
        NSBundle *mainBundle = [NSBundle mainBundle];
        NSString *file = [mainBundle pathForResource:resource ofType:resourceType];
        if (!file) {
            file = _src; // might be local file path other than resources
        }
        url = [NSURL fileURLWithPath:file];
        player = [AVPlayer playerWithURL:url];
    }
    [self setPlayer:player];
    [self addProgressObserver];
    [self addObservers];

    if(player) {
      if(self.muted) {
        player.muted = YES;
      } else {
        player.muted = NO;
      }
    }
  }
}

- (void)releasePlayer {
  if(player) {
    [player pause];
    [self removeProgressObserver];
    [self removeObservers];
    player = nil;
    firstReady = false;
  }
}

- (void) setAutoplay:(BOOL)autoplay {
  NSLog(@"setAutoplay...autoplay=%d", autoplay);
  _autoplay = autoplay;
  [self updateProps];
}

- (void) setSrc: (NSString *)uri {
  NSLog(@"setSrc...src=%@", uri);
  _src = uri;

  if(player) {
    [self releasePlayer];
  }
  [self updateProps];
}

- (void) setHttpHeaders:(NSDictionary *)httpHeaders {
    NSLog(@"setHTTPHeaders...");
    _httpHeaders = httpHeaders;
    [self updateProps];
}

- (void) setPreload:(NSString *)preload {
  NSLog(@"setPreload...preload=%@", preload);
  _preload = preload;
  [self updateProps];
}

- (void) setLoop:(BOOL)loop {
  NSLog(@"setLoop...loop=%d", loop);
  _loop = loop;
  [self updateProps];
}

- (void) setMuted:(BOOL)muted {
  NSLog(@"setMuted...muted=%d", muted);
  _muted = muted;
  [self updateProps];
}

- (void) layoutSubviews {
  NSLog(@"layoutSubviews...");
  [super layoutSubviews];
  firstLayout = true;
  [self updateProps];
}

- (void) updateProps {
  if(!self.src || !firstLayout) {
    return;
  }

  if (!player) {
    if (self.autoplay) {
      [self initPlayerIfNeeded];
      [self play];
    } else {
      if ([self.preload isEqualToString:@"none"]) {

      } else if ([self.preload isEqualToString:@"metadata"]) {

      } else if ([self.preload isEqualToString:@"auto"]) {
        [self initPlayerIfNeeded];
      }
    }
  }
  if(player) {
    if(self.muted) {
      player.muted = YES;
    } else {
      player.muted = NO;
    }
  }
}



- (void) addProgressObserver {
  if(!progressObserverHandle) {
    if(player) {
      progressObserverHandle = [player addPeriodicTimeObserverForInterval:CMTimeMakeWithSeconds(1, 1) queue:NULL usingBlock:^(CMTime time) {
        [self notifyPlayerProgress];
      }];
    }

  }
}

- (void) removeProgressObserver {
  if(progressObserverHandle) {
    if(player) {
      [player removeTimeObserver:progressObserverHandle];
      progressObserverHandle = nil;
    }
  }
}

- (void) notifyPlayerProgress {
  if(player && player.currentItem) {
    double currentTime = CMTimeGetSeconds(player.currentTime);
    double totalTime = CMTimeGetSeconds(player.currentItem.duration);
    if(isnan(currentTime) || isinf(currentTime)) {
      currentTime = 0;
    }
    if(isnan(totalTime) || isinf(totalTime)) {
      totalTime = 0;
    }
    if(self.onPlayerProgress) {
      self.onPlayerProgress(@{@"current": @(currentTime * 1000), @"total": @(totalTime * 1000)}); //in millisec
    }
  }
}

- (void) notifyPlayerBuffering {
  if(self.onPlayerBuffering) {
    self.onPlayerBuffering(nil);
  }
}

- (void) notifyPlayerBufferOK {
  if(self.onPlayerBufferOK) {
    self.onPlayerBufferOK(nil);
  }
}

- (void) notifyPlayerBufferChange: (NSArray *)ranges {
  if(self.onPlayerBufferChange) {
    self.onPlayerBufferChange(@{@"ranges": ranges});
  }
}


- (void) notifyPlayerPlaying {
  if(self.onPlayerPlaying) {
    self.onPlayerPlaying(nil);
  }
}

- (void) notifyPlayerPaused {
  if (self.onPlayerPaused) {
    self.onPlayerPaused(nil);
  }
}

- (void) notifyPlayerFinished {
  if (self.onPlayerFinished) {
    self.onPlayerFinished(nil);
  }
}


- (void)addObservers {
  [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(applicationWillResignActive:)
                                               name:UIApplicationWillResignActiveNotification object:nil];
  [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(applicationDidBecomeActive:)
                                               name:UIApplicationDidBecomeActiveNotification object:nil];

  [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(playerItemDidReachEnd:)
                                               name:AVPlayerItemDidPlayToEndTimeNotification object:[player currentItem]];
  [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(playerItemPlaybackStalled:)
                                               name:AVPlayerItemPlaybackStalledNotification object:[player currentItem]];
  if (player) {
    [player addObserver:self forKeyPath:@"rate" options:0 context:nil];
    if (player.currentItem) {
      [player.currentItem addObserver:self forKeyPath:@"status" options:0 context:nil];
      [player.currentItem addObserver:self forKeyPath:@"loadedTimeRanges" options:0 context:nil];
      [player.currentItem addObserver:self forKeyPath:@"playbackBufferFull" options:0 context:nil];
      [player.currentItem addObserver:self forKeyPath:@"playbackBufferEmpty" options:0 context:nil];
    }
  }
}

- (void)removeObservers {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  if (player) {
    [player removeObserver:self forKeyPath:@"rate"];
    if (player.currentItem) {
      [player.currentItem removeObserver:self forKeyPath:@"status"];
      [player.currentItem removeObserver:self forKeyPath:@"loadedTimeRanges"];
      [player.currentItem removeObserver:self forKeyPath:@"playbackBufferFull"];
      [player.currentItem removeObserver:self forKeyPath:@"playbackBufferEmpty"];
    }
  }
}

- (void)applicationWillResignActive:(NSNotification *)notification {
  shouldContinuePlayWhenForeground = shouldResumePlay;
  [self pause];
}

- (void)applicationDidBecomeActive:(NSNotification *)notification {
  if (shouldContinuePlayWhenForeground) {
    [self play];
  }
}

- (void)playerItemDidReachEnd:(NSNotification *)notification {
  [self notifyPlayerFinished];
  if(player) {
    [player seekToTime:kCMTimeZero];
    if (self.loop) {
      [self play];
    }
  }
}
-(void) fullScreen:(int) orientation{
    
    [ self interfaceOrientation:orientation == 0 ? UIInterfaceOrientationLandscapeLeft:UIInterfaceOrientationPortrait] ;
}
/**
 *  强制屏幕转屏
 *
 *  @param orientation 屏幕方向
 */
- (void)interfaceOrientation:(UIInterfaceOrientation)orientation
{
    UIView * rootView = [UIApplication sharedApplication].keyWindow.rootViewController.view ;
    if(orientation == UIInterfaceOrientationPortrait){
        //添加到Window上
        [UIView animateWithDuration:0.25 animations:^{
            rootView.transform = CGAffineTransformMakeRotation(0);
        }];
        CGRect rx = [ UIScreen mainScreen ].bounds;
        CGFloat width = rx.size.width ;
        CGFloat height = rx.size.height;
        rootView.frame         = CGRectMake(0, 0, width, height);
        [rootView layer].frame = CGRectMake(0, 0, width, height);
        [[UIApplication sharedApplication] setStatusBarHidden:NO withAnimation:NO];
    }else{
        //添加到Window上
        CGRect rx = [ UIScreen mainScreen ].bounds;
        CGFloat width = rx.size.width ;
        CGFloat height =rx.size.height ;

        [UIView animateWithDuration:0.25 animations:^{
            rootView.transform = CGAffineTransformMakeRotation(M_PI / 2);
         //   self.transform = CGAffineTransformTranslate(self.transform, 0, (width-height)/2);
        }];
        rootView.frame         = CGRectMake(0, 0, width, height);
        [rootView layer].frame = CGRectMake(0, 0, width, height);
        [[UIApplication sharedApplication] setStatusBarHidden:YES withAnimation:NO];
    }
    
//
//    // arc下
//    if ([[UIDevice currentDevice] respondsToSelector:@selector(setOrientation:)]) {
//        SEL selector             = NSSelectorFromString(@"setOrientation:");
//        NSInvocation *invocation = [NSInvocation invocationWithMethodSignature:[UIDevice instanceMethodSignatureForSelector:selector]];
//        [invocation setSelector:selector];
//        [invocation setTarget:[UIDevice currentDevice]];
//        int val                  = orientation;
//        // 从2开始是因为0 1 两个参数已经被selector和target占用
//        [invocation setArgument:&val atIndex:2];
//        [invocation invoke];
//    }
    
//
//     // 非arc下
//     if ([[UIDevice currentDevice] respondsToSelector:@selector(setOrientation:)]) {
//     [[UIDevice currentDevice] performSelector:@selector(setOrientation:)
//     withObject:@(orientation)];
//     }
    
     // 直接调用这个方法通不过apple上架审核
     //[[UIDevice currentDevice] setValue:[NSNumber numberWithInteger:UIInterfaceOrientationLandscapeRight] forKey:@"orientation"];
    
}
- (void)playerItemPlaybackStalled:(NSNotification *)notification {
  [self notifyPlayerBuffering];
}

- (void) observeValueForKeyPath:(NSString *)keyPath ofObject:(id)object change:(NSDictionary<NSString *,id> *)change context:(void *)context {
  NSLog(keyPath);
  if(!player) {
    return;
  }
  if ([keyPath isEqualToString:@"status"]) {
    AVPlayerItem *playerItem = (AVPlayerItem *)object;
    if(playerItem.status == AVPlayerItemStatusReadyToPlay) {
      NSLog(@"status...ready to play");
      firstReady = true;
      [self notifyPlayerProgress];
      [self notifyPlayerBufferOK];
      if(player.rate != 0) {
        [self notifyPlayerPlaying];
      }
    } else if(playerItem.status == AVPlayerItemStatusUnknown) {
      NSLog(@"status...unknown");
    } else if(playerItem.status == AVPlayerItemStatusFailed) {
      NSLog(@"status...failed");
    }
  } else if ([keyPath isEqualToString:@"loadedTimeRanges"]) {
    NSMutableArray *array = [NSMutableArray arrayWithCapacity:1];
    for (NSValue *time in player.currentItem.loadedTimeRanges) {
      CMTimeRange range = [time CMTimeRangeValue];
      [array addObject:@{@"start": @(CMTimeGetSeconds(range.start) * 1000), @"duration": @(CMTimeGetSeconds(range.duration) * 1000)}];
    }
    [self notifyPlayerBufferChange:array];
  } else if( [keyPath isEqualToString:@"rate"]) {
    NSLog(@"rate=%f", player.rate);
    if(player.rate == 0) {
      [self notifyPlayerPaused];
    } else {
      if (firstReady) {
        [self notifyPlayerPlaying];
      } else {
        [self notifyPlayerBuffering];
      }
    }
  } else if([keyPath isEqualToString:@"playbackBufferFull"]) {
    [self notifyPlayerBufferOK];
    if (shouldResumePlay) {
      [self play];
    }
  }
}




- (void)pause {
  NSLog(@"pause...");
  if (player) {
    [player pause];
    shouldResumePlay = false;
  }
}

- (void)play {
  NSLog(@"play...");
  [self initPlayerIfNeeded];
  if(player) {
    [player play];
    shouldResumePlay = YES;
  }
}

- (void)stop {
  NSLog(@"stop...");
  if (player) {
    [player pause];
    [player seekToTime:kCMTimeZero];
    shouldResumePlay = false;
  }
}

- (void)seekTo: (NSTimeInterval) timeMs {
  NSLog(@"seekTo...timeMs=%f", timeMs);
  if(player) {
    CMTime cmTime = CMTimeMakeWithSeconds(timeMs/1000, 1);
    [player seekToTime:cmTime];
  }
}

@end
