
window.onerror = function backupErr(errorMsg, url=false, lineNumber=false) {
    console.error(errorMsg);
    console.error(lineNumber);
    console.error("Unhandled Error occured"); //or any message
    return false;
};

function getById(id) { // js helper
    var el = document.getElementById(id);
    if (!el) {
        el = document.createElement("span"); // create a fake element
    }
    return el;
}

(function (w) {
    w.URLSearchParams = w.URLSearchParams || function (searchString) {
        var self = this;
        self.searchString = searchString;
        self.get = function (name) {
            var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(self.searchString);
            if (results == null) {
                return null;
            } else {
                return decodeURI(results[1]) || 0;
            }
        };
    };

})(window);

function removeStorage(cname){
    localStorage.removeItem(cname);
}

function clearStorage(){
    localStorage.clear();
    if (!session.cleanOutput){
        warnUser("The local storage and saved settings have been cleared", 1000);
    }
}

function setStorage(cname, cvalue, minutes=1){ // not actually a cookie
    var now = new Date();
    var item = {
        value: cvalue,
        expiry: now.getTime() + (minutes * 60 * 1000),
    };
    try{
        localStorage.setItem(cname, JSON.stringify(item));
    }catch(e){errorlog(e);}
}

function getStorage(cname) {
    try {
        var itemStr = localStorage.getItem(cname);
    } catch(e){
        errorlog(e);
        return;
    }
    if (!itemStr) {
        return "";
    }
    var item = JSON.parse(itemStr);
    var now = new Date();
    if (now.getTime() > item.expiry) {
        localStorage.removeItem(cname);
        return "";
    }
    return item.value;
}

var urlParams = new URLSearchParams(window.location.search);
var channel = null;
var iframe = null;
var queue = [];
var selectedQueue = [];
var datestamp = true;
var nextComment = null;
var roomID = "test";
var messageTimeout = 0;
var filtering = "";
var filterAddNameAndTime = false;
var applyCustomActions = false;
var showsource = true;
var compactmode = false;
var darkmode = null;
var scale = 1;
var forceAutoscroll = false;
var triggerState = true;
var emojis = true;
var pauseState = false;
var timeoutTimer = null;
var isOBSBrowserSource = false;
var customNodeLimit = false;
var body = document.body;
var html = document.documentElement;
var mainOutputWindow = document.getElementById("output");
var fileStream, writer; // streaming message writer
var newFileHandle = false; // single message writer
var singlewriter = false;
var odd = false;
var showbadges = true;
var colorized = false;
var horizontal = false;
var autoTimeoutEnabled = true;
var autoScrollCatch = 200;

var encode = false;

try {
    if (electronApi){ // fix for electron dragging.
        document.body.style.width = "95%";
        setTimeout(function(){
            document.body.style.width = "100%";
        },1000);

        setTimeout(function(){
            document.body.style.width = "98%";
        },2000);

        setTimeout(function(){
            document.body.style.width = "100%";
        },5000);
    }
} catch(e){
    //console.error(e);
}

var timeoutDelay = 0;
if (urlParams.has("showtime")){
    timeoutDelay = parseInt(urlParams.get("showtime")) || 20000;
}
var timePerCharacter = 60;
if (urlParams.has("chartime")){
    timePerCharacter = parseInt(urlParams.get("chartime")) || 60;
}

if (urlParams.has("disabletimeout")) {
    autoTimeoutEnabled = false;
}

var filterNamesNotMessages = false;
if (urlParams.has("namefilter")) {
    filterNamesNotMessages = true;
    getById("filterAddNameAndTimeButton").title = "🆔 Match only on name, source and time when filtering. Not message content."
}

var thisLabel = false;
if (urlParams.has("label")) {
    thisLabel = urlParams.get("label") || false;
}

var blockMessageSelecting = false;
if (urlParams.has("viewonly")) {
    blockMessageSelecting = true;
}

var blockMessageSelecting2 = false;
if (urlParams.has("chatmode")) {
    blockMessageSelecting2 = true;
}

var blockMessageSelecting3 = false;
if (urlParams.has("helpermode")) {
    blockMessageSelecting3 = true;
}

if (urlParams.has("opacity")) {
    getById("main").style.opacity = urlParams.get("opacity") || 0.3
}

var onlyquestions = false;
if (urlParams.has("onlyquestions")) {
    onlyquestions = true
}
var hidequestions = false;
if (urlParams.has("hidequestions")) {
    hidequestions = true
}

var stripEmojis = false;
if (urlParams.has("stripemoji")) {
    stripEmojis = true;
}

if (blockMessageSelecting){
    getById("say_hello").classList.add("hidden");
    getById("clear_overlay").classList.add("hidden");
    getById("autoshow").classList.add("hidden");
    getById("next_in_queue").classList.add("hidden");
    document.documentElement.style.setProperty("--cursor-type", "unset");
    document.querySelectorAll(".horizontalSeparator").forEach(ele=>{
        ele.classList.add("hidden");
    });
}
if (blockMessageSelecting2){
    //getById("say_hello").classList.add("hidden");
    getById("clear_overlay").classList.add("hidden");
    getById("autoshow").classList.add("hidden");
    getById("next_in_queue").classList.add("hidden");
    document.documentElement.style.setProperty("--cursor-type", "unset");
    document.querySelectorAll(".horizontalSeparator").forEach(ele=>{
        ele.classList.add("hidden");
    });
}
if (blockMessageSelecting3){
    getById("say_hello").classList.add("hidden");
    getById("clear_overlay").classList.add("hidden");
    getById("autoshow").classList.add("hidden");
    getById("next_in_queue").classList.add("hidden");
    document.documentElement.style.setProperty("--cursor-type", "unset");
    document.querySelectorAll(".horizontalSeparator").forEach(ele=>{
        ele.classList.add("hidden");
    });
}

var highlightMembers = true;
if (urlParams.has("nomemberhighlight")) {
    highlightMembers = false;
}

var highlightSpecial = true;

var highlightDonos = true;
if (urlParams.has("nodonohighlight")) {
    highlightDonos = false;

    document.documentElement.style.setProperty("--donation-bgcolor-odd", "unset");
    document.documentElement.style.setProperty("--donation-bgcolor", "unset");
    document.documentElement.style.setProperty("--donation-bgcolor-bubble-odd", "unset");
    document.documentElement.style.setProperty("--donation-bgcolor-bubble", "unset");

}

if (urlParams.has("pressedcolor")) {  // must be a hex code value, without the #.
    let pressedColor = urlParams.get("pressedcolor") || false;
    if (!pressedColor){
        document.documentElement.style.setProperty("--pressed-color", "unset", "");
    } else {
        document.documentElement.style.setProperty("--pressed-color", "#"+pressedColor, "");
    }
}


//window.obsstudio

var bubble = false;
if (urlParams.has("bubble")) {
    bubble = true;
}

if (urlParams.has("session")){
    roomID = urlParams.get("session");
} else if (urlParams.has("s")){
    roomID = urlParams.get("s");
} else if (urlParams.has("id")){
    roomID = urlParams.get("id");
} else if (window.location.protocol=="file:"){
    roomID = prompt("Enter your session ID here, or add it to the URL.");
    if (roomID){
        var href = window.location.href;
        var arr = href.split('?');
        var newurl;
        if (arr.length > 1 && arr[1] !== '') {
            newurl = href + '&session=' + roomID;
        } else {
            newurl = href + '?session=' + roomID;
        }
        window.history.pushState({path: newurl.toString()}, '', newurl.toString());
    } else {
        alert("You need to provide your extension's session ID for this page to work");
    }
} else {
    window.location.href = "https://github.com/steveseguin/live-chat-overlay#readme";
}

var password = "false";
if (urlParams.has("password")){
    password = urlParams.get("password") || "false";
}
var fixed=false;
if (urlParams.has("fixed")){
    fixed = true;
}

if (urlParams.has("nodate") || urlParams.has("notimestamp") || urlParams.has("notime")){
    datestamp = false;
}

if (urlParams.has("hidesource")){
    showsource = false;
}

if (urlParams.has("border")){
    if (urlParams.get("border")){
        document.documentElement.style.setProperty("--profile-pic-border", "3px solid "+urlParams.get("border"));
    } else {
        document.documentElement.style.setProperty("--profile-pic-border", "3px solid black");
    }
}

var twoLines = false;
var largeavatar = false;
if (urlParams.has("largeavatar")){
    largeavatar = true;
} else if (urlParams.has("twolines")){
    twoLines = true;
    document.documentElement.style.setProperty("--list-or-horizontal", "block");
    document.documentElement.style.setProperty("--time-arrived-padding", "8px");
}

var splitMode = "";
if (urlParams.has("split")){
    splitMode = " splitMode";
}

var scrolltype = "instant";
if (urlParams.has("smooth")){
    scrolltype = "smooth";
    autoScrollCatch = autoScrollCatch*2;
}


var alignbottom = false;
if (urlParams.has("alignbottom")){
    document.getElementById("output").classList.add("alignbottom");
    alignbottom = true;
}

var attachmentsonly = false;
if (urlParams.has("attachmentsonly")){
    attachmentsonly = true;
}

var stripHTML = false;
if (urlParams.has("strip") || urlParams.has("striphtml")){ // removes HTML from messages, donations, and names.
    stripHTML = true;
}

var audioContext = new AudioContext();
var timeoutTone = null;

async function playtone(tonename="testtone") {
    if (timeoutTone){return;}

    setTimeout(function(){
        timeoutTone = false;
    },500);

    if (audioContext.state == "suspended"){
        await audioContext.resume();
    }
    if (audioContext.state == "suspended"){
        return
    }
    var toneEle = document.getElementById(tonename);
    if (toneEle){
        toneEle.volume = 1.0;
        toneEle.play().then(()=>{console.log("BEEP");}).catch((e)=>{
            console.error(e);
        })
        timeoutTone = true;
    }
}

if (urlParams.has('css')){
    var cssURL = urlParams.get('css');
    cssURL = decodeURI(cssURL);

    var cssStylesheet = document.createElement('link');
    cssStylesheet.rel = 'stylesheet';
    cssStylesheet.type = 'text/css';
    cssStylesheet.media = 'screen';
    cssStylesheet.href = cssURL;
    document.getElementsByTagName('head')[0].appendChild(cssStylesheet);
}

if (urlParams.has("base64css") || urlParams.has("b64css") || urlParams.has("cssbase64") || urlParams.has("cssb64")) {
    try {
        var base64Css = urlParams.get("base64css") || urlParams.get("b64css") || urlParams.get("cssbase64") || urlParams.get("cssb64");
        var css = decodeURIComponent(atob(base64Css)); // window.btoa(encodeURIComponent("#mainmenu{background-color: pink; ❤" ));
        var cssStyleSheet = document.createElement("style");
        cssStyleSheet.innerText = css;
        document.querySelector("head").appendChild(cssStyleSheet);
    } catch(e){console.error(e);}
};

var transitionType = [];

if (urlParams.has("fadein")){
    transitionType.push("fadein");
}

var fadeout = false;
if (urlParams.has("fadeout")){
    fadeout = true;
}

if (urlParams.has("swiperight")){
    transitionType.push("swiperight");
}

if (urlParams.has("swipeleft")){
    transitionType.push("swipeleft");
}

if (urlParams.has("swipeup")){
    transitionType.push("swipeup");
}

var reversed = false;

if (urlParams.has("autoscroll")){
    forceAutoscroll=false;
    jumptoBottom();
}

if (urlParams.has("reverse")){
    reversed = true;
    forceAutoscroll=false;
    document.getElementById("output").style.flexDirection = "column-reverse";
    document.getElementById("output").style.display = "flex";
}

if (urlParams.has("dropdown")){
    reversed = true;
    forceAutoscroll=false
    document.getElementById("output").style.flexDirection = "column-reverse";
    document.getElementById("output").style.display = "flex";
    transitionType.push("swipeup");
}

var beep = false;
if (urlParams.has("beep")){ // removes HTML from messages, donations, and names.
    beep = true;
    let ele = document.getElementById("notify");
    ele.dataset.state = beep*1;
    ele.style['background-image']='url(./icons/main_msg_notify_on.png)';
    ele.title = 'Main — 🔕 Stop beeping when there is a new message';
    playtone();
}

var stylizeEmoji = false;
if (urlParams.has("emoji") || urlParams.has("emojis")){
    stylizeEmoji = urlParams.get("emoji") || urlParams.get("emojis") || "140%";
    document.documentElement.style.setProperty("--stylized-emoji", stylizeEmoji);
    document.documentElement.style.setProperty("--message-line-height", "30px");
    document.documentElement.style.setProperty("--stylized-img", "35px");
}

var flexOrNotToFlex = "flex";

if (urlParams.has("horizontal")){
    horizontal = true;
    flexOrNotToFlex = "inline-block";
    document.documentElement.style.setProperty("--list-or-horizontal", flexOrNotToFlex);
    document.getElementById("output").style.width = "10000%";
    document.getElementById("output").style.right = "0";
    if (twoLines){
        document.getElementById("output").style.maxHeight = "70px";
        document.getElementById("menu").style.top = "72px";
        document.getElementById("output").style.overflow = "visible";
    } else if (stylizeEmoji){
        document.getElementById("output").style.maxHeight = "40px";
        document.getElementById("menu").style.top = "42px";
        document.getElementById("output").style.overflow = "hidden";
    } else {
        document.getElementById("output").style.maxHeight = "30px";
        document.getElementById("menu").style.top = "42px";
        document.getElementById("output").style.overflow = "hidden";
    }

    document.getElementById("output").style.position = "absolute";
    document.getElementById("output").style.textAlign = "right";
    document.getElementById("output").style.whiteSpace = "nowrap";
    document.getElementById("output").classList.remove("notcompactmode");
    compactmode = true;
    customNodeLimit = 15;
}

