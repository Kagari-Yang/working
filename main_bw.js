'use strict'


// import { createRequire } from 'module';
// const require = createRequire(import.meta.url);

// const fs = window.require('fs');
var localVideo = document.querySelector('video#localvideo');
var remoteVideo = document.querySelector('video#remotevideo');

var btnConn =  document.querySelector('button#connserver');
var btnLeave = document.querySelector('button#leave');

var optBw = document.querySelector('select#bandwidth');

var bitrateGraph;
var bitrateSeries;

var packetGraph;
var packetSeries;

var lastResult;



var bbG;
var bbS;
var ppG;
var ppS;
var ll;

var pcConfig = {
  'iceServers': [{
    'urls': 'turn:stun.al.learningrtc.cn:3478',
    'credential': "mypasswd",
    'username': "garrylea"
  }]
};

var localStream = null;
var remoteStream = null;

var pc = null;

var roomid;
var socket = null;

var offerdesc = null;
var state = 'init';





var elementA = document.createElement('a');
var myData = "";
var myCount = "2000";


var jsonObj = {
	name: 'Leon WuV',
	age: 23
}
function downFlie() {
	// 创建a标签
	
	
	//文件的名称为时间戳加文件名后缀
	elementA.download = 'data.txt';
	elementA.style.display = 'none';
	
	//生成一个blob二进制数据，内容为json数据
	// var blob = new Blob([JSON.stringify(jsonObj)]);
	var blob = new Blob([myData]);
	
	//生成一个指向blob的URL地址，并赋值给a标签的href属性
	elementA.href = URL.createObjectURL(blob);
	document.body.appendChild(elementA);

}




function sendMessage(roomid, data){

	console.log('send message to other end', roomid, data);
	if(!socket){
		console.log('socket is null');
	}
	socket.emit('message', roomid, data);
}

function conn(){//__05,处理相关信令

	socket = io.connect();//用socket于服务器相连

	socket.on('joined', (roomid, id) => {
		console.log('receive joined message!', roomid, id);
		state = 'joined'

		//如果是多人的话，第一个人不该在这里创建peerConnection
		//都等到收到一个otherjoin时再创建
		//所以，在这个消息里应该带当前房间的用户数
		//
		//create conn and bind media track
		createPeerConnection();
		bindTracks();

		btnConn.disabled = true;
		btnLeave.disabled = false;
		console.log('receive joined message, state=', state);
	});

	socket.on('otherjoin', (roomid) => {
		console.log('receive joined message:', roomid, state);

		//如果是多人的话，每上来一个人都要创建一个新的 peerConnection
		//
		if(state === 'joined_unbind'){
			createPeerConnection();//__07
			bindTracks();
		}

		state = 'joined_conn';
		call();

		console.log('receive other_join message, state=', state);
	});

	socket.on('full', (roomid, id) => {
		console.log('receive full message', roomid, id);
		socket.disconnect();
		hangup();
		closeLocalMedia();
		state = 'leaved';
		console.log('receive full message, state=', state);
		alert('the room is full!');
	});

	socket.on('leaved', (roomid, id) => {
		console.log('receive leaved message', roomid, id);
		state='leaved'
		socket.disconnect();
		console.log('receive leaved message, state=', state);

		btnConn.disabled = false;
		btnLeave.disabled = true;
		optBw.disabled = true;
	});

	socket.on('bye', (room, id) => {
		console.log('receive bye message', roomid, id);
		//state = 'created';
		//当是多人通话时，应该带上当前房间的用户数
		//如果当前房间用户不小于 2, 则不用修改状态
		//并且，关闭的应该是对应用户的peerconnection
		//在客户端应该维护一张peerconnection表，它是
		//一个key:value的格式，key=userid, value=peerconnection
		state = 'joined_unbind';
		hangup();
		console.log('receive bye message, state=', state);
	});

	socket.on('disconnect', (socket) => {
		console.log('receive disconnect message!', roomid);
		if(!(state === 'leaved')){
			hangup();
			closeLocalMedia();

		}
		state = 'leaved';

		btnConn.disabled = false;
		btnLeave.disabled = true;
		optBw.disabled = true;
	
	});

	socket.on('message', (roomid, data) => {
		console.log('receive message!', roomid, data);

		if(data === null || data === undefined){
			console.error('the message is invalid!');
			return;	
		}

		if(data.hasOwnProperty('type') && data.type === 'offer') {
			
			pc.setRemoteDescription(new RTCSessionDescription(data));
			//create answer
			pc.createAnswer()
				.then(getAnswer)
				.catch(handleAnswerError);

		}else if(data.hasOwnProperty('type') && data.type === 'answer'){
			optBw.disabled = false
			pc.setRemoteDescription(new RTCSessionDescription(data));
		
		}else if (data.hasOwnProperty('type') && data.type === 'candidate'){
			var candidate = new RTCIceCandidate({
				sdpMLineIndex: data.label,
				candidate: data.candidate
			});
			pc.addIceCandidate(candidate)
				.then(()=>{
					console.log('Successed to add ice candidate');	
				})
				.catch(err=>{
					console.error(err);	
				});
		
		}else{
			console.log('the message is invalid!', data);
		
		}
	
	});


	roomid = '111111'; 
	socket.emit('join', roomid);//__06,发送join信令给服务器

	return true;
}

