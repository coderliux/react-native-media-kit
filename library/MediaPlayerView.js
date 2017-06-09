import React, {PropTypes} from 'react';

import ReactNative, {
    StyleSheet,
    View,
    NativeModules,
    requireNativeComponent,
    Image ,
    Dimensions ,
    Animated ,
    TouchableWithoutFeedback ,
    DeviceEventEmitter ,
    InteractionManager ,
    Text ,
    TouchableOpacity ,
    ActivityIndicator,
    Platform,
    BackAndroid,

} from 'react-native';

import {Actions} from 'react-native-router-flux'
import Controls from './Controls';
const {width, height} = Dimensions.get('window');

const UIManager = NativeModules.UIManager;
const RCT_MEDIA_PLAYER_VIEW_REF = "RCTMediaPlayerView";
const RCTMediaPlayerView = requireNativeComponent('RCTMediaPlayerView', {
    name: 'RCTMediaPlayerView',
    propTypes: {
        ...View.propTypes,
        src: PropTypes.string,
        httpHeaders: PropTypes.objectOf(PropTypes.string),
        autoplay: PropTypes.bool,
        preload: PropTypes.string,
        loop: PropTypes.bool,
        muted: PropTypes.bool,
        srcs:PropTypes.array,
        onPlayerPaused: PropTypes.func,
        onPlayerPlaying: PropTypes.func,
        onPlayerFinished: PropTypes.func,
        onPlayerBuffering: PropTypes.func,
        onPlayerBufferOK: PropTypes.func,
        onPlayerProgress: PropTypes.func,
        onPlayerBufferChange: PropTypes.func ,
        canSeekUnwatch:PropTypes.bool,
        isTrainning:PropTypes.bool

    }
});
const sourceKinds = ["流畅","标清","高清","超清"];
export default class MediaPlayerView extends React.Component {
    screenStatus = 1 ;  // 0 : 横屏， 1： 竖屏
    showControl = true ;
    seekBackCurrent = 0 ;
    static propTypes = {
        ...RCTMediaPlayerView.propTypes,
        controls: PropTypes.bool,
        poster: PropTypes.string ,
        screenUpdate: PropTypes.func ,
        videoTitle:PropTypes.string
    }

    static defaultProps = {
        autoplay: false,
        controls: true,
        preload: 'none',
        loop: false,
        canSeekUnwatch:true,
        isTrainning:false,
    }

    constructor(props) {
        super(props);
        this.state = {
            buffering: false,
            playing: false,
            current: 0,
            total: 0,

            width: 0,
            height: 0,
            showPoster: false ,
            controlsAnim: new Animated.Value(1) ,
            selectVideoSource:0,
            showAllSourceView:false
        };
    }
    componentDidMount(){
        this.controlAnimation();
    }
    componentWillMount() {
        if (Platform.OS === 'android') {
            BackAndroid.addEventListener('hardwareBackPress', this.onBackAndroid);
        }
    }
    componentWillUnmount() {
        this.stop();
        this.timer && clearTimeout(this.timer);
        if (Platform.OS === 'android') {
            BackAndroid.removeEventListener('hardwareBackPress', this.onBackAndroid);
        }

    }
    onBackAndroid = () => {

        if (this.getScreenStatus() === 0) {
            this.backFullScreen();
            return true;
        }
        else{
            Actions.pop();
            return true;
        }
        return false;

    };




    controlAnimation(){
        console.log("controlAnimation:"+this.props.controls);
        if(this.props.controls){
            this.timer&&clearTimeout(this.timer) ;
            this.timer = setTimeout(()=>{
                this.doControlAnimation();
            } , 3000 ) ;
        }
    }
    getScreenStatus(){
        return this.screenStatus ;
    }
    doControlAnimation(){

        let toValue = 0 ;
        if(!this.showControl){
            toValue = 1 ;
        }
        if(this.showControl&&this.state.showAllSourceView){
            this.setState({showAllSourceView:false});
        }
        Animated.timing(this.state.controlsAnim , {toValue:toValue , duration:500}).start(()=>{
            this.showControl = !this.showControl;
            if(this.showControl){
                this.controlAnimation();
            }
        }) ;
    }