var avatars = true;
if (urlParams.has("noavatar") || urlParams.has("noavatars")){
    avatars = false;
}

if (urlParams.has("limit")){
    customNodeLimit = parseInt(urlParams.get("limit")) || 100;
}

if (urlParams.has("hidebadges") || urlParams.has("nobadges")){
    showbadges = false;
}

if (urlParams.has("colorednames") || urlParams.has("color")){
    colorized = true;
}


custombot = false;
if (urlParams.has("myname") || urlParams.has("botlist")){
    custombot = urlParams.get("myname") || urlParams.get("botlist") || false;
    if (custombot){
        custombot = decodeURIComponent(custombot);
        custombot = custombot.toLowerCase().replace(/[^a-z0-9,_]+/gi, "");
        custombot = custombot.split(",");
    }
}

var doNotShowBot = false;
if (urlParams.has("hidebots")){
    doNotShowBot = true;
}

var doNotShowBotNames = false;
if (urlParams.has("hidebotnames")){
    doNotShowBotNames = true;
}



var autoshow = false;
var autoshowdonos = false;

if (urlParams.has("autoshow")){
    autoShow();
}

var autoShowQueue = [];

if (urlParams.has("autoshowdonos")){
    autoshowdonos = true;
}

var openChatAutomatically = false;
if (urlParams.has("openchat")){
    openChatAutomatically = true;
}


if (urlParams.has("scale")){
    scale = urlParams.get("scale") || 1.0;
    scale = parseFloat(scale);
    document.documentElement.style.setProperty("--scale-output", scale);
    document.documentElement.style.setProperty("--scale-output-moz", "scale("+scale+")");
    autoScrollCatch *= scale;
}

var conCon = 1;
var socketserver = false;
var serverURL = "wss://api.overlay.ninja/api";

function setupSocket(){
    socketserver.onclose = function (){
        setTimeout(function(){
            conCon+=1;
            socketserver = new WebSocket(serverURL);
            setupSocket();
        },100*conCon);
    };
    socketserver.onopen = function (){
        conCon = 1;
        socketserver.send(JSON.stringify({"join":roomID, "out":2, "in":1}));
    };
    socketserver.addEventListener('message', function (event) {
        var resp = false
        if (event.data){
            var data = JSON.parse(event.data);
            processInput(data);
            if (data.get){
                var ret = {};
                ret.callback = {};
                ret.callback.get = data.get
                ret.callback.result = true;
                socketserver.send(JSON.stringify(ret));
            }
        }
    });
}

if (urlParams.has("server")){
    serverURL = urlParams.get("server") || serverURL;
    socketserver = new WebSocket(serverURL);
    setupSocket();
}


//

var conConExtension = 1;
var socketserverExtension = false;
var serverURLExtension = "wss://api.overlay.ninja/extension";

function setupSocketExtension(){
    socketserverExtension.onclose = function (){
        setTimeout(function(){
            conConExtension+=1;
            socketserverExtension = new WebSocket(serverURLExtension);
            setupSocketExtension();
        },100*conCon);
    };
    socketserverExtension.onopen = function (){
        conConExtension = 1;
        socketserverExtension.send(JSON.stringify({"join":roomID, "out":3, "in":4}));
    };
    socketserverExtension.addEventListener('message', function (event) {
        var resp = false
        if (event.data){
            var data = JSON.parse(event.data);
            processInput(data);
        }
    });
}

if (urlParams.has("server2")){
    serverURLExtension = urlParams.get("server2") || serverURLExtension;
    socketserverExtension = new WebSocket(serverURLExtension);
    setupSocketExtension();
}

//

var customSource = false;
if (urlParams.has("branded")){
    customSource = true;
}

var speechLang = "en-US";
var speech = false;
var English = true;
var voice = false;
try {
    var voices = window.speechSynthesis.getVoices();
} catch(e){
    var voices = null;
    getById("tts").style.display = "none";
}

//var voiceGender = false;   // I'll need to add the Google Speech API to the dock to make this work
//if (urlParams.has("gender")){
//	voiceGender = urlParams.get("gender") || "MALE";
//}

if (urlParams.has("speech") || urlParams.has("speak") || urlParams.has("tts")){ //  tts();
    document.getElementById("tts").dataset.state = 1;
    document.getElementById("tts").classList.remove("hidden");
    //document.getElementById("tts").classList.add('pressed');
    getById("tts").style['background-image']='url(./icons/tts_incoming_messages_on.png)';
    getById("tts").title = 'Text-to-speech — 🔊⏹ Stop reading incoming messages out-loud with text-to-speech';
    speech = true;
    speechLang = urlParams.get("speech") || urlParams.get("speak") || urlParams.get("tts") || speechLang;

    if (speechLang.split("-")[0].toLowerCase() == "en"){
        English = true;
    } else {
        English = false;
    }
} else if (urlParams.has("language") || urlParams.has("lang") || urlParams.has("ln")){
    speechLang = urlParams.get("language") || urlParams.get("lang") || urlParams.get("ln") || speechLang;
    if (speechLang.split("-")[0].toLowerCase() == "en"){
        English = true;
    } else {
        English = false;
    }
}

if (urlParams.has("simpletts")){
    English = false;
}

var passTTS = false;
if (urlParams.has("passtts")){
    passTTS = true;
}


var skipTTSMessages = false;
if (urlParams.has("skipmessages")){
    skipTTSMessages = parseInt(urlParams.get("skipmessages")) || 3;
}

var pitch = 1;
if (urlParams.has("pitch")){
    pitch = urlParams.get("pitch") || 1;
}

var rate = 1;
if (urlParams.has("rate")){
    rate = urlParams.get("rate") || 1;
}

var volume = 1;
if (urlParams.has("volume")){
    volume = urlParams.get("volume") || 1;
    volume = parseFloat(volume);
}

var voiceName = false;
if (urlParams.has("voice")){
    voiceName = urlParams.get("voice") || "google";
}

function speak(text, allow=false){
    if (!speech && !allow){return;}
    if (!text){return;}
    if (!voices && (voices===null)){return;}
    if (text.startsWith("!")){return;} // do not TTS commands.

    if (!voice){
        if (!voices || !voices.length){
            voices = window.speechSynthesis.getVoices();
        }
        console.log("You can do &voice=VOICENAME to try to force select a voice based on a partial string match of its name.");
        console.log(voices);
        voices.forEach(vce=>{
            if (vce.name && voiceName && (vce.name.toLowerCase().includes(voiceName.toLowerCase()))){
                if (vce.lang && (vce.lang == speechLang)){
                    voice = vce;
                } else if (!voice && vce.lang && (vce.lang.split("-")[0].toLowerCase() == speechLang.split("-")[0].toLowerCase())){
                    voice = vce;
                }
            } else if (vce.name && vce.name.includes("Siri")){ // SIRI sucks and breaks a lot, so lets skip if possible.
                return;
            } else if (!voice && vce.lang && (vce.lang == speechLang)){
                voice = vce;
            } else if (!voice && vce.lang && (vce.lang.split("-")[0].toLowerCase() == speechLang.split("-")[0].toLowerCase())){
                voice = vce;
            }
        });
        if (!voice && voices.length){
            voice = voices.shift(); // take the first/default voice
        }
        if (voice){
            console.log("Voice being used:");
            console.log(voice);
            if (voice.lang && (voice.lang.split("-")[0].toLowerCase() != "en")){
                English = false;
            }
        } else {
            console.log("No voice found; using lang: "+speechLang);
        }
    }

    var speechInput = new SpeechSynthesisUtterance();

    if (!voice){
        speechInput.lang = speechLang;
    } else {
        speechInput.voice = voice;
    }

    speechInput.volume = volume;
    speechInput.rate = rate;
    speechInput.pitch = pitch;
    speechInput.text = text;


    getById("tts").style['background-image']='url(./icons/tts_stop.png)';
    getById("tts").title = 'Text-to-speech — ⏹🔊 Stop reading out-loud with text-to-speech';

    window.speechSynthesis.speak(speechInput);

    try{
        speechInput.addEventListener('end',function(e){
            if (window.speechSynthesis.pending || window.speechSynthesis.speaking){
                getById("tts").style['background-image']='url(./icons/tts_stop.png)';
                getById("tts").title = 'Text-to-speech — ⏹🔊 Stop reading out-loud with text-to-speech';
            } else if (!speech){
                getById("tts").style['background-image']='url(./icons/tts_incoming_messages_off.png)';
                getById("tts").title = 'Text-to-speech — 🔊 Start reading incoming messages out-loud with text-to-speech';
            } else {
                getById("tts").style['background-image']='url(./icons/tts_incoming_messages_on.png)';
                getById("tts").title = 'Text-to-speech — 🔊⏹ Stop reading incoming messages out-loud with text-to-speech';
            }
        });
    } catch(e){
        console.error(e);
    }
}

if (urlParams.has("chroma")){
    var chroma = urlParams.get("chroma") || "0F0";
    document.body.style.backgroundColor = "#"+chroma;
}

if (urlParams.has("compact") || urlParams.has("overlaymode")){
    compactmode = true;
    document.getElementById("output").classList.remove("notcompactmode");
    //document.getElementById("menu").style.display = "none";
}


if (urlParams.has("hidemenu") || urlParams.has("nomenu")){
    if ((urlParams.get("hidemenu")=="2") || (urlParams.get("nomenu")=="2")){
        document.getElementById("menu").classList.add("hideMenuKeepScrollLock");
        document.getElementById("output").style.marginBottom = "0";
    } else{
        document.getElementById("menu").style.display = "none";
        document.getElementById("output").style.marginBottom = "0";
    }
}

if (urlParams.has("save")){
    encode = TextEncoder.prototype.encode.bind(new TextEncoder);
    setupSaveToDisk();
}

if (urlParams.has("savesingle")){
    singlewriter = true;
    document.getElementById("select_save_file").classList.remove('hidden');
    //overwriteFile(); // setup , but this needs a gesture, so bleh
}

var random = false;
if (urlParams.has("random")){
    random = true;
    // enable compact mode also
    compactmode = true;
    document.getElementById("output").classList.remove("notcompactmode");
    document.getElementById("menu").style.display = "none";
    // hide shadows
    // <!-- position: absolute; -->
    // <!-- left: 400px; -->
    // <!-- top: 0px; -->
    // <!-- max-width: 300px; -->
}

var postServer = "http://127.0.0.1";
var thirdPartyAPI = false;
if (urlParams.has("singular")){
    thirdPartyAPI = function (data){
        var API = "https://app.singular.live/apiv1/datanodes/"+urlParams.get("singular")+"/data";

        data.chatimg = upscaleImages(data);

        var message = {"payload": data};
        ajax(message, API, "PUT");
    };
} else if (urlParams.has("postserver")){
    postServer = urlParams.get("postserver") || postServer;
    thirdPartyAPI = function (data){

        data.chatimg = upscaleImages(data);

        ajax(data, postServer, "POST");
    };
} else if (urlParams.has("putserver")){
    postServer = urlParams.get("putserver") || postServer;
    thirdPartyAPI = function (data){

        data.chatimg = upscaleImages(data);

        ajax(data, postServer, "PUT");
    };
} else if (urlParams.has("spxserver") && urlParams.has("spxfunction") && urlParams.has("spxlayer")) {
    let spxserver = urlParams.get("spxserver") || postServer;
    let spxfunction = urlParams.get("spxfunction") || "";
    let spxlayer = urlParams.get("spxlayer") || "";

    thirdPartyAPI = function (data){
        var msg = {};
        if ("id" in data){
            msg.id = data.id;
        }

        if (data.timestamp){
            msg.timestamp = data.timestamp;
        } else {
            msg.timestamp = Date.now();
        }


        msg.message = data.chatmessage || "";
        msg.displayName = data.chatname || "";
        msg.profileImageUrl = upscaleImages(data);

        if (data.type){
            msg.platform = {};
            msg.platform.name = data.type;
            msg.platform.logoUrl = "https://socialstream.ninja/"+data.type+".png";
        }

        params = encodeURIComponent(JSON.stringify(msg));

        if (params.length > 3000) {
            console.log("dropping message due to request length");
            return; // HTTP request too long due to twitch emoji spam, skipping this message.
        }
        postServer = spxserver + "/api/v1/invokeTemplateFunction?webplayout=" + spxlayer + "&function=" + spxfunction + "&params=" + params;

        const spxRequest = new XMLHttpRequest();
        spxRequest.onreadystatechange = function() {
            if (spxRequest.readyState === 4 && spxRequest.status === 200) {
            }
        }
        spxRequest.open('GET', postServer);
        spxRequest.send();
    };
} else if (urlParams.has("h2r") || urlParams.has("h2rurl")){
    postServer = "http://127.0.0.1:4001/data/";

    if (urlParams.has("h2rurl")){
        postServer = urlParams.get("h2rurl") || postServer;
    }
    if (urlParams.has("h2r")){
        postServer = postServer + urlParams.get("h2r");
    }
    thirdPartyAPI = function (data){

        var msg = {};

        if ("id" in data){
            msg.id = data.id;
        }

        if (data.timestamp){
            msg.timestamp = data.timestamp;
        } else {
            msg.timestamp = Date.now();
        }

        msg.snippet = {};
        msg.snippet.displayMessage = data.chatmessage || "";

        msg.authorDetails = {};
        msg.authorDetails.displayName = data.chatname || "";
        msg.authorDetails.profileImageUrl = upscaleImages(data);

        if (data.type){
            msg.platform = {};
            msg.platform.name = data.type;
            msg.platform.logoUrl = "https://socialstream.ninja/"+data.type+".png";
        }

        var h2r = {};
        h2r.messages = [];
        h2r.messages.push(msg);
        ajax(h2r, postServer, "POST");
    };
}