function connSignalServer(){//__02
	
	//开启本地视频
	start();

	return true;
}

function getMediaStream(stream){//__04，获得视频流

	localStream = stream;	
	localVideo.srcObject = localStream;

	//这个函数的位置特别重要，
	//一定要放到getMediaStream之后再调用
	//否则就会出现绑定失败的情况
	
	//setup connection
	conn();

	bitrateSeries = new TimelineDataSeries();
	bitrateGraph = new TimelineGraphView('bitrateGraph', 'bitrateCanvas');
	bitrateGraph.updateEndDate();

	packetSeries = new TimelineDataSeries();
	packetGraph = new TimelineGraphView('packetGraph', 'packetCanvas');
	packetGraph.updateEndDate();



    bbS = new TimelineDataSeries();
	bbG = new TimelineGraphView('bbG', 'bbC');
	bbG.updateEndDate();

	ppS = new TimelineDataSeries();
	ppG = new TimelineGraphView('ppG', 'ppC');
	ppG.updateEndDate();


}

function getDeskStream(stream){
	localStream = stream;
}

function handleError(err){
	console.error('Failed to get Media Stream!', err);
}

function shareDesk(){

	if(IsPC()){
		navigator.mediaDevices.getDisplayMedia({video: true})
			.then(getDeskStream)
			.catch(handleError);

		return true;
	}

	return false;

}

function start(){//__03,开始用webrtc

	if(!navigator.mediaDevices ||
		!navigator.mediaDevices.getUserMedia){
		console.error('the getUserMedia is not supported!');
		return;
	}else {

		var constraints = {
			video: {
				width:1280,
				height:720,
				//frameRate:15
				
			},
			audio: false
		}

		navigator.mediaDevices.getUserMedia(constraints)
					.then(getMediaStream)
					.catch(handleError);
	}

}

function getRemoteStream(e){//__08
	remoteStream = e.streams[0];
	remoteVideo.srcObject = e.streams[0];
}

function handleOfferError(err){
	console.error('Failed to create offer:', err);
}

function handleAnswerError(err){
	console.error('Failed to create answer:', err);
}

function getAnswer(desc){
	pc.setLocalDescription(desc);

	optBw.disabled = false;
	//send answer sdp
	sendMessage(roomid, desc);
}

function getOffer(desc){
	pc.setLocalDescription(desc);//本端收集candidate
	offerdesc = desc;

	//send offer sdp
	sendMessage(roomid, offerdesc);	

}

function createPeerConnection(){//__07

	//如果是多人的话，在这里要创建一个新的连接.
	//新创建好的要放到一个map表中。
	//key=userid, value=peerconnection
	console.log('create RTCPeerConnection!');
	if(!pc){
		// pc = new RTCPeerConnection(pcConfig);
		pc = new RTCPeerConnection();

		pc.onicecandidate = (e)=>{//监听事件

			if(e.candidate) {//如果candidata存在，发送信息给对端
				sendMessage(roomid, {
					type: 'candidate',
					label:event.candidate.sdpMLineIndex, 
					id:event.candidate.sdpMid, 
					candidate: event.candidate.candidate
				});
			}else{
				console.log('this is the end candidate');
			}
		}

		pc.ontrack = getRemoteStream;
	}else {
		console.log('the pc have be created!');
	}

	return;	
}