    changeVideoSource(index){//选择了视频分辨率

        if(this.props.srcs.length > index ){
            this.seekToFlag = true ;
            this.currentPlay = this.state.current ;
            this.setState({
                selectVideoSource:index,
                showAllSourceView:false
            });
        }

    }
    render() {


        console.log("MediaPlayView render!")
        let width = this.state.width ;
        let height = this.state.height ;
        let posterView;
        if(width && height && this.state.showPoster) {
            posterView = (
                <View style={{flex:1,backgroundColor:'black',alignItems:"center",justifyContent:'center',position:'absolute',left:0,top:0,right:0,bottom:0}}>
                    <TouchableOpacity style={{flexDirection:'row',alignItems:'center',justifyContent:"center"}}
                                      onPress={this.play.bind(this)}>
                        <Image
                            source={require('./img/replay.png')}
                            style={{width:24,height:24}}/>
                        <Text style={{color:'white'}}> 重新播放</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        let bufferIndicator;
        if(this.state.buffering) {
            bufferIndicator = (
                <ActivityIndicator
                    style={{position:'absolute',left:width/2-18,top:height/2-18}}
                    color={'gray'}
                    size={'large'}/>
            );
        }
        let showAllSourceView ; //显示选择分辨率
        if(this.state.showAllSourceView){
            let right = 40 ;
            let bottom = 5 ;
            showAllSourceView = (
                <View style={{position:"absolute",bottom:bottom,right:right,width:40,height:120}}>
                    {
                        sourceKinds.map((key , index )=>{
                            return (
                                <TouchableOpacity
                                    onPress={()=>{
                                        this.controlAnimation();
                                        this.changeVideoSource(index);}}
                                    style={{width:40,height:30,alignItems:"center",justifyContent:"center",backgroundColor:"#00000088",borderWidth:0.5,borderColor:"#ffffff88"}}>
                                    <Text style={{textAlign:"center",fontSize:12,color:"white"}}>{key}</Text>
                                </TouchableOpacity>
                            );
                        })
                    }
                </View>
            );
        }
        let src = this.props.src ;
        let showSourceList = false ;
        if(!src){

            src = this.props.srcs[this.state.selectVideoSource];
            if(this.props.srcs.length>1)
                showSourceList = true ;
            if( src && typeof src != "string"){
                src = src.url ;
            }
        }
        //有src属性，不显示选择分辨率

        let controlsView;
        if (this.props.controls) {
            console.log("195 controlsView:"+this.props.controls);

            controlsView = (
                <Animated.View style={{
                    opacity:this.state.controlsAnim,position: 'absolute', left: 0, right: 0, bottom: 0
                }}>
                    <Controls
                        showAllSourceView={()=>{
                            this.setState({showAllSourceView:true});
                            this.controlAnimation();
                        }}
                        showSource={showSourceList&&!this.showAllSourceView}
                        sourceName={sourceKinds[this.state.selectVideoSource]}
                        playing={this.state.playing}
                        current={this.state.current}
                        total={this.state.total}
                        onSeekTo={this.seekTo.bind(this)}
                        onPauseOrPlay={() => {
                            console.log("play:"+this.showControl+"  playing:"+this.state.playing);
                            if(!this.showControl){
                                return ;
                            }
                            if(this.state.playing) {
                                this.pause();
                            } else {
                                this.play();
                            }
                        }}
                        screenOrientation={this.screenStatus}
                        bufferRanges={this.state.bufferRanges}
                        fullScreen={this.fullScreen.bind(this)}
                        rotation={this.screenStatus === 0}
                        isTrainning={this.props.isTrainning}
                    />
                </Animated.View>
            );
        }
        let videoTitle = this.props.videoTitle ;
        if(videoTitle && videoTitle.length > 20)
            videoTitle = videoTitle.substr(0,19) + "..." ;
        let fullScreenToolbar ;
        if(this.screenStatus == 0){

            fullScreenToolbar = (
                <Animated.View
                    style={{opacity:this.state.controlsAnim,height:40,backgroundColor:'#11111188'
                        ,justifyContent:'center',flexDirection:'row',position:'absolute'
                        ,left:0,right:0,top:0,alignItems:'center'}}>
                    <TouchableOpacity
                        style={{position:'absolute' , left:10 ,top:10}}
                        onPress={()=>this._onFullScreenBack()}>
                        <Image
                            style={{width:24,height:24,padding:8}}
                            source={require("./img/back.png")}
                        />
                    </TouchableOpacity>
                    <Text
                        style={{color:'white'}}
                        numberOfLines={1}>
                        {this.props.videoTitle}
                    </Text>
                </Animated.View>
            );
        }



        return (
            <View
                style={this.props.style}
                onLayout={this._onLayout.bind(this)}>

                <TouchableWithoutFeedback

                    onPress={()=>{
                        console.log(" 266 click  playing:"+this.state.playing)
                        this.doControlAnimation();
                        if(this.state.playing){
                            {/*this.doControlAnimation();*/}
                        }
                    }}>
                    <RCTMediaPlayerView
                        {...this.props}
                        src={src}
                        style={{flex: 1, alignSelf: 'stretch'}}
                        ref={RCT_MEDIA_PLAYER_VIEW_REF}
                        onPlayerPlaying={this._onPlayerPlaying.bind(this)}
                        onPlayerProgress={this._onPlayerProgress.bind(this)}
                        onPlayerPaused={this._onPlayerPaused.bind(this)}
                        onPlayerBuffering={this._onPlayerBuffering.bind(this)}
                        onPlayerBufferOK={this._onPlayerBufferOK.bind(this)}
                        onPlayerFinished={this._onPlayerFinished.bind(this)}
                        onPlayerBufferChange={this._onPlayerBufferChange.bind(this)}
                    />
                </TouchableWithoutFeedback>
                {posterView}
                {fullScreenToolbar}
                {bufferIndicator}
                {controlsView}
                {showAllSourceView}
            </View>
        );
    }
    keyBack(){
        let args = [1] ;

        UIManager.dispatchViewManagerCommand(
            this._getMediaPlayerViewHandle(),
            UIManager.RCTMediaPlayerView.Commands.fullScreen,
            args
        );
    }
    _onLayout(e) {
        let {width, height} = e.nativeEvent.layout;
        this.setState({width, height});
        this.props.onLayout && this.props.onLayout(e);
    }

    pause() {
        this.timer&&clearTimeout(this.timer);
        UIManager.dispatchViewManagerCommand(
            this._getMediaPlayerViewHandle(),
            UIManager.RCTMediaPlayerView.Commands.pause,
            null
        );
    }

    backFullScreen(){
        this.screenStatus = ( this.screenStatus + 1 )% 2;
        this.props.screenRotation&&this.props.screenRotation(this.screenStatus===0);
        let args = [this.screenStatus] ;

        UIManager.dispatchViewManagerCommand(
            this._getMediaPlayerViewHandle(),
            UIManager.RCTMediaPlayerView.Commands.fullScreen,
            args
        );
        this.timer = setTimeout(()=>this.props.screenUpdate&&this.props.screenUpdate() , 500 ) ;
    }
    fullScreen(){
        console.log("fullScreen show control= " + this.showControl ) ;


        if(!this.showControl)
            return ;

        this.screenStatus = ( this.screenStatus + 1 )% 2;
        this.props.screenRotation&&this.props.screenRotation(this.screenStatus===0);
        let args = [this.screenStatus] ;

        UIManager.dispatchViewManagerCommand(
            this._getMediaPlayerViewHandle(),
            UIManager.RCTMediaPlayerView.Commands.fullScreen,
            args
        );
        this.timer = setTimeout(()=>this.props.screenUpdate&&this.props.screenUpdate() , 500 ) ;
    }
    play() {
        this.setState({showPoster: false})
        this.controlAnimation();

        UIManager.dispatchViewManagerCommand(
            this._getMediaPlayerViewHandle(),
            UIManager.RCTMediaPlayerView.Commands.play,
            null
        );
    }

    stop() {
        this.timer&&clearTimeout(this.timer) ;
        UIManager.dispatchViewManagerCommand(
            this._getMediaPlayerViewHandle(),
            UIManager.RCTMediaPlayerView.Commands.stop,
            null
        );
    }

    seekTo(timeMs) {
        if(!this.showControl&&!this.state.isplaying)
            return ;
        if(!this.props.canSeekUnwatch){
            let maxSeek = Math.max(this.state.current , this.seekBackCurrent) ;
            console.log("seek = " , maxSeek , this.state.current , this.seekBackCurrent);
            if(this.state.current < this.seekBackCurrent ){
                if(timeMs > maxSeek)
                    timeMs = maxSeek ;
            }
            if(timeMs > maxSeek){
                return ;
            }
            else if(this.seekBackCurrent < this.state.current){
                this.seekBackCurrent = this.state.current ;
            }
        }
        this.controlAnimation();
        this.setState({showPoster: false})
        let args = [timeMs];
        UIManager.dispatchViewManagerCommand(
            this._getMediaPlayerViewHandle(),
            UIManager.RCTMediaPlayerView.Commands.seekTo,
            args
        );
    }

    _getMediaPlayerViewHandle() {
        return ReactNative.findNodeHandle(this.refs[RCT_MEDIA_PLAYER_VIEW_REF]);
    }

    _onPlayerBuffering() {
        this.props.onPlayerBuffering && this.props.onPlayerBuffering();
        console.log("_onPlayerBuffering controls:"+this.props.controls);

        if (this.props.controls) {
            this.setState({
                buffering: true
            });
        }
    }

    _onPlayerBufferChange(e) {
        this.props.onPlayerBuffering && this.props.onPlayerBuffering(e);
        console.log("_onPlayerBufferChange controls:"+this.props.controls);
        if (this.props.controls) {
            this.setState({
                bufferRanges: e.nativeEvent.ranges
            });
        }
    }

    _onPlayerBufferOK() {
        this.props.onPlayerBufferOK && this.props.onPlayerBufferOK();
        console.log("_onPlayerBufferOK controls:"+this.props.controls);
        if (this.props.controls) {
            this.setState({
                buffering: false
            });
        }
        if(this.seekToFlag){
            this.seekToFlag = false ;
            this.seekTo(this.currentPlay);
        }
    }


    _onPlayerPlaying() {
        this.props.onPlayerPlaying && this.props.onPlayerPlaying();
        console.log(" _onPlayerPlaying state playing:"+this.state.playing)
        if (this.props.controls) {
            this.setState({
                buffering: false,
                playing: true
            });
        }
    }

    _onPlayerPaused() {
        this.props.onPlayerPaused && this.props.onPlayerPaused();
        console.log(" _onPlayerPaused state playing:"+this.state.playing)
        if (this.props.controls) {
            this.setState({
                playing: false
            });
        }
    }

    _onPlayerFinished() {
        this.timer&&clearTimeout(this.timer);
        Animated.timing(this.state.controlsAnim , {toValue:1 , duration:100}).start();
        this.showControl = true ;

        this.props.onPlayerFinished && this.props.onPlayerFinished();
        console.log(" _onPlayerFinished state playing:"+this.state.playing)
        if (this.props.controls) {
            this.setState({
                playing: false,
                buffering: false ,
                current:0 ,
                showPoster:true
            });
        }
    }

    _onFullScreenBack(){
        if(this.props.isTrainning){
            this.fullScreen();
            Actions.pop();
        }
        else{
            this.fullScreen()
        }
    }

    _onPlayerProgress(event) {

        let current = event.nativeEvent.current; //in ms
        let total = event.nativeEvent.total; //in ms

        this.props.onPlayerProgress && this.props.onPlayerProgress(current, total);

        if (this.props.controls) {
            this.setState({
                current: current,
                total: total
            });
        }
    }
}