function upscaleImages(data){ // for third party APIs
    let chatimg = "";
    if (data.type && (data.type == "twitch") && data.chatname){
        chatimg = "https://api.socialstream.ninja/twitch/large?username="+encodeURIComponent(data.chatname); // 150x150
    } else if (data.type && (data.type == "youtube") && data.chatimg){
        chatimg = data.chatimg.replace("=s32-", "=s256-");
        chatimg = chatimg.replace("=s64-", "=s256-");
    } else {
        chatimg = data.chatimg || "https://socialstream.ninja/unknown.png";
    }
    return chatimg;
}

function ajax(object2send, url, ajaxType="PUT"){
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            // success
        } else {
            console.error("there was an error sending to the API");
        }
    };
    xhttp.open(ajaxType, url, true); // async = true
    xhttp.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
    xhttp.send(JSON.stringify(object2send));
}

if (urlParams.has("showmenu")){
    document.getElementById("menu").style.display = "block";
} else {
    try {
        if (window.obsstudio){
            if (!reversed && !random){

                setInterval(function(){
                    if (forceAutoscroll && !isOBSBrowserSource){
                        if (alignbottom){
                            if (scrolltype=="instant"){
                                getById("output").scrollTop = getById("output").scrollHeight;
                            } else {
                                getById("output").scrollTo({
                                    top: getById("output").scrollHeight,
                                    left: 0,
                                    behavior:scrolltype
                                });
                            }
                        } else {
                            if (scrolltype=="instant"){
                                document.scrollingElement.scrollTop = document.scrollingElement.scrollHeight;
                            } else {
                                document.scrollingElement.scrollTo({
                                    top: document.scrollingElement.scrollHeight,
                                    left: 0,
                                    behavior:scrolltype
                                });
                            }
                        }
                    }
                },2000);


                window.addEventListener("resize",function(event){
                    if (alignbottom){
                        if (scrolltype=="instant"){
                            getById("output").scrollTop = getById("output").scrollHeight;
                        } else {
                            getById("output").scrollTo({
                                top: getById("output").scrollHeight,
                                left: 0,
                                behavior:scrolltype
                            });
                        }
                    } else {
                        if (scrolltype=="instant"){
                            document.scrollingElement.scrollTop = document.scrollingElement.scrollHeight;
                        } else {
                            document.scrollingElement.scrollTo({
                                top: document.scrollingElement.scrollHeight,
                                left: 0,
                                behavior:scrolltype
                            });
                        }
                    }
                });
            }


            window.obsstudio.getStatus(function(obsStatus){
                document.getElementById("menu").style.display = "none";
                document.getElementById("output").style.marginBottom = "0";
                document.body.style.overflow = "hidden";
                mainOutputWindow.style.overflow = "hidden";
                triggerState=false;
                forceAutoscroll=true;
                //compactmode=true;
                //mainOutputWindow.classList.remove("notcompactmode");
                scale = scale*2.0
                document.documentElement.style.setProperty("--scale-output", scale);
                document.documentElement.style.setProperty("--scale-output-moz", "scale("+scale+")");
                isOBSBrowserSource = true;

                if (!urlParams.has("pressedcolor")) {  // hide the pressed color if not set otherwise, but in OBS.
                    document.documentElement.style.setProperty("--pressed-color", "unset", "");
                }

            });
        }
    } catch(e){}
}

if (urlParams.has("darkmode")){
    darkmode=true;
} else if (urlParams.has("lightmode")){
    darkmode=false;
}

var syncDocks = false;
if (urlParams.has("sync")){
    syncDocks = true;
    try {
        if (blockMessageSelecting2 || blockMessageSelecting){
            document.querySelector('[data-action="Delete"] span').innerText = "Delete Message (locally only)";
            document.querySelector('[data-action="Delete"]').title = "Using chat/view-only mode disables the ability to syncronize deleted messages with other docks";
        }
    } catch(e){
    }
} else {
    try {
        document.querySelector('[data-action="Delete"]').title = "Enable &sync mode to have messages be deleted in other synced docks also";
    } catch(e){
    }
}

if (darkmode){
    document.getElementById("menu").classList.add("darkmode");
    document.documentElement.style.setProperty("--background-color", "#000");
    document.documentElement.style.setProperty("--menu-background-color", "#1c1d1d");
} else if (darkmode === null){ // defaultmode
    document.getElementById("menu").classList.add("darkmode");
    darkmode = true;
} else {
    document.body.classList.add("lightmode");
    document.getElementById("menu").classList.add("lightmode");
    document.getElementById("chatInput_parent").classList.add("lightmode");
    document.getElementById("filter_messages_parent").classList.add("lightmode");
    document.documentElement.style.setProperty("--link-color", "#06F");
    document.documentElement.style.setProperty("--font-color-name", "#000");
    document.documentElement.style.setProperty("--background-color", "#FFF0");
    document.documentElement.style.setProperty("--font-color", "#000");
    document.documentElement.style.setProperty("--highlight-base2", "#EEE7");

    document.documentElement.style.setProperty("--donation-bgcolor-bubble", "#EEED");
    document.documentElement.style.setProperty("--donation-bgcolor-bubble-odd", "#EEE7");

    document.documentElement.style.setProperty("--member-bgcolor-bubble", "#EEED");
    document.documentElement.style.setProperty("--member-bgcolor-bubble-odd", "#EEE7");

    document.documentElement.style.setProperty("--special-bgcolor-bubble", "#EEED");
    document.documentElement.style.setProperty("--special-bgcolor-bubble-odd", "#EEE7");
}

if (urlParams.has("hideshadow")){ // alternating
    document.documentElement.style.setProperty("--highlight-base", "#0000", "important");
    document.documentElement.style.setProperty("--highlight-base2", "#0000", "important");
    document.documentElement.style.setProperty("--highlight-compact", "#0000", "important");
    document.documentElement.style.setProperty("--highlight-compact2", "#0000", "important");
    document.documentElement.style.setProperty("--donation-bgcolor-bubble-odd", document.documentElement.style.getPropertyValue("--donation-bgcolor-bubble"));
    document.documentElement.style.setProperty("--member-bgcolor-bubble-odd", document.documentElement.style.getPropertyValue("--member-bgcolor-bubble"));
    document.documentElement.style.setProperty("--special-bgcolor-bubble-odd", document.documentElement.style.getPropertyValue("--special-bgcolor-bubble"));
    document.documentElement.style.setProperty("--bgcolor-bubble-odd", document.documentElement.style.getPropertyValue("--bgcolor-bubble"));
}

if (urlParams.has("nooutline")){
    document.body.style.textShadow = "0 0 black";
}

if (urlParams.has("transparent") || urlParams.has("transparency")){
    document.documentElement.style.setProperty("--background-color", "#0000", "important");
    document.documentElement.style.setProperty("--menu-background-color", "#0000", "important");
    document.documentElement.style.setProperty("--menu-border-color", "0 0 0 #0000", "important");
    document.getElementById("main").style.overflow = "hidden";
    try {
        mainOutputWindow.style.overflow = "hidden";
    } catch(e){}
}


var firstNamesOnly = false
if (urlParams.has("firstnamesonly") || urlParams.has("firstname") || urlParams.has("firstnames")){
    firstNamesOnly = true;
}

var hideNames = false
if (urlParams.has("hidenames")){
    hideNames = true;
}

var hideNotDonos = false;
var hideEmojiOnly = false;
var hideNotQueued = false;

if (urlParams.has("queueonly")){
    hideNotQueued = true;
    document.getElementById("show_only_queue").dataset.state = "1";
    document.getElementById("show_only_queue").classList.add("pressed");
}

var ttsSpeakChatname = true;
if (urlParams.has("simpletts2")){ // You don't want to hear the chatname when TTS is enabled. ＞﹏＜
    ttsSpeakChatname = false;
    English = false;
}

function emoji(){
    var ele = document.getElementById("hide_emoji");
    if (ele.dataset.state=="0"){
        ele.dataset.state = "1";
        hideEmojiOnly = true;
        //document.documentElement.style.setProperty("--show-emoji-only", "none");
        //document.documentElement.style.setProperty("--show-images", "none");
        ele.style['background-image']='url(./icons/filter_hideemojionly_off.png)';
        ele.title = 'Filter — 📄 Show all messages, including with emojis only';
    } else {
        hideEmojiOnly = false;
        ele.dataset.state = "0";
        //document.documentElement.style.setProperty("--show-emoji-only", "flex");
        //document.documentElement.style.setProperty("--show-images", "inline-block");
        ele.style['background-image']='url(./icons/filter_hideemojionly_on.png)';
        ele.title = 'Filter — 😀🚫 Hide messages that contains emojis only';
    }
    redoOdd();
}



var lastPushed = Date.now();
var activeWordLength = 0;
var activeDonation = false;
var checkTimeout = null;
function checkAutoShow(){
    if (checkTimeout){return;}

    let waitTime = activeWordLength * timePerCharacter;
    let minimumTime = timePerCharacter*42; // 42; the answer to life. the universe. and everything

    if (waitTime<minimumTime){
        waitTime = minimumTime;
    } else if (waitTime>minimumTime*10){
        waitTime = minimumTime*10;
    }

    if (autoShowQueue.length){

        if (lastPushed + waitTime > Date.now()+timePerCharacter){
            checkTimeout = setTimeout(function(){
                checkTimeout = false;
                checkAutoShow();
            }, (lastPushed + waitTime) - Date.now() + timePerCharacter*2);
            return;
        }

        var post = autoShowQueue.shift();
        if (post.classList.contains("pressed")){
            if (autoShowQueue.length){
                checkAutoShow();
            }
            return;
        } else {
            activeWordLength = post.contentLength;
            if (post.rawContents){
                activeDonation = post.rawContents.hasDonation || false;
            } else {
                activeDonation = false;
            }

            selectedMessage(false, post);
        }
    } else {
        return;
    }


    if (autoShowQueue.length>20){
        while (autoShowQueue[0].rawContents && !autoShowQueue[0].rawContents.hasDonation && (autoShowQueue.length>10)){
            autoShowQueue.shift(); // skip oldest, since too many are queued up
        }
        if (activeDonation){
            checkTimeout = setTimeout(function(){
                checkTimeout = false;
                checkAutoShow()
            },waitTime);
        } else {
            checkTimeout = setTimeout(function(){
                checkTimeout = false;
                checkAutoShow();
            },waitTime*0.6);
        }
    } else if (activeDonation){
        checkTimeout = setTimeout(function(){
            checkTimeout = false;
            checkAutoShow()
        },waitTime);
    } else if (autoShowQueue.length>3){
        checkTimeout = setTimeout(function(){
            checkTimeout = false;
            checkAutoShow()
        },waitTime*0.8);
    } else if (autoShowQueue.length){
        checkTimeout = setTimeout(function(){
            checkTimeout = false;
            checkAutoShow()
        },waitTime);
    }
}

function donos(){
    var ele = document.getElementById("only_donos");
    if (ele.dataset.state=="0"){
        ele.dataset.state = "1";
        //document.documentElement.style.setProperty("--show-donos-only", "none");
        hideNotDonos = true;
        ele.style['background-image']='url(./icons/filter_showpaidonly_on.png)';
        ele.title = 'Filter — 📄 Show all messages, including the ones that have donations/cheer';
    } else {
        ele.dataset.state = "0";
        //document.documentElement.style.setProperty("--show-donos-only", flexOrNotToFlex);
        hideNotDonos = false;
        ele.style['background-image']='url(./icons/filter_showpaidonly_off.png)';
        ele.title = 'Filter — 💲 Show only messages that have donations/cheer';
    }
    redoOdd();
}

function onClickFilterAddNameAndTimeButton(ele) {
    filterAddNameAndTime = !filterAddNameAndTime;
    if (ele.dataset.state == "0") {
        ele.dataset.state = "1";
        filterAddNameAndTime = true;
        ele.style['background-image']='url(./icons/filter_addnametime_on.png)';
        ele.title = '🆔 Exclude name, time, and source from filter';
    } else {
        ele.dataset.state = "0";
        filterAddNameAndTime = false;
        ele.style['background-image']='url(./icons/filter_addnametime_off.png)';
        ele.title = '🆔 Filter also by name, time, and source (ie: source:youtube}';
    }

    // Update search after add/remove name and time
    filterMessages(document.getElementById("filter_messages").value);
}

function applyHiddenState(node){
    if (hideNotDonos && node.classList.contains("noDono")){
        node.classList.add("hidden");

    } else if (hideNotQueued && !node.classList.contains("queued") && !node.classList.contains("pinned")){
        node.classList.add("hidden");

    } else if (hideEmojiOnly && node.classList.contains("noText")){
        node.classList.add("hidden");

    } else {
        node.classList.remove("hidden");
    }
}

var hashCode = s => s.split('').reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)


