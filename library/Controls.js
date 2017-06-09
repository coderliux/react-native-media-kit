import React, {PropTypes} from 'react';

import ReactNative, {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    NativeModules,
    requireNativeComponent,
    Dimensions,
    ScrollView,
    Image,
    Platform,
    Animated,
    TouchableWithoutFeedback,
} from 'react-native';

import Slider from 'react-native-slider';
import Icon from 'react-native-vector-icons/SimpleLineIcons'

const {width, height} = Dimensions.get('window');
/**
 * format as --:-- or --:--:--
 * @param timeSec
 * @param containHours
 * @returns {string}
 */
function formatProgress(timeSec, containHours) {
    function zeroPad(s) {
        if (s.length === 1) {
            return '0' + s;
        }
        return s;
    }

    let hours = Math.floor(timeSec / 60.0 / 60.0).toFixed(0);
    let minutes = Math.floor(timeSec / 60.0 % 60.0).toFixed(0);
    let seconds = Math.floor(timeSec % 60.0).toFixed(0);

    if(hours < 0) {
        hours = 0;
    }
    if (minutes < 0) {
        minutes = 0;
    }
    if(seconds < 0) {
        seconds = 0;
    }

    hours = zeroPad(hours);
    minutes = zeroPad(minutes);
    seconds = zeroPad(seconds);

    if (containHours) {
        return hours + ':' + minutes + ':' + seconds;
    }
    return minutes + ':' + seconds;
}
export default class Controls extends React.Component {

    defaultProps = {
        current: 0,
        total: 0,
        buffering: false,
        playing: false,
        screenOrientation: 1,
        rotation:false,
    }

    constructor(props) {
        super(props);
        this.state = {
            sliding: false,
            current: this.props.current,
            selectSource:0,
            showAllSourceView:false
        };
    }

    componentWillReceiveProps(nextProps) {
        if (!this.state.sliding) {
            if (this.props.current != nextProps.current) {
                this.setState({
                    current: nextProps.current,
                });
            }
        }
    }
    componentWillUnmount(){
        this.timer&&clearTimeout(this.timer);
    }
    render() {
        const containHours = this.props.total >= 60 * 60 * 1000;
        const currentFormated = formatProgress(this.state.current / 1000, containHours);
        const totalFormated = formatProgress(this.props.total / 1000, containHours);

        let bufferIndicator;
        if(this.props.buffering) {
            bufferIndicator = (
                <ActivityIndicator
                    color={'#f2f2f2'}
                    size={'large'}/>
            );
        }

        let tracks = [];
        if(this.props.bufferRanges) {
            tracks = this.props.bufferRanges.map((range) => {
                let startValue = range.start;
                let endValue = startValue + range.duration;
                return {
                    key: 'bufferTrack:' + startValue + '-' + endValue,
                    startValue,
                    endValue,
                    style: {backgroundColor: '#eeeeee66'}
                }
            });
        }
        tracks.push(
            {
                key: 'thumbTrack',
                style: {backgroundColor: 'white'}
            }
        );
        let selectSourceView ;

        if(this.props.showSource){
            selectSourceView = (
                <TouchableOpacity
                    onPress={this.props.showAllSourceView}
                    style={{width:40,height:40,alignItems:"center",justifyContent:"center"}}>
                    <Text style={{textAlign:"center",fontSize:12,color:"white"}}>{this.props.sourceName}</Text>
                </TouchableOpacity>
            ) ;
        }

        console.log("137 render controller playing:" +this.props.playing)
        console.log("138 render controller rotation:" +this.props.rotation)

        return (
            <View style={controlStyle.controlBar}>
                <TouchableOpacity onPress={this.props.onPauseOrPlay} style={controlStyle.playButtonContainer}>
                    <Icon color='white' name={this.props.playing ?'control-pause':'control-play'} size={20} />
                </TouchableOpacity>

                <Text style={controlStyle.timeText}>{currentFormated}</Text>
                <Slider
                    style={[controlStyle.processBarContainer,(this.props.rotation?{width:height-200}:{width:width-200})]}
                    thumbImage={require('./img/media-player-thumb.png')}
                    trackStyle={controlStyle.processBarTrack}
                    thumbStyle={controlStyle.processBarThumb}

                    onSlidingComplete={(value) => {
                        console.log("slider value = " + value);
                        this.setState({
                            sliding: false,
                            current: value
                        });
                        this.props.onSeekTo && this.props.onSeekTo(value);
                    }}
                    onValueChange={(value) => {
                        this.setState({
                            sliding: true,
                            current: value
                        });
                    }}
                    maximumValue={this.props.total}
                    minimumValue={0}
                    value={this.state.current}
                    tracks={tracks}
                    minimumTrackTintColor='green'
                    maximumTrackTintColor='gray'
                />
                <Text style={controlStyle.timeText}>{totalFormated}</Text>
                {(!this.props.isTrainning)&&<TouchableOpacity style={controlStyle.fullscreenButtonContainer} onPress={this.props.fullScreen}>
                    <Icon color='white' name={this.props.screenOrientation == 0 ?'size-actual':'size-fullscreen'} size={20} />
                </TouchableOpacity>}
            </View>

        );
    }
}

const controlStyle = StyleSheet.create({
    controlBar: {
        left: 0,
        right: 0,
        bottom: 0,
        height: 40,
        backgroundColor: '#00000088',
        flexDirection: 'row'
    },
    playButtonContainer: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center'
    },
    timeText:{
        alignSelf: 'center',
        fontSize: 12,
        color: 'white',
        width: 56,
        textAlign: 'center'
    },
    controlIcon:{
        width:20,
        height:20
    },
    fullscreenButtonContainer:{
        width: 30,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center'
    },
    processBarContainer: {
        alignSelf: 'center',
        marginLeft:10,
        marginRight:10,
        width: width -200,
    },
    processBarTrack:{
        height: 2,
        borderRadius: 1,
    },
    processBarThumb: {
        width: 16,
        height: 16,
        borderRadius: 16 / 2,
        backgroundColor: 'white',
        shadowColor: 'black',
        shadowOffset: {width: 0, height: 2},
        shadowRadius: 2,
        shadowOpacity: 0.35,
        top:20
    }
})