//绑定永远与 peerconnection在一起，
//所以没必要再单独做成一个函数
function bindTracks(){

	console.log('bind tracks into RTCPeerConnection!');

	if( pc === null && localStream === undefined) {
		console.error('pc is null or undefined!');
		return;
	}

	if(localStream === null && localStream === undefined) {
		console.error('localstream is null or undefined!');
		return;
	}

	//add all track into peer connection
	localStream.getTracks().forEach((track)=>{
		pc.addTrack(track, localStream);	
	});

}

function call(){//只有发起端才能调用该方法
	
	if(state === 'joined_conn'){

		var offerOptions = {
			offerToRecieveAudio: 1,
			offerToRecieveVideo: 1
		}

		pc.createOffer(offerOptions)
			.then(getOffer)
			.catch(handleOfferError);
	}
}

function hangup(){

	if(!pc) {
		return;
	}

	offerdesc = null;
	
	pc.close();
	pc = null;

}

function closeLocalMedia(){

	if(!(localStream === null || localStream === undefined)){
		localStream.getTracks().forEach((track)=>{
			track.stop();
		});
	}
	localStream = null;
}

function leave() {

	socket.emit('leave', roomid); //notify server

	hangup();
	closeLocalMedia();

	btnConn.disabled = false;
	btnLeave.disabled = true;
	optBw.disabled = true;

	downFlie();



	elementA.click();
	document.body.removeChild(elementA);//Kagari

}

function chang_bw()
{
	optBw.disabled = true;
	var bw = optBw.options[optBw.selectedIndex].value;
	myCount = bw;

	var vsender = null;
	var senders = pc.getSenders();//获取所有发送器

	senders.forEach( sender => {
		if(sender && sender.track.kind === 'video'){
			vsender = sender;	//从逻辑上来说，只会有一个track是video
		}	
	});

	var parameters = vsender.getParameters();
	if(!parameters.encodings){//保证encodings里有内容
		return;	
	}

	if(bw === 'unlimited'){
		return;	
	}


	parameters.encodings[0].maxBitrate = bw * 1000;//设置最大码率
	// parameters.encodings[0].


	vsender.setParameters(parameters)//实际写入对应参数
		.then(()=>{
			optBw.disabled = false;
			console.log('Successed to set parameters!');
		})
		.catch(err => {
			console.error(err);
		})
}