function redoOdd(){
    odd = false;
    var nodes = mainOutputWindow.childNodes;
    for (var i = 0;i<nodes.length;i++){
        applyHiddenState(nodes[i]);
        var style = window.getComputedStyle(nodes[i]);
        if ((style.visibility !== "hidden") && (style.display !== "none")){
            if (odd){
                if (bubble && largeavatar){
                    nodes[i].querySelector(".hl-rightside").classList.add("odd");
                } else if (bubble){
                    nodes[i].querySelector(".hl-message").classList.add("odd");
                    nodes[i].querySelector(".highlight-chat").classList.add("odd");
                } else {
                    nodes[i].classList.add("odd");
                }
            } else {
                if (bubble && largeavatar){
                    nodes[i].querySelector(".hl-rightside").classList.remove("odd");
                } else if (bubble){
                    nodes[i].querySelector(".hl-message").classList.remove("odd");
                    nodes[i].querySelector(".highlight-chat").classList.remove("odd");
                } else {
                    nodes[i].classList.remove("odd");
                }
            }
            odd = !odd;
        }
    }
}

function toggleTriggers(ele){
    triggerState = !triggerState;
    if (triggerState){
        ele.classList.add("pressed");
    } else {
        ele.classList.remove("pressed");
    }
}

function autoShow(toggle=true){
    if (toggle){
        autoshow = !autoshow;
    }
    if (autoshow){
        getById("autoshow").style['background-image']='url(./icons/featured_auto_play.png)';
        getById("autoshow").title = 'Featured — ⏹🌟 Stop auto-featuring messages';
    } else {
        autoShowQueue = []; // empty the auto show queue to stop messages
        getById("autoshow").style['background-image']='url(./icons/featured_auto_stop.png)';
        getById("autoshow").title = 'Featured — 🌟 Auto-feature messages as they come in';
    }
}
function pause(){
    pauseState = !pauseState;
    var ele = document.getElementById("pause");
    if (pauseState){
        ele.style['background-image']='url(./icons/main_msg_play.png)';
        ele.title = 'Main — ▶️ Play incoming chat messages';
    } else {
        ele.style['background-image']='url(./icons/main_msg_pause.png)';
        ele.title = 'Main — ⏸ Pause incoming chat messages';
        //var queueR = queue.reverse();
        if (!pauseState){
            for (var i = 0 ; i<queue.length; i++){
                processData( queue[i] );
            }
        }
        queue= [];
    }
}

function notify() {
    beep = !beep;
    var ele = document.getElementById("notify");
    if (beep) {
        ele.dataset.state = beep*1;
        ele.style['background-image']='url(./icons/main_msg_notify_on.png)';
        ele.title = 'Main — 🔕 Stop beeping when there is a new message';
        playtone();
    } else {
        ele.dataset.state = beep*1;
        ele.style['background-image']='url(./icons/main_msg_notify_off.png)';
        ele.title = 'Main — 🔔 Start beeping when there is a new message';
    }
}

function tts() {
    var ele = document.getElementById("tts");
    if (window.speechSynthesis.pending || window.speechSynthesis.speaking){
        speech = false;
        window.speechSynthesis.cancel();
    } else {
        speech = !speech;
    }

    if (speech) {
        ele.style['background-image']='url(./icons/tts_incoming_messages_on.png)';
        ele.title = 'Text-to-speech — 🔊⏹ Stop reading incoming messages out-loud with text-to-speech';
    } else {
        ele.style['background-image']='url(./icons/tts_incoming_messages_off.png)';
        ele.title = 'Text-to-speech — 🔊 Start reading incoming messages out-loud with text-to-speech';
    }
}

try {
    if (window.location.host !== "socialstream.ninja"){ // don't check if not private hosted, since it won't exist
        var script = document.createElement('script');
        script.onload = function() {
            console.log("Loaded personal actions");
        }
        script.onerror = function(){
            console.log("no personal actions file found. skipping.");
        }
        script.src = "custom.js";
        document.head.appendChild(script);
    }
} catch(e){}

function processInput(data){
    if ("mid" in data){
        if (data.mid && syncDocks){

            if (autoTimeoutEnabled){
                lastPushed = Date.now();
            }

            try {
                document.querySelector("[data-mid='"+data.mid+"']").classList.add("pressed");
            } catch(e){
                setTimeout(function(mid){
                    try{
                        document.querySelector("[data-mid='"+mid+"']").classList.add("pressed");
                    } catch(e){}
                },500, data.mid); // if delayed, we will try again.
            }
            return true
        }
        return;
    } else if ("pin" in data){
        if (data.pin && syncDocks){
            if (typeof data.pin == "object"){
                data.pin.forEach(dddd=>{
                    if (typeof dddd === "object"){
                        try{
                            if (dddd.id && document.querySelector("[data-mid='"+dddd.id+"']")){
                                pinIt(document.querySelector("[data-mid='"+dddd.id+"']"));
                                applyHiddenState(document.querySelector("[data-mid='"+dddd.id+"']"));
                            } else {
                                let ele = processInput(dddd);
                                pinIt(ele);
                                applyHiddenState(ele);
                            }
                        } catch(e){}
                    } else {
                        try {
                            pinIt(document.querySelector("[data-mid='"+dddd+"']"));
                            applyHiddenState(document.querySelector("[data-mid='"+dddd+"']"));
                        } catch(e){

                        }
                    }
                });
                return true
            }
        }
        return;
    } else if ("unpin" in data){
        if (data.unpin && syncDocks){
            if (typeof data.unpin == "object"){
                data.unpin.forEach(mid=>{
                    try {
                        unpinIt(document.querySelector("[data-mid='"+mid+"']"));
                        applyHiddenState(document.querySelector("[data-mid='"+mid+"']"));
                    } catch(e){
                        // doesn't exist or whatever.
                    }
                });
                return true
            }
        }
        return;
    } else if ("queueInit" in data){
        if (data.queueInit && syncDocks && !selectedQueue.length){
            if (typeof data.queueInit == "object"){
                var sq = [];
                data.queueInit.forEach(dd=>{
                    try{
                        if (dd && dd.id){
                            var ele = document.querySelector("[data-mid='"+dd.id+"']");
                            if (!ele){
                                ele = processInput(dd);
                            }
                        } else {
                            var ele = processInput(dd);
                        }
                        if (ele){
                            sq.push(ele);
                            ele.children[0].dataset.qid = sq.length;
                            ele.classList.add("queued");
                            applyHiddenState(ele);
                        }
                    }catch(e){}
                });
                selectedQueue = sq;
                updateQueueButton();
                return true
            }
        }
        return;
    } else if ("queue" in data){
        if (data.queue && syncDocks){
            if (typeof data.queue == "object"){
                selectedQueue.forEach(xx=>{
                    if (xx.dataset.mid && !data.queue.includes(parseInt(xx.dataset.mid))){
                        removeQueue(xx);
                    }
                });
                var sq = [];
                data.queue.forEach(mid=>{
                    try{
                        if (mid){
                            if (typeof mid === "object"){
                                if ("id" in mid){
                                    var ele = document.querySelector("[data-mid='"+mid.id+"']");
                                    if (ele){
                                        sq.push(ele);
                                        ele.children[0].dataset.qid = sq.length;
                                        ele.classList.add("queued");
                                        applyHiddenState(ele);
                                    } else {
                                        ele = processInput(mid);
                                        if (ele){
                                            sq.push(ele);
                                            ele.children[0].dataset.qid = sq.length;
                                            ele.classList.add("queued");
                                            applyHiddenState(ele);
                                        }
                                    }
                                }
                            } else {
                                var ele = document.querySelector("[data-mid='"+mid+"']");
                                if (ele){
                                    sq.push(ele);
                                    ele.children[0].dataset.qid = sq.length;
                                    ele.classList.add("queued");
                                    applyHiddenState(ele);
                                }
                            }
                        }
                    }catch(e){}
                });
                selectedQueue = sq;
                updateQueueButton();
                return true
            }
        }
        return;
    } else if ("deleteMessage" in data){
        //if (syncDocks){
        try{
            var ele = document.querySelector("[data-mid='"+data.deleteMessage+"']");
            if (ele){
                ele.remove();
            }
            return true
        } catch(e){}
        //}
        return;
    }

    if (data.action){

        if (data.target && (data.target!=="null") && (data.target !== thisLabel)){
            return; // does not match, so we assume this isn't for us.
        }

        if (data.action == "nextInQueue"){
            nextInQueue();
            return true
        } else if (data.action == "clearOverlay"){ // or just send data=false
            sendDataP2P(false);
            return true
        } else if (data.action == "getQueueSize"){ // or just send data=false
            updateQueueButton();
            return true
        } else if (data.action == "autoShow"){ // or just send data=false
            if (data.value=="toggle"){
                autoshow = !autoshow;
            } else if (data.value){
                autoshow = true;
            } else {
                autoshow = false;
            }
            autoShow(false);
            return true
        } else if (data.action == "content"){ // or just send data=false
            if (data.value){
                //let content = decodeURI(data.value);
                let content = JSON.parse(data.value);
                if (!pauseState ){
                    processData( {contents : content} );
                } else {
                    queue.push({contents : content});
                    if (queue.length>100){ // keep the queue from exploding in size
                        queue.shift();
                    }
                }
                return true
            }
            return false;
        }
    } else if ("forward" in data){
        sendDataP2P(data.forward);
        return true
    } else if ("html" in data){
        processHTML(data);
        return true
    } else if (data.content){
        if (!pauseState ){
            processData( {contents : data.content} );
        } else {
            queue.push({contents : data.content});
            if (queue.length>100){ // keep the queue from exploding in size
                queue.shift();
            }
        }
        return true
    } else if (!pauseState ){
        return processData( {contents : data} );
    } else {
        queue.push({contents : data});
        if (queue.length>100){ // keep the queue from exploding in size
            queue.shift();
        }
        return true
    }
    return false;
}

var connectedPeers = {};
function RecvDataWindow(){
    iframe = document.createElement("iframe");

    // if (syncDocks){
    iframe.src = "https://vdo.socialstream.ninja/?ln&salt=vdo.ninja&password="+password+"&push&label=dock&vd=0&ad=0&novideo&noaudio&autostart&cleanoutput&room="+roomID;
    // } else {
    // iframe.src = "https://vdo.socialstream.ninja/?ln&salt=vdo.ninja&password="+password+"&view="+roomID+"&push&vd=0&ad=0&autostart&cleanoutput&room="+roomID;
    // }
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.position = "fixed";
    iframe.style.left = "-100px";
    iframe.style.top = "-100px";
    iframe.id = "frame1"
    document.body.appendChild(iframe);

    var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    var eventer = window[eventMethod];
    var messageEvent = eventMethod === "attachEvent" ? "onmessage" : "message";

    eventer(messageEvent, function (e) {
        if (e.source != iframe.contentWindow){return} // reject messages send from other iframes

        if (("action" in e.data) && e.data.UUID && e.data.value && (e.data.action == "push-connection-info")){ // flip this
            if ("label" in e.data.value){
                connectedPeers[e.data.UUID] = e.data.value.label;
                if (connectedPeers[e.data.UUID] === "dock"){ // this is a dock that wants to be synced with
                    syncDockAll(e.data.UUID);
                }
            }
        } else if (("action" in e.data) && e.data.UUID && e.data.value && (e.data.action == "view-connection-info")){ // flip this
            if ("label" in e.data.value){
                connectedPeers[e.data.UUID] = e.data.value.label;
                if (openChatAutomatically){
                    send2Extension({action:"openChat", value:null}, e.data.UUID);
                }
            }
        }

        if (("action" in e.data) && e.data.UUID && ("value" in e.data) && !e.data.value && (e.data.action == "push-connection")){ // flip this
            if (e.data.UUID in connectedPeers){
                delete connectedPeers[e.data.UUID];
            }
            //console.log(connectedPeers);
        } else if (("action" in e.data) && e.data.UUID && ("value" in e.data) && !e.data.value && (e.data.action == "view-connection")){ // flip this
            if (e.data.UUID in connectedPeers){
                delete connectedPeers[e.data.UUID];
            }
        }

        if ("dataReceived" in e.data){ // raw data
            if ("overlayNinja" in e.data.dataReceived){
                processInput(e.data.dataReceived.overlayNinja);
            }
        }
    });
}

RecvDataWindow();

function createElementFromHTML(htmlString) {
    var div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    return div.firstChild;
}


//	if (forceAutoscroll){
//	document.getElementById("jumpto").classList.add("pressed");
//	}


function jumptoBottom(){
    var ele = document.getElementById("jumpto");
    forceAutoscroll = !forceAutoscroll;
    if (forceAutoscroll){
        ele.style['background-image']='url(./icons/scroll_to_bottom_on.png)';
        ele.title = 'Force scroll to bottom';
    } else {
        ele.style['background-image']='url(./icons/scroll_to_bottom_off.png)';
        ele.title = 'Scroll to bottom';
    }
    if (alignbottom){
        if (scrolltype=="instant"){
            getById("output").scrollTop = getById("output").scrollHeight;
        } else {
            getById("output").scrollTo({
                top: getById("output").scrollHeight,
                left: 0,
                behavior:scrolltype
            });
        }
    } else {
        if (scrolltype=="instant"){
            document.scrollingElement.scrollTop = document.scrollingElement.scrollHeight;
        } else {
            document.scrollingElement.scrollTo({
                top: document.scrollingElement.scrollHeight,
                left: 0,
                behavior:scrolltype
            });
        }
    }
}

function filterMessage(node) {

    if (filterAddNameAndTime) {
        if (!filterNamesNotMessages && node.textContent.toLowerCase().includes(filtering)) {

        } else if (filterNamesNotMessages && eles[i].querySelector(".hl-name") && eles[i].querySelector(".hl-name").textContent.toLowerCase().includes(filtering)){

        } else if (node.dataset.sourceType && (("source:"+node.dataset.sourceType) == filtering)){ // youtube, twitch, etc.

        } else {
            node.classList.add("hide"); // Filter is typed - Not found; them hide them
        }


        // Message only
    } else {
        var nodeValue = node.querySelector(".hl-message");


        if (!nodeValue){
            nodeValue.classList.add("hide");
            return;
        } else if (nodeValue.innerText.toLowerCase().includes(filtering)) {

        } else {
            node.classList.add("hide");
        }

    }
}

function filterMessages(keyword="") {
    var eles = document.querySelectorAll("#output > div");
    var elesValue = document.querySelectorAll("#output .hl-message");
    if (eles.length !== elesValue.length)
        return;

    keyword = keyword.trim().toLowerCase();
    filtering = keyword;

    // With user name and message time
    if (filterAddNameAndTime) {
        for (var i = 0; i < eles.length; i++) {
            // No filter is typed; then show all
            console.log(("source:"+eles[i].dataset.sourceType) + " " +keyword);
            if (!keyword) {
                eles[i].classList.remove("hide");

                // Filter is typed - Found; then show them
            } else if (!filterNamesNotMessages && eles[i].textContent.toLowerCase().includes(keyword)) {
                eles[i].classList.remove("hide");
            } else if (filterNamesNotMessages && eles[i].querySelector(".hl-name") && eles[i].querySelector(".hl-name").textContent.toLowerCase().includes(keyword)){
                eles[i].classList.remove("hide");
            } else if (eles[i].dataset.sourceType && (("source:"+eles[i].dataset.sourceType) == keyword)){ // youtube, twitch, etc.
                eles[i].classList.remove("hide");
            } else {
                eles[i].classList.add("hide"); // Filter is typed - Not found; them hide them
            }
        }

        // Message only
    } else {
        for (var i = 0; i < eles.length; i++) {
            // No filter is typed; then show all
            if (!keyword) {
                eles[i].classList.remove("hide");

                // Filter is typed - Found; then show them
            } else if (elesValue[i].innerText.toLowerCase().includes(keyword)) {
                eles[i].classList.remove("hide");

                // Filter is typed - Not found; them hide them
            } else {
                eles[i].classList.add("hide");
            }
        }
    }
}

function toDataURL(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function() {
        try{
            var reader = new FileReader();
            reader.onloadend = function() {
                callback(reader.result);
            }
            reader.readAsDataURL(xhr.response);
        } catch(e){
            callback(false);
        }
    };
    xhr.onerror = function() {
        callback(false);
    };
    xhr.open('GET', url);
    xhr.responseType = 'blob';
    xhr.send();
}

var fallbackImage = new Image();
fallbackImage.src = "unknown.png";
fallbackImage.onerror = function(){
    fallbackImage=false;
}

function errorImage(ele){
    if (fallbackImage){
        ele.src = "unknown.png";
        if (darkmode){
            ele.classList.add("invert");
        }
    } else {
        ele.style.display = "none";
    }
}

function processHTML(data){
    //var node = createElementFromHTML('<div id="msg_'+data.id+'" class="highlight-chat">'+ data.html+'</div>')
    //mainOutputWindow.appendChild(node);
}

function nextInQueue(){
    if (!selectedQueue.length) {
        sendDataP2P(false);
        updateQueueButton();
        return;
    }

    element = selectedQueue.shift();
    selectedMessage(false, element);
    element.classList.remove("queued");
    delete element.children[0].dataset.qid;
    updateQueueButton(true);
    syncQueueP2P();
}

async function fetchWithTimeout(resource, options = {}) { // https://dmitripavlutin.com/timeout-fetch-request/
    const { timeout = 8000 } = options;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });
    clearTimeout(id);
    return response;
}

function unpinIt(element){
    element.classList.remove("pinned");
    document.getElementById("output").prepend(element);
    element.title = "Alt + Click to pin message";
    applyHiddenState(element);
}

function pinIt(element){
    element.classList.add("pinned");
    element.title = "Alt + Click to remove pinned message";
    document.getElementById("pinned").appendChild(element);
    applyHiddenState(element);
}

function deleteMessage(element){
    syncDataP2P({deleteMessage: element.dataset.mid}, false, true);
    element.remove();
}

function filterQueued(){ // #show_only_queue
    var ele = document.getElementById("show_only_queue");
    if (ele.dataset.state=="0"){
        ele.dataset.state = "1";
        //document.documentElement.style.setProperty("--show-queue-only", "none");
        hideNotQueued = true;
        ele.style['background-image']='url(./icons/queue_show_listonly_on.png)';
        ele.title = 'Queue — 📄 Show all messages, including the ones in queue';
    } else {
        ele.dataset.state = "0";
        //document.documentElement.style.setProperty("--show-queue-only", flexOrNotToFlex);
        hideNotQueued = false;
        ele.style['background-image']='url(./icons/queue_show_listonly_off.png)';
        ele.title = 'Queue — 📑 Show only the messages in queue';
    }
    redoOdd();
}

function updateQueueButton(relabel=false){
    if (!selectedQueue.length){
        document.getElementById("next_in_queue_badge").innerText = "0";
        document.getElementById("next_in_queue").title = "Queue — ⏭ Feature next message in queue (since queue is empty, it will clear the active overlay)";
    } else {
        document.getElementById("queueSection").classList.remove("hidden");
        document.getElementById("next_in_queue_badge").innerText = selectedQueue.length;
        document.getElementById("next_in_queue").title = "Queue — ⏭ Feature next message in queue (select messages holding CTRL for add them to the queue)";
    }
    if (relabel){
        for (var i=0;i<selectedQueue.length;i++){
            try {
                selectedQueue[i].children[0].dataset.qid = i+1;
            } catch(e){console.error(e);}
        }
    }
    if (socketserver){
        socketserver.send(JSON.stringify({"queueLength":selectedQueue.length}));
    }
}

function removeQueue(element){
    element.classList.remove("queued");
    delete element.children[0].dataset.qid;
    var index = selectedQueue.indexOf(element);
    if (index > -1) { // only splice array when item is found
        selectedQueue.splice(index, 1); // 2nd parameter means remove one item only
    }
    updateQueueButton(true);
}

function selectedMessage(event=false, element=false){

    if (blockMessageSelecting || blockMessageSelecting2){
        return;
    }

    if (!element){
        element = this;
    }

    e = event || window.event;
    if (event && (e.which !== 1)){
        return;
    }

    if (event && (event.ctrlKey || event.metaKey)) {
        if (element.classList.contains("queued")){
            removeQueue(element);
            syncQueueP2P(false, element);
            return;
        }
        selectedQueue.push(element);
        element.children[0].dataset.qid = selectedQueue.length;
        element.classList.add("queued");
        updateQueueButton();
        syncQueueP2P(false, element);
        return;
    } else if (event && (event.altKey)) {
        if (element.classList.contains("pinned")){
            unpinIt(element);
            if (element.dataset.mid){
                syncDataP2P({unpin:[element.dataset.mid]});
            }
        } else {
            pinIt(element);
            if (element.dataset.mid && element.rawContents){
                syncDataP2P({pin:[element.rawContents]});
            } else if (element.dataset.mid){
                syncDataP2P({pin:[element.dataset.mid]});
            }
        }
        return;
    }

    if (blockMessageSelecting3){
        return;
    }

    if (event && element.classList.contains("last-message")) { // Message is already featured!
        element.classList.remove("last-message"); // remove classes
        sendDataP2P(false);	// clear message
        return;
    }


    if (autoTimeoutEnabled){
        lastPushed = Date.now();
        if (event && autoShowQueue.length){ // user selected and an auto queue
            var index = autoShowQueue.indexOf(element); // item exists in the queue; so lets remove it from it
            if (index > -1) { // remove if
                autoShowQueue.splice(index, 1); // 2nd parameter means remove one item only
            }
        }
    }

    document.querySelectorAll(".last-message").forEach(ele=>{ // last message sent was to clear the overlay
        ele.classList.remove("last-message"); // no overlay is now active.
    });
    element.classList.add("pressed", "last-message"); // add last-message class

    try {
        activeWordLength = element.contentLength;
    } catch(e){}

    var data = element.rawContents;

    if (thirdPartyAPI){ // we upscale using a generic upsizing function for third parties.
        thirdPartyAPI(data); // not going to send base64 to the third party API, since that would kill my server, but third parties won't expect a blob.
    } else if (data.type && (data.type == "youtube") && data.chatimg){ // youtube's images are a bit tricky; larger images don't always exist.
        try {
            toDataURL(data.chatimg, function(base64Image){ // we upscale
                data.chatimg = data.chatimg.replace("=s32-", "=s256-");  // Increases the resolution of the image
                data.chatimg = data.chatimg.replace("=s64-", "=s256-");
                if (base64Image){
                    data.backupChatimg = base64Image; // there's code in the index page to fallback if the larger image doens't exist
                }
                sendDataP2P(data);
            });
        } catch(e){
            data.chatimg = data.chatimg.replace("=s32-", "=s256-");  // Increases the resolution of the image
            data.chatimg = data.chatimg.replace("=s64-", "=s256-");
            sendDataP2P(data);
        }
    } else {
        sendDataP2P(data); // we handle twitch upsizing in the index.html instead.
    }
};


function nodeRemove(node=null){
    if (node){
        node.remove();
    }
    if (reversed && !forceAutoscroll){

    } else {
        if (alignbottom) {
            if ((getById("output").scrollHeight<(getById("output").scrollTop + getById("output").clientHeight+autoScrollCatch)) || forceAutoscroll){
                if (scrolltype=="instant"){
                    getById("output").scrollTop = getById("output").scrollHeight;
                } else {
                    getById("output").scrollTo({
                        top: getById("output").scrollHeight,
                        left: 0,
                        behavior:scrolltype
                    });
                }
            }
        } else if ((document.body.scrollHeight<(document.body.scrollTop + document.body.clientHeight+autoScrollCatch)) || forceAutoscroll){
            if (scrolltype=="instant"){
                document.scrollingElement.scrollTop = document.scrollingElement.scrollHeight;
            } else {
                document.scrollingElement.scrollTo({
                    top: document.scrollingElement.scrollHeight,
                    left: 0,
                    behavior:scrolltype
                });
            }
        }
    }
}

function fadeOutNode(node){
    if (fadeout && horizontal){
        node.classList.add("fadeout");
        setTimeout(function(node){
            nodeRemove(node);
        },500,node);
    } else if (horizontal){
        nodeRemove(node);
    } else if (fadeout){
        node.classList.add("fadeout");
        setTimeout(function(node){
            nodeRemove(node);
        },500,node);
    } else if (scrolltype === "smooth"){
        node.style.transition =  "all linear 0.5s";
        node.style.height =  "0";
        setTimeout(function(node){
            nodeRemove(node);
        },500,node);
    } else {
        nodeRemove(node);
    }
}

function slideIn(node){
    if (horizontal){
        nodeRemove(node);
    } else {
        node.style.transition =  "all linear 0.5s";
        node.style.height =  "0";
        setTimeout(function(node){
            nodeRemove(node);
        },500,node);
    }
}

function removeNode(){
    var nodes = document.querySelectorAll("#output>div:not(.queued)");
    var total2Remove = 0;
    if (isOBSBrowserSource){ // This is an OBS browser source, so lets go light on it.
        if (customNodeLimit){
            total2Remove =  nodes.length - customNodeLimit;
        } else if (window.innerHeight>1600){
            total2Remove =  nodes.length - 39;
        } else if (window.innerHeight>1200){
            total2Remove =  nodes.length - 30;
        } else if (window.innerHeight>800){
            total2Remove =  nodes.length - 22;
        } else if (window.innerHeight>400){
            total2Remove =  nodes.length - 14;
        } else {
            total2Remove =  nodes.length - 10;
        }
    } else if (customNodeLimit){
        total2Remove =  nodes.length - customNodeLimit;
    } else if (window.innerHeight>900){
        total2Remove =  nodes.length - 80;
    } else if (window.innerHeight>600){
        total2Remove =  nodes.length - 70;
    } else {
        total2Remove =  nodes.length - 60;
    }
    if (total2Remove>0){
        for (var i = total2Remove-1;i>=0;i--){
            fadeOutNode(nodes[i]);
        }
    }
}