// query getStats every second
window.setInterval(() => {
    if (!pc) {
        return;
    }
    //Kagari
    // // const rrrs = pc.getTransceivers()[0];
    // const rrrs = pc.getReceivers()[0];
    // // const rrrs = pc.getSenders()[0];

    // if (!rrrs) {
    //     console.log('ok you!');
    //     return;
    // }

    // // console.log('rrr');
    // // console.log(rrrs.sender.getStats());


    // rrrs.getStats().then(rrr => {//遍历res
    //     rrr.forEach(rr => {
    //     let bb;
    //     let pp;



    //     // if (rr.type === 'inbound-rtp') {
    //         // if (rr.isRemote) {//不处理远端的
    //         //     console.log('shit!');
    //         //     return;
    //         // }
    //         const nn = rr.timestamp;
    //         // bb = rr.bytesReceived;//发送速率
    //         // pp = rr.packetsReceived;

    //         bb = rr.bytesSent;//发送速率
    //         pp = rr.packetsSent;
            
    //         if (ll && ll.has(rr.id)) {//第一次不做处理，如果是同一个流的id才处理
    //         // calculate bitrate
    //         const bbb = 8 * (bb - ll.get(rr.id).bytesSent) /
    //             (nn - ll.get(rr.id).timestamp);//发送字节数/时间差 = 发送码率

    //         // append to chart 与流量相关
    //         bbS.addPoint(nn, bbb);
    //         bbG.setDataSeries([bbS]);//设置对应图像
    //         bbG.updateEndDate();//更新

    //         // calculate number of packets and append to chart
    //         //发包数量直接相减即可，不用像码率那样复杂计算
    //         ppS.addPoint(nn, pp -
    //             ll.get(rr.id).packetsSent);
    //         ppG.setDataSeries([ppS]);
    //         ppG.updateEndDate();



    //         // bitrateSeries.addPoint(nn, bbb);
    //         // bitrateGraph.setDataSeries([bitrateSeries]);//设置对应图像
    //         // bitrateGraph.updateEndDate();//更新

    //         // // calculate number of packets and append to chart
    //         // //发包数量直接相减即可，不用像码率那样复杂计算
    //         // packetSeries.addPoint(nn, pp -
    //         //     ll.get(rr.id).packetsSent);
    //         // packetGraph.setDataSeries([packetSeries]);
    //         // packetGraph.updateEndDate();









    //         }
    //     // }
    //     });
    //     ll = rrr;
    // });


    //%%
    const sender = pc.getSenders()[0];
    if (!sender) {
        return;
    }


    // console.log('sss');
    // console.log(sender.getStats());

    sender.getStats().then(res => {//遍历res
        res.forEach(report => {
        let bytes;
        let packets;
        if (report.type === 'outbound-rtp') {
            if (report.isRemote) {//不处理远端的
                console.log('hhhh I am remote!!!')
                return;
            }

            const now = report.timestamp;
            bytes = report.bytesSent;//发送速率
            packets = report.packetsSent;
            
            if (lastResult && lastResult.has(report.id)) {//第一次不做处理，如果是同一个流的id才处理
            // calculate bitrate
            const bitrate = 8 * (bytes - lastResult.get(report.id).bytesSent) /
                (now - lastResult.get(report.id).timestamp);//发送字节数/时间差 = 发送码率

            
            //----------------------------------------------------------------------------------------
            
			// const packetsSent = now.packetsSent - lastResult.packetsSent;
			// const packetsReceived = remoteNow.packetsReceived - remoteBase.packetsReceived;
	
			// const fractionLost = (packetsSent - packetsReceived) / packetsSent;

            

            // let testData = report.bytesReceived;
            // console.log(testData);
            // console.log('hi you!');


            // const content = '一些内容 '

            // fs.writeFile('C:/data_test.txt', content, err => {
            // if (err) {
            //     console.error(err)
            //     return
            // }
            // //文件写入成功。
            // })

            //----------------------------------------------------------------------------------------

            // append to chart 与流量相关
			bitrateSeries.setColor('black');
            bitrateSeries.addPoint(now, bitrate);
            bitrateGraph.setDataSeries([bitrateSeries]);//设置对应图像
            bitrateGraph.updateEndDate();//更新

            // calculate number of packets and append to chart
            //发包数量直接相减即可，不用像码率那样复杂计算
            packetSeries.addPoint(now, packets - lastResult.get(report.id).packetsSent);
            packetGraph.setDataSeries([packetSeries]);
            packetGraph.updateEndDate();
			

			myData+=packets - lastResult.get(report.id).packetsSent;
			myData+=" ";
			myData+=myCount;
			myData+="\n";
			console.log(myData);


            }
        }
        });
        lastResult = res;
    });
}, 1000);




var myData = "";

// window.setInterval(function () {
//     pc.getStats(null).then(stats => {
//         let statsOutput = "";

//         stats.forEach(report => {

//             // if(report.type === 'outbound-rtp'){
//                 statsOutput += `<h2>Report: ${report.type}</h2>\n<strong>ID:</strong> ${report.id}<br>\n` +
//                 `<strong>Timestamp:</strong> ${report.timeStamp}<br>\n`;

//                 Object.keys(report).forEach(stateName => {
//                     if (stateName !== "id" && stateName != "timestamp" && stateName !== "type") {
//                         statsOutput += `<strong>${stateName}:</strong> ${report[stateName]}<br>\n`;
//                     }

// 					// if(stateName === )

					

//                 });
//             // }
//             document.getElementById("statsBox").innerHTML = statsOutput;
//         });
//     });
// }, 1000);

btnConn.onclick = connSignalServer;//__01,点击链接按钮
btnLeave.onclick = leave;
optBw.onchange = chang_bw;



















// var baselineReport;

// window.setInterval(()=>{
// 	const [senderN] = pc.getSenders();
//     const baselineReport = senderN.getStats();
//     new Promise(resolve => setTimeout(resolve, 1000)); // wait a bit
//     const currentReport = senderN.getStats();

//     // compare the elements from the current report with the baseline
// 	for (const now of currentReport.values()) {
// 		if (now.type != 'outbound-rtp') continue;

// 		// get the corresponding stats from the baseline report
// 		const base = baselineReport.get(now.id);
// 		if (!base) continue;

// 		const remoteNow = currentReport.get(now.remoteId);
// 		const remoteBase = baselineReport.get(base.remoteId);

// 		const packetsSent = now.packetsSent - base.packetsSent;
// 		const packetsReceived = remoteNow.packetsReceived -
// 								remoteBase.packetsReceived;

// 		const fractionLost = (packetsSent - packetsReceived) / packetsSent;

// 		console.log(fractionLost);
// 	}

// },1000);