function stripHtmlFunction(html){
    let tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

function getRandomWord() {
    const wordWeights = [
        { word: "ok", weight: 0.8 },
        { word: "cancel", weight: 0.05 },
        { word: "nani", weight: 0.02 },
        { word: "heart", weight: 0.03 },
        { word: "star", weight: 0.05 },
        { word: "cat", weight: 0.05 }
    ];

    const random = Math.random();
    let cumulativeWeight = 0;

    for (const { word, weight } of wordWeights) {
        cumulativeWeight += weight;

        if (random < cumulativeWeight) {
            return word;
        }
    }

    // Fallback: Return "ok" as the default word
    return "ok";
}

function chooseUIButton() {
    var uiColor = "";
    var oddUiButton = "purple";
    var evenUiButton = "teal";
    var buttonName = getRandomWord();

    if (odd) {
        uiColor = oddUiButton;
    }
    else {
        uiColor = evenUiButton;
    }
    var uiButton = '<img id="img_button" class="hl-ui-button" src="./themes/space_continuum/'+ uiColor +'/button_'+ buttonName +'.png">';
    return uiButton
}

function processData(data, reloaded=false){
    //console.log(data);
    uiButton = chooseUIButton();
    if (data.contents){
        data = data.contents;

        var invisible = false;


        if (!("id" in data)){
            data.id = Date.now() + parseInt(Math.random()*1000000);
        }

        if (data.question && hidequestions){
            return;
        } else if (!data.question && onlyquestions){
            return;
        }

        try {
            if (applyCustomActions){
                applyCustomActions(data); // Any custom actions (not synced with github)
            }
        } catch(e){
            console.error(e);
        }


        var showType = "";
        if (!data.type){
            data.type= "none";
        } else {
            data.type = data.type.toString();
            showType = data.type;
        }

        if (data.hasDonation){
            if (stripHTML){
                data.hasDonation = stripHtmlFunction(data.hasDonation);
            }
            data.hasDonation = data.hasDonation.trim();
        } else {
            data.hasDonation = "";
        }

        if (data.chatname){
            if (stripHTML){
                data.chatname = stripHtmlFunction(data.chatname);
            }
            data.chatname = data.chatname.trim();
        } else {
            data.chatname = "";
        }

        if (data.chatmessage){
            if (stripHTML){
                data.chatmessage = stripHtmlFunction(data.chatmessage);
                data.chatmessage = data.chatmessage.trim();
            } else if (data.event){
                data.chatmessage = data.chatmessage.trim();
                data.chatmessage = "<i>"+data.chatmessage+"</i>";
            }
        } else {
            data.chatmessage = "";
        }

        if (writer){
            var date = new Date();
            let text;
            var date = date.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true });
            if ("sentiment" in data){
                text = encode((data.chatname || "") + "\t" + (data.chatmessage || "") + "\t" + (showType || "") + "\t" + (date || "")  + "\t" + (data.sentiment || "") + "\n");
            } else {
                text = encode((data.chatname || "") + "\t" + (data.chatmessage || "") + "\t" + (showType || "") + "\t" + (date || "") + "\n");
            }
            if (writer){
                writer.write(text);
            }
        }

        if (singlewriter){
            data.timestamp = new Date().getTime();
            overwriteFile(JSON.stringify(data));
        }


        if ("sentiment" in data){
            if (data.sentiment<.10){ // 1.0 is good; 0.0 is bad, so 0.1 is likely bad.
                return;
            }
        }

        var addImage = "";
        if (data.contentimg){
            addImage = '<div class="hl-imgContent"><img src="' + data.contentimg + '" class="hl-img-content" onerror="this.parent.style.display=\'none\'" /></div>';
        } else if (attachmentsonly){
            data.chatmessage = "";
            data.hasDonation = "";
            return;
        } else {
            data.contentimg = "";
        }

        var donationHTML = "";
        if (data.hasDonation){
            donationHTML = "<span class='donationAmount hl-donation'>"+data.hasDonation+"</span>";
        } else {
            data.hasDonation = "";
        }

        if (data.chatmessage && stripEmojis){
            data.chatmessage = data.chatmessage.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/ig, "");
        }

        var chatmessage = "";
        if (data.chatmessage){
            if (stylizeEmoji && !reloaded){
                chatmessage = data.chatmessage.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/ig, "<span class='emoji'>$1</span>");
            } else {
                chatmessage = data.chatmessage;
            }
            if (!stripHTML){ // we want to reuse this, but only if HTML is allowed
                data.chatmessage = chatmessage;
            }
        } else {
            data.chatmessage = "";
        }

        if (!chatmessage && !data.contentimg && !data.hasDonation){
            return;
        }


        if (data.type && (data.type == "twitch") && avatars && !data.chatimg && data.chatname){ // this is a temp fix until everyone updates.
            data.chatimg = "https://api.socialstream.ninja/twitch/?username="+encodeURIComponent(data.chatname); // this is CORS restricted to socialstream, but this is to ensure reliability for all
        }

        var chatImg = data.chatimg;
        if (!chatImg && avatars){
            if (fallbackImage){
                chatImg = '<img id="img_' + data.id + '" src="unknown.png" class="icon ' + (darkmode ? 'invert' : '') + ' hl-profile-pic" onerror="errorImage(this);" />'
            } else {
                chatImg = "";
            }
        } else if (avatars){
            if (data.type && (data.type == "twitch") && avatars){
                chatImg = '<img id="img_' + data.id + '" src="unknown.png" class="fade-in-image ' + (darkmode ? 'invert' : '') + ' icon hl-profile-pic" onerror="errorImage(this);" />'
            } else {
                chatImg = '<img id="img_'+data.id+'" src="' + chatImg + '" class="icon hl-profile-pic" onerror="errorImage(this);" />'
            }
        } else {
            chatImg = "";
        }


        if (largeavatar && showType && showsource){
            showType = '<img src="' + showType + '.png" class="icon hl-source-type avatar-badge" data-icon-name="'+showType+'" onerror="this.style.display=\'none\'" />';
        } else if (showType && showsource){
            showType = '<img src="' + showType + '.png" class="icon hl-source-type" data-icon-name="'+showType+'" onerror="this.style.display=\'none\'" />';

        } else {
            showType = "";
        }

        if (data.sourceImg && customSource){
            if (largeavatar){
                showType += '<img src="' + data.sourceImg + '" class="icon hl-source-type  avatar-badge" onerror="this.style.display=\'none\'" />';
            } else {
                showType += '<img src="' + data.sourceImg + '" class="icon hl-source-type" onerror="this.style.display=\'none\'" />';
            }
        }

        var timeArrived = "";
        if (datestamp){
            var date = new Date();
            timeArrived = date.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })
            if (compactmode){
                timeArrived = timeArrived.split(" ")[0];
            }
            timeArrived = "<div class='time-arrived'>"+timeArrived+"</div>";
        }


        var bot = false;


        var nameColor = "";
        if (data.nameColor && colorized){
            nameColor = "style='color:"+data.nameColor+";'";
        }

        var chatbadges = "";
        if (data.chatbadges && showbadges){
            data.chatbadges.forEach(badge=>{
                if (typeof badge == "object"){
                    if (badge.type && (badge.type=="img") && badge.src){
                        chatbadges += "<img class='hl-badge' src='"+badge.src+"' />";
                    } else if (badge.type && (badge.type=="svg") && badge.html){
                        chatbadges += "<span class='hl-badge svg'>"+badge.html+"</span>";
                    }
                } else {
                    chatbadges += "<img class='hl-badge' src='"+badge+"' />";
                }
            });
        }

        var specialMessage = false;

        if (data.chatname){

            //if (data.chatname.toLowerCase() == "streamelements"){
            //	bot = true;
            //specialMessage = true;
            //} else if (data.chatname.toLowerCase() == "nightbot"){
            //	bot = true;
            //specialMessage = true;
            if (data.chatname.toLowerCase() == "vdoninja"){ // because why not. :)
                data.chatname = "VDO.Ninja";
            } else if (custombot && custombot.includes(data.chatname.toLowerCase().replace(/[^a-z0-9_]+/gi, ""))){ // because why not. :)
                bot = true;
            }

            if (bot && doNotShowBot){
                return;
            }

            if (bot && doNotShowBotNames){
                specialMessage = true;
                data.chatname = "";
            }


            if (hideNames){
                data.chatname = "";
            } else if (firstNamesOnly){
                var nn = data.chatname.split(" ");
                if (nn.length>1){
                    if (nn[0].length<=2){
                        if (nn[1].length<6){
                            data.chatname = nn[0] + " " +nn[1];
                        } else {
                            data.chatname = nn[0];
                        }
                    } else {
                        data.chatname = nn[0];
                    }
                }
            }
        }

        var chatname = "";

        if (largeavatar){
            chatname = '<div '+nameColor+' class="hl-name'+splitMode+'">' + (data.chatname||"") + '<span class="hl-badges">'+chatbadges +"</span></div>";
        } else if (data.chatname){
            if (compactmode){
                if (specialMessage){
                    chatname = '<div class="hl-name'+splitMode+'"></div>';
                } else if (chatbadges){
                    chatname = '<span class="hl-badges">'+chatbadges+'</span><div '+nameColor+' class="hl-name'+splitMode+'">'+ data.chatname+":</div>";
                } else {
                    chatname = '<div '+nameColor+' class="hl-name'+splitMode+'">' + data.chatname+":</div>";
                }
            } else {
                chatname = '<div '+nameColor+' class="hl-name'+splitMode+'">' +chatbadges+ data.chatname+"</div>";
            }
        } else if (specialMessage && compactmode){
            chatname = '<div class="hl-name'+splitMode+'"></div>';
        } else {
            chatname = '<div class="hl-name'+splitMode+'">'+chatbadges+'</div>';
        }

        var larger = "";
        if (stylizeEmoji){
            larger = " larger-emojis";
        }

        var expand = "";

        if (horizontal){
            expand = " expand";
        }

        if (fixed){
            expand += " fixed";
            if (alignbottom){
                expand += " bottom";
            }
        }


        var mid = "";
        if (data.id){
            mid = "data-mid='"+data.id+"'";
        } else {
            console.error("Messages should have an ID, else queuing/pinning won't work");
        }


        if (largeavatar){
            var node = createElementFromHTML('<div id="msg_'+data.id+'" '+mid+' data-menu="context-menu" class="highlight-chat'+expand+'" data-source-type="'+data.type+'">'
                + '<div class="hl-leftside">'
                + chatImg
                + showType
                + '</div>'
                + '<div class="hl-rightside'+larger+'">'
                + '<div class="hl-righttopline">'
                + chatname
                + timeArrived
                + "<div class='queueid'></div>"
                + '</div>'
                + '<div class="hl-message">'
                + '<span class="hl-content" id="content_'+data.id+'">' + chatmessage + '</span>'
                + addImage
                + donationHTML
                + '</div>'
                + uiButton
                + '</div></div>');
        } else if (twoLines){
            var node = createElementFromHTML('<div id="msg_'+data.id+'" '+mid+' data-menu="context-menu" class="highlight-chat'+larger+expand+'" data-source-type="'+data.type+'">'
                + '<div class="hl-firstline">'
                + showType
                + '<div class="hl-profile">'
                + chatImg
                + chatname
                + '</div>'
                + "<div class='queueid'></div>"

                + '</div><div class="hl-message">'
                + timeArrived
                + '<span class="hl-content" id="content_'+data.id+'">' + chatmessage + '</span>'
                + '</div>'
                + uiButton
                + addImage
                + donationHTML + '</div>');
        } else if (splitMode){
            var node = createElementFromHTML('<div id="msg_'+data.id+'" '+mid+' data-menu="context-menu" class="highlight-chat'+larger+expand+'" data-source-type="'+data.type+'">'
                + "<div class='hl-profile'>"
                + chatname
                + showType
                + chatImg
                + "</div>"
                + "<div class='queueid' title='Order in Queue, with 1 being next up.'></div>"
                + "<div class='leftside "+larger+"'>"

                + "</div>"
                + '<div class="hl-message hl-content" id="content_'+data.id+'">' + chatmessage + '</div>'
                + uiButton
                + addImage
                + donationHTML + '</div>');
        } else if (compactmode){
            var node = createElementFromHTML('<div id="msg_'+data.id+'" '+mid+' data-menu="context-menu" class="highlight-chat'+larger+expand+'" data-source-type="'+data.type+'">'
                + '<div class="hl-profile">'
                + showType
                + chatImg
                + timeArrived
                + chatname
                + '</div>'
                + "<div class='queueid'></div>"
                + '<div class="hl-message">'
                + '<span class="hl-content" id="content_'+data.id+'">' + chatmessage + '</span>'
                + '</div>'
                + uiButton
                + addImage
                + donationHTML + '</div>');
        } else {
            var node = createElementFromHTML('<div id="msg_'+data.id+'" '+mid+' data-menu="context-menu" class="highlight-chat'+larger+expand+'" data-source-type="'+data.type+'">'
                + '<div class="hl-profile">'
                + showType
                + chatImg
                + timeArrived
                + chatname
                + '</div>'
                + "<div class='queueid'></div>"

                + '<div class="hl-message hl-content" id="content_'+data.id+'">' + chatmessage + '</div>'
                + uiButton
                + addImage
                + donationHTML + '</div>');
        }

        if (filtering){
            filterMessage(node)
        }

        if (bot && !horizontal){
            node.classList.add("bot");
        }

        if (data.hasDonation){
            if (highlightDonos && !bubble){
                node.classList.add("dono-highlight");
            }
            node.classList.add("donation");
        } else {
            node.classList.add("noDono");
        }

        if (!bubble && highlightMembers && data.hasMembership){
            node.classList.add("member");
        }

        if (!bubble && highlightSpecial && (data.question)){
            node.classList.add("special");
        }

        if (compactmode && darkmode){
            node.classList.add("compactmode");
        } else if (!compactmode){
            node.classList.add("notcompactmode");
        }

        if (random){
            node.classList.add("randommode");
            var r1 = Math.random();
            var r2 = Math.random();
            if (r1>0.5){
                r1 -= 0.5;
                node.style.top = r1*window.innerHeight/scale;
            } else {
                node.style.bottom = r1*window.innerHeight/scale;
            }


            if (r2>0.5){
                r2 -= 0.5;
                node.style.left = r2*window.innerWidth/scale;
            } else {
                node.style.right = r2*window.innerWidth/scale;
            }


            if (!customNodeLimit){
                customNodeLimit = 20;
            }

        }
        // this part is used to filter out emojis, but also calculate the character-length of a message, to know how long to show it for
        // emojis and images are counted with char-length zero-value


        var textContentLength = node.querySelector("#content_"+data.id).innerText.trim().replace(/([\u2580-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/ig, "").length || 0;
        node.dataset.contentLength = textContentLength;
        if (!textContentLength){
            node.classList.add("noText");
        }
        // textContentLength += node.querySelectorAll("#content_"+data.id+" img").length || 0; // must come after noText set, if we want to include images as a character
        node.contentLength = textContentLength;

        transitionType.forEach(classtype=>{
            node.classList.add(classtype);
        });

        mainOutputWindow.appendChild(node);

        var svgs = node.querySelectorAll("svg");
        svgs.forEach(svg=>{
            svg.setAttribute("width","100%");
            svg.setAttribute("height","100%");
            if (!svg.getAttribute("fill") && !svg.innerHTML.includes(" fill=")){
                svg.setAttribute("fill","currentColor");
            }
            svg.dataset.hash = Math.abs(hashCode(svg.innerHTML));
        });

        if (hideNotDonos && node.classList.contains("noDono")){
            node.classList.add("hidden");
        } else if (hideNotQueued && !node.classList.contains("queued")){
            node.classList.add("hidden");
        } else if (hideEmojiOnly && node.classList.contains("noText")){
            node.classList.add("hidden");
        } else {
            var style = window.getComputedStyle(node);
            if ((style.visibility !== "hidden") && (style.display !== "none")){
                if (odd){
                    /*Adding "odd" to highlight-chat*/
                    node.classList.add("odd");
                    if (bubble && largeavatar){
                        node.querySelector(".hl-rightside").classList.add("odd");
                    } else if (bubble){
                        node.querySelector(".hl-message").classList.add("odd");
                    } else {
                        node.classList.add("odd");
                    }

                }
                odd = !odd;
            }
        }

        if (bubble && largeavatar && node.contentLength){
            node.querySelector(".hl-rightside").classList.add("bubble");

            if (highlightDonos && data.hasDonation){
                node.querySelector(".hl-rightside").classList.add("dono-highlight");
            }

            if (highlightMembers && data.hasMembership){
                node.querySelector(".hl-rightside").classList.add("member");
            }

            if (highlightSpecial && data.question){
                node.querySelector(".hl-rightside").classList.add("special");
            }
        } else if (bubble  && node.contentLength){
            node.querySelector(".hl-message").classList.add("bubble");


            if (highlightDonos &&  data.hasDonation){
                node.querySelector(".hl-message").classList.add("dono-highlight");
            }

            if (highlightMembers && data.hasMembership){
                node.querySelector(".hl-message").classList.add("member");
            }

            if (highlightSpecial && data.question){
                node.querySelector(".hl-message").classList.add("special");
            }
        }

        if (data.type && (data.type == "twitch") && avatars && data.chatimg){
            var twitchImage = new Image();
            twitchImage.onload = function (){
                try {
                    document.getElementById('img_'+data.id).src = data.chatimg;
                    document.getElementById('img_'+data.id).classList.remove("invert");
                    document.getElementById('img_'+data.id).classList.remove("fade-in-image");
                    node.querySelector('#img_'+data.id).src = data.chatimg;
                    node.querySelector('#img_'+data.id).classList.remove("invert");
                    node.querySelector('#img_'+data.id).classList.remove("fade-in-image");
                } catch(e){}
            }.bind(data, node);
            twitchImage.src = data.chatimg;
        }

        if (beep){
            playtone();
        }

        if (timeoutDelay){
            setTimeout(function(node){
                node.classList.add("fadeout");
                setTimeout(function(node){
                    nodeRemove(node);
                },499,node);
            },timeoutDelay, node);
        }

        if (horizontal || twoLines){
            // do not shrink the names to fit
        } else if (compactmode){
            var nameEle = node.querySelector(".hl-name"); // we're going to resize long names to be smaller if they are longer than the message's height
            if (nameEle){
                var msgNode = node.querySelector(".hl-message");
                if (msgNode && msgNode.innerText){
                    var ccc =0;
                    while (msgNode.clientHeight < nameEle.clientHeight || nameEle.clientHeight < nameEle.scrollHeight || nameEle.clientWidth < nameEle.scrollWidth){
                        var fontsize = parseInt(window.getComputedStyle(nameEle).fontSize);
                        nameEle.style.fontSize = (fontsize-1)+"px";
                        ccc+=1;
                        if (ccc>8){break;}
                    }
                } else {
                    var ccc =0;
                    while (msgNode.clientHeight < nameEle.clientHeight || nameEle.clientWidth < nameEle.scrollWidth || nameEle.clientHeight < nameEle.scrollHeight){
                        var fontsize = parseInt(window.getComputedStyle(nameEle).fontSize);
                        nameEle.style.fontSize = (fontsize-1)+"px";
                        ccc+=1;
                        if (ccc>8){break;}
                    }
                }
            }
        } else {
            var nameEle = node.querySelector(".hl-name"); // we're going to resize long un-breaking names to be smaller if they don't fit
            if (nameEle){
                var ccc =0;
                while (nameEle.clientWidth < nameEle.scrollWidth || nameEle.clientHeight < nameEle.scrollHeight){
                    var fontsize = parseInt(window.getComputedStyle(nameEle).fontSize);
                    nameEle.style.fontSize = (fontsize-1)+"px";
                    ccc+=1;
                    if (ccc>8){break;}
                }
            }
        }

        node.rawContents = data;

        if (autoshow && !bot){
            if (!autoshowdonos || (autoshowdonos && data.hasDonation)){ // dono or not to dono.
                if (autoTimeoutEnabled){
                    autoShowQueue.push(node);
                    checkAutoShow();
                } else {
                    selectedMessage(false, node);
                }
            }
        }

        node.onmousedown = selectedMessage;
        node.title = "Click to feature message instantly. CTRL + Click to add to the queue. Alt + Click to Pin.";

        var imageElements = node.getElementsByTagName("img");
        for (i = 0; i < imageElements.length; i++) {

            if (imageElements[i].onerror){continue;}
            if (!imageElements[i].title && imageElements[i].alt){
                imageElements[i].title = imageElements[i].alt;
            }
            if (darkmode && (node.rawContents.type == "twitch") && imageElements[i].src.includes("/light/")){
                imageElements[i].srcBackup = imageElements[i].src;
                imageElements[i].src = imageElements[i].src.replaceAll("/light/","/dark/");
            }
            imageElements[i].onerror = function(){
                if (this.srcBackup){
                    this.src = this.srcBackup;
                    this.srcBackup = null;
                    delete this.srcBackup;
                } else if (this.alt.length!==2){
                    this.style.display='none';
                } else {
                    this.outerHTML = this.alt;
                }
            }
        }

        removeNode();

        applyBotActions(data); // Official actions

        if (speech && !bot){
            if (!node.classList.contains("hide")){
                speechMeta(data);
            }
        }
        return node;
    }
    return false;
}

if (alignbottom){
    const ro = new MutationObserver(mutations => {
        if (reversed && !forceAutoscroll){

        } else {
            if ((getById("output").scrollHeight<(getById("output").scrollTop + getById("output").clientHeight+autoScrollCatch)) || forceAutoscroll){
                if (scrolltype=="instant"){
                    getById("output").scrollTop = getById("output").scrollHeight;
                } else {
                    getById("output").scrollTo({
                        top: getById("output").scrollHeight,
                        left: 0,
                        behavior:scrolltype
                    });
                }
            }
        }
    });
    ro.observe(getById("output"), {childList: true,attributes: false, subtree: false,});
} else {
    const ro = new ResizeObserver(entries => {
        if (reversed && !forceAutoscroll){

        } else {
            if ((document.body.scrollHeight<(document.body.scrollTop + document.body.clientHeight+autoScrollCatch)) || forceAutoscroll){
                if (scrolltype=="instant"){
                    document.scrollingElement.scrollTop = document.scrollingElement.scrollHeight;
                } else {
                    document.scrollingElement.scrollTo({
                        top: document.scrollingElement.scrollHeight,
                        left: 0,
                        behavior:scrolltype
                    });
                }
            }
        }
    });
    ro.observe(document.scrollingElement);
}

function speechMeta(data, allow=false){

    if (skipTTSMessages && !data.hasDonation){
        if (parseInt(data.id) % skipTTSMessages !== 0){
            return;
        }
    }
    var isCommand = false;
    var msgPlain = document.getElementById('content_'+data.id); // text only
    if (msgPlain){
        msgPlain = msgPlain.textContent || msgPlain.innerText || "";
        msgPlain = msgPlain.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
        msgPlain = msgPlain.replaceAll('_', ' ');
        msgPlain = msgPlain.replaceAll('@', ' ');

        if (msgPlain.startsWith("!")){
            return; // do not say anything if a command
        }

        msgPlain = msgPlain.replaceAll('!', ' ');
        msgPlain = msgPlain.replace(/catJAM/ig,"");
    }

    var chatname = "";
    if (ttsSpeakChatname && data.chatname){
        chatname = data.chatname.toLowerCase().replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
        chatname = chatname.replaceAll('_', ' ');
        chatname = chatname.replaceAll('@', ' ');
        chatname = chatname.replaceAll('!', ' ');
    }

    if (data.hasDonation){

        var donoText = document.createElement("div");
        donoText.innerHTML = data.hasDonation;
        donoText = donoText.textContent || donoText.innerText || "";
        donoText = donoText.toLowerCase().replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
        donoText = donoText.replaceAll('_', ' ');
        donoText = donoText.replaceAll('@', ' ');
        donoText = donoText.replaceAll('!', ' ');

        if (chatname){  ///// NAME
            if (English){
                if (msgPlain){
                    speak(chatname + " has donated " + donoText + " and says "+ msgPlain, allow);
                } else {
                    speak(chatname + " has donated " + donoText, allow);
                }
            } else if (msgPlain){
                speak(chatname + "! ! .. " + donoText + "! ! .. "+ msgPlain, allow);
            } else {
                speak(chatname + "! ! .. " + donoText, allow);
            }
        } else if (English){ // no name but english
            if (msgPlain){
                speak("Someone has donated " + donoText + " and says "+ msgPlain, allow);
            } else {
                speak("Someone has donated " + donoText, allow);
            }
        } else if (msgPlain){ // no name; not english
            speak(donoText + "! ! .. "+ msgPlain , allow);
        } else {
            speak(donoText, allow);
        }
    } else if (msgPlain){ // NO DONATION
        if (chatname){ // NAME
            if (English){
                speak(chatname + " says! " +msgPlain, allow);
            } else {
                speak(chatname + "! ! .. " +msgPlain, allow);
            }
        } else if (English){ // NO NAME
            speak("Someone says! " +msgPlain, allow);
        } else {
            speak(msgPlain, allow);
        }
    }
}

function applyBotActions(data){ // this can be customized to create bot-like auto-responses/actions.
    if (triggerState && data.chatmessage.includes("!highlight")){
        document.getElementById("msg_"+data.id).classList.add("highlight"); // sample method of highlighting
    }

    if (passTTS && data.chatmessage.includes("!pass")){
        if (window.speechSynthesis.pending || window.speechSynthesis.speaking){
            window.speechSynthesis.cancel();
        }
    }
}

function syncDockAll(UUID){
    if (blockMessageSelecting || blockMessageSelecting2){
        return;
    }

    var pins = [];
    document.querySelectorAll(".pinned[data-mid]").forEach(ele=>{
        pins.push(ele.rawContents);
    });
    syncDataP2P({pin:pins}, UUID);
    syncQueueP2P(UUID);
}

function syncQueueP2P(UUID=false, newele=false){
    if (blockMessageSelecting || blockMessageSelecting2){
        return;
    }

    var data = [];
    if (UUID){
        if (selectedQueue.length){
            selectedQueue.forEach(ele=>{
                data.push(ele.rawContents);
            });
            syncDataP2P({queueInit:data}, UUID);
        }
    } else {
        selectedQueue.forEach(ele=>{
            if (newele && (newele.rawContents.id === ele.rawContents.id)){
                data.push(ele.rawContents);
            } else {
                data.push(ele.rawContents.id);
            }
        });
        syncDataP2P({queue:data});
    }
}

function send2Extension(data, uid=null){
    if (blockMessageSelecting || blockMessageSelecting3){
        return;
    }

    if (socketserverExtension){
        try{
            socketserverExtension.send(JSON.stringify(data));
            return;
        } catch(e){ // if failed, try p2p
            console.error(e);
        }
    }


    if (iframe){
        if (!uid){
            var keys = Object.keys(connectedPeers);
            for (var i = 0; i<keys.length;i++){
                var UUID = keys[i];
                var label = connectedPeers[UUID];
                if (label === "SocialStream"){
                    iframe.contentWindow.postMessage({"sendData":{overlayNinja:data}, "type":"rpcs", "UUID":UUID}, '*');
                }
            }
        } else {
            var label = connectedPeers[uid];
            if (label === "SocialStream"){
                iframe.contentWindow.postMessage({"sendData":{overlayNinja:data}, "type":"rpcs", "UUID":uid}, '*');
            }
        }
    }
}

function syncDataP2P(data, UUID=false, force=false){
    if (blockMessageSelecting || blockMessageSelecting2){
        return;
    }

    if (iframe && (syncDocks||force)){
        if (UUID){
            iframe.contentWindow.postMessage({"sendData":{overlayNinja:data}, "type":"pcs", "UUID":UUID}, '*');
        } else {
            var keys = Object.keys(connectedPeers);
            for (var i = 0; i<keys.length;i++){
                var UUID = keys[i];
                var label = connectedPeers[keys[i]];
                if (label === "dock"){
                    iframe.contentWindow.postMessage({"sendData":{overlayNinja:data}, "type":"pcs", "UUID":UUID}, '*');
                }
            }
        }
    }
}

function sendDataP2P(data){
    if (blockMessageSelecting || blockMessageSelecting2 || blockMessageSelecting3){
        return;
    }

    if (!data){
        document.querySelectorAll(".last-message").forEach(ele=>{ // last message sent was to clear the overlay
            ele.classList.remove("last-message"); // no overlay is now active.
        });
    }
    try {
        if (socketserver){ // send a copy to the remote API
            socketserver.send(JSON.stringify(data));
        }
        if (iframe){
            var msg = {};
            msg.overlayNinja = {};
            msg.overlayNinja = data;
            if (syncDocks){
                var keys = Object.keys(connectedPeers);
                for (var i = 0; i<keys.length;i++){
                    var UUID = keys[i];
                    var label = connectedPeers[keys[i]];
                    if (label === "dock"){
                        if (data && data.id){
                            iframe.contentWindow.postMessage({"sendData":{overlayNinja:{mid:data.id}}, "type":"pcs", "UUID":UUID}, '*');
                        } else {
                            iframe.contentWindow.postMessage({"sendData":{overlayNinja:{mid:false}}, "type":"pcs", "UUID":UUID}, '*');
                        }
                    } else if (label === "overlay"){
                        iframe.contentWindow.postMessage({"sendData":msg, "type":"pcs", "UUID":UUID}, '*'); // send only to viewers of this stream; not back to the chrome extension..
                    } else if (label === false){
                        iframe.contentWindow.postMessage({"sendData":msg, "type":"pcs", "UUID":UUID}, '*'); // send only to viewers of this stream; not back to the chrome extension..
                    }
                }
            } else {
                var keys = Object.keys(connectedPeers);
                for (var i = 0; i<keys.length;i++){
                    var UUID = keys[i];
                    var label = connectedPeers[keys[i]];
                    if (label !== "dock"){
                        iframe.contentWindow.postMessage({"sendData":msg, "type":"pcs", "UUID":UUID}, '*'); // send only to viewers of this stream; not back to the chrome extension.. legacy?
                    }
                }
            }
        }
    } catch(e){
        console.error(e);
    }
}





function respondP2P(data=null, tid=false){
    if (blockMessageSelecting){
        return;
    }

    if (data===null){
        data = prompt("Enter something to say to all of chat");
    }
    if (!data){return;}
    data = data.trim();
    if (!data){return;}
    var msg = {};
    msg.overlayNinja = {};
    msg.overlayNinja.tid = tid;
    msg.overlayNinja.response = data;
    iframe.contentWindow.postMessage({"sendData":msg, "type": "rpcs"}, '*'); // send only to 'viewers' of this stream
}

function setupSaveToDisk(){
    var script = document.createElement('script');
    script.onload = function() {

        if (!fileStream) {
            fileStream = streamSaver.createWriteStream("chat_"+Date.now()+'.tsv' || 'sample.txt');
            writer = fileStream.getWriter();
        }

        window.isSecureContext && window.addEventListener('beforeunload', evt => {
            writer.close();
        })
    }
    script.src = "./thirdparty/StreamSaver.js";
    document.head.appendChild(script);
}


async function overwriteFile(data=false) {
    if (data=="setup"){
        newFileHandle = await window.showSaveFilePicker();
    } else if (newFileHandle && data){
        const writableStream = await newFileHandle.createWritable();

        try {
            if (typeof data == "object"){
                data.chatimg = upscaleImages(data);
                overwriteFile(JSON.stringify(data));
            }
        } catch(e){}

        await writableStream.write(data);
        await writableStream.close();
    }
}

function getPosition(event) {
    var posx = 0;
    var posy = 0;

    if (event.pageX || event.pageY){
        posx = event.pageX;
        posy = event.pageY;
    } else if (event.clientX || event.clientY) {
        posx = event.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        posy = event.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }

    return {x: posx, y: posy};
}

if (!blockMessageSelecting || blockMessageSelecting2){
    (function rightclickmenuthing() { // right click menu
        "use strict";

        var taskItemInContext;
        var clickCoordsX;
        var clickCoordsY;
        var menu = getById("context-menu");
        var menuState = 0;
        var lastMenu= false;
        var menuWidth;
        var menuHeight;
        var windowWidth;
        var windowHeight;

        function clickInsideElement(e, value="menu") {
            var el = e.srcElement || e.target;
            if (el.dataset && (value in el.dataset)) {
                return el;
            } else {
                while (el = el.parentNode) {
                    if (el.dataset && (value in el.dataset)) {
                        return el;
                    }
                }
            }
            return false;
        }

        function contextListener() {
            document.addEventListener("contextmenu", function(e) {

                if (navigator.userAgent.toLowerCase().indexOf(' electron/') > -1){
                    return;
                } else if (e && (e.ctrlKey || e.metaKey)){return;} // allow for development ease

                taskItemInContext = clickInsideElement(e, "menu");

                if (taskItemInContext) {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleMenuOn();
                    positionMenu(e);
                    return false;
                } else {
                    taskItemInContext = null;
                    toggleMenuOff();
                }
            });
        }

        function menuClickListener(e) {
            var clickeElIsLink = clickInsideElement(e, "action");
            if (clickeElIsLink) {
                e.preventDefault();
                e.stopPropagation();
                menuItemListener(clickeElIsLink);
                return false;
            } else {
                var button = e.which || e.button;
                if (button === 1) {
                    toggleMenuOff();
                }
            }
        }

        function toggleMenuOn() {
            if (menuState !== 1) {
                menuState = 1;
                menu.classList.add("context-menu--active");
                document.addEventListener("click", menuClickListener);
            }
        }

        function toggleMenuOff() {
            if (menuState !== 0) {
                menuState = 0;
                menu.classList.remove("context-menu--active");
                document.removeEventListener("click", menuClickListener);
            }
            lastMenu = false;
        }

        function positionMenu(e) {
            var clickCoords = getPosition(e);
            clickCoordsX = clickCoords.x;
            clickCoordsY = clickCoords.y;

            menuWidth = menu.offsetWidth + 4;
            menuHeight = menu.offsetHeight + 4;

            windowWidth = window.innerWidth;
            windowHeight = window.innerHeight;

            if ((windowWidth - clickCoordsX) < menuWidth) {
                menu.style.left = windowWidth - menuWidth + "px";
            } else {
                menu.style.left = clickCoordsX + "px";
            }
            menu.style.top = "unset";
            var offset = ((document.body.scrollHeight-clickCoordsY)-menuHeight);
            if (offset<-10){
                offset = -10;
            }
            menu.style.bottom =offset + "px";
        }

        async function menuItemListener(link) {
            if (link.getAttribute("data-action") === "Delete") {
                deleteMessage(taskItemInContext);
            } else if (link.getAttribute("data-action") === "Pin") {
                if (taskItemInContext.classList.contains("pinned")){
                    unpinIt(taskItemInContext);
                    syncDataP2P({unpin:[taskItemInContext.dataset.mid]});
                } else {
                    pinIt(taskItemInContext);
                    syncDataP2P({pin:[taskItemInContext.rawContents]});
                }
            } else if (link.getAttribute("data-action") === "TTS") {
                speechMeta(taskItemInContext.rawContents, true);
            } else if (link.getAttribute("data-action") === "Queue") {
                if (taskItemInContext.classList.contains("queued")){
                    removeQueue(taskItemInContext);
                } else {

                    if (taskItemInContext.classList.contains("queued")){
                        removeQueue(taskItemInContext);
                        syncQueueP2P();
                        return;
                    }
                    selectedQueue.push(taskItemInContext);
                    taskItemInContext.children[0].dataset.qid = selectedQueue.length;
                    taskItemInContext.classList.add("queued");
                    updateQueueButton();
                    syncQueueP2P(false, taskItemInContext);
                }
            }
            toggleMenuOff();
        }

        contextListener();
    })();
}

function isEscape(evt) {
    _evt = evt || window.event;
    return "key" in _evt ? (_evt.key === "Escape" || _evt.key === "Esc") : _evt.keyCode === 27;
}

document.onkeydown = function(evt) {
    if (isEscape(evt)) {
        getById("chatInput_parent").classList.add("hidden");
        getById("filter_messages_parent").classList.add("hidden");
    }
};

document.getElementById("filter_messages").addEventListener('keyup', function(e) {
    filterMessages(document.getElementById("filter_messages").value);
});

(function userFilterInputModalBox() { // filter
    var menu = getById("filter_messages_parent");
    var input = getById("filter_messages");
    var filterClearButton = getById("filterClearButton");
    var filterCloseButton = getById("filterCloseButton");
    menu.style.top = "unset";
    menu.style.bottom = "5px";

    function positionMenu(e) {
        var rect = getById("filter").getBoundingClientRect();
        menu.style.left = rect.right + "px";
        menu.style.top = "unset";
        menu.style.bottom = "5px";
    }

    var lastWidth =  window.innerWidth;
    window.addEventListener("resize",function(event){
        var rect = getById("filter").getBoundingClientRect();
        menu.style.left = rect.right + "px";
    });

    function toggleInput(event){
        event.preventDefault();
        event.stopPropagation();
        positionMenu(event);
        menu.classList.toggle("hidden");
        input.focus();
        return false;
    }

    input.addEventListener("blur", function(event){
        if (menu.matches(':focus-within:not(:focus)') || menu.matches(':focus-within')){ // if a sibling has focus, don't close and retake focus
            input.focus(); // re-refocus text input.
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        getById("filter").removeEventListener("click", toggleInput);
        menu.classList.add("hidden");
        setTimeout(function(){ // click vs hold
            getById("filter").addEventListener("click", toggleInput);
        },300)
        return false;
    });

    filterClearButton.addEventListener("click", function(event) {
        input.value = "";
        filterMessages(input.value);
    })

    filterCloseButton.addEventListener("click", function(event){
        event.preventDefault();
        event.stopPropagation();
        menu.classList.add("hidden");
        return false;
    });

    getById("filter").addEventListener("click", toggleInput);

})();




(function userChatInputModalBox() { // chat input
    var menu = getById("chatInput_parent");
    var input = getById("chatInput");
    var chatInputButton = getById("chatInputButton");
    var chatClearButton = getById("chatClearButton")
    var chatInputCloseButton = getById("chatInputCloseButton");

    menu.style.top = "unset";
    menu.style.bottom = "5px";

    function positionMenu(e) {
        var rect = getById("say_hello").getBoundingClientRect();
        menu.style.left = rect.right + "px";
        menu.style.top = "unset";
        menu.style.bottom = "5px";
    }

    var lastWidth =  window.innerWidth;
    window.addEventListener("resize",function(event){
        var rect = getById("say_hello").getBoundingClientRect();
        menu.style.left = rect.right + "px";
    });

    function toggleInput(event){
        event.preventDefault();
        event.stopPropagation();
        positionMenu(event);
        menu.classList.toggle("hidden");
        input.focus();
        return false;
    }

    function sendMessage(event) {
        event.preventDefault();
        if (input.value){
            respondP2P(input.value);
        }
        input.value = "";
    }

    input.addEventListener("keyup", function(event) {
        if (event.keyCode === 13) { // Enter
            sendMessage(event);
        }
    })

    input.addEventListener("blur", function(event){
        if (menu.matches(':focus-within:not(:focus)') || menu.matches(':focus-within')){ // if a sibling has focus, don't close and retake focus
            input.focus(); // re-refocus text input.
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        getById("say_hello").removeEventListener("click", toggleInput);
        menu.classList.add("hidden");
        setTimeout(function(){ // click vs hold
            getById("say_hello").addEventListener("click", toggleInput);
        },300)
        return false;
    });

    chatInputButton.addEventListener("click", function(event) {
        sendMessage(event);
    })

    chatClearButton.addEventListener("click", function(event) {
        input.value = "";
    })

    chatInputCloseButton.addEventListener("click", function(event){
        event.preventDefault();
        event.stopPropagation();
        menu.classList.add("hidden");
        return false;
    });

    getById("say_hello").addEventListener("click", toggleInput);

})();


if (urlParams.has('js')){  // ie: &js=https%3A%2F%2Fvdo.ninja%2Fexamples%2Ftestjs.js
    console.warn("Third-party Javascript has been injected into the code. Security cannot be ensured.");
    var jsURL = urlParams.get('js');
    jsURL = decodeURI(jsURL);
    console.log(jsURL);
    // type="text/javascript" crossorigin="anonymous"
    var externalJavaascript = document.createElement('script');
    externalJavaascript.type = 'text/javascript';
    externalJavaascript.crossorigin = 'anonymous';
    externalJavaascript.src = jsURL;
    externalJavaascript.onerror = function() {
        console.warn("Third-party Javascript failed to load");
    };
    externalJavaascript.onload = function() {
        console.log("Third-party Javascript loaded");
    };
    document.head.appendChild(externalJavaascript);
}

if (urlParams.has("reload")){
    try {

        setTimeout(function(){
            var reload = getStorage("savedMessages");
            if (reload){
                reload = JSON.parse(reload);
                for (var i = 0 ; i<reload.length; i++){
                    processData(  {contents : reload[i]} , true);
                }
                console.log("PAGE REFRESHED");
            }
        },0);

        reload=null;
        window.addEventListener("beforeunload", (event) => {
            reload = [];
            document.querySelectorAll("[data-mid]").forEach(ele=>{
                reload.push(ele.rawContents);
            });
            reload = reload.slice(-40);
            queue = queue.slice(-10);
            reload = reload.concat(queue);
            setStorage("savedMessages", JSON.stringify(reload));
        });
    } catch(e){}
}