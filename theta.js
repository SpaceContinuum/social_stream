(function () {
	try {
	function toDataURL(blobUrl, callback) {
		var xhr = new XMLHttpRequest;
		xhr.responseType = 'blob';

		xhr.onload = function() {
		   var recoveredBlob = xhr.response;

		   var reader = new FileReader;

		   reader.onload = function() {
			 callback(reader.result);
		   };

		   reader.readAsDataURL(recoveredBlob);
		};

		xhr.open('GET', blobUrl);
		xhr.send();
	};

	console.log("social stream injected");
	
	function processMessage(ele){
		
		if (ele.marked){return;}
		ele.marked = true;
		
		var chatimg = "";
		try{
			chatimg = ele.querySelector('.g-avatar>.thumbnail').style.backgroundImage.split('"')[1];
		} catch(e){
			
		}
		
        var name = "";
		try {
			name = ele.querySelector(".username").innerText;
		} catch(e){}
		

		var msg = "";
		try {
			msg = ele.querySelector(".message");
			if (msg){
				var nodes = msg.childNodes;
				msg = "";
				for (var i = 0 ;i<nodes.length;i++){
					if (nodes[i].nodeName === "#text") {
						msg += nodes[i].textContent;
					} else {
						nodes[i].querySelectorAll("img[src]").forEach(ee=>{
							msg += "<img src='"+ee.src+"' />";
						});
					}
				}
			}
			
		} catch(e){}
		
		if (msg){
			msg = msg.trim();
		}
		
		if (!msg){return;}

		var data = {};
		data.chatname = name;
		data.chatbadges = "";
		data.backgroundColor = "";
		data.textColor = "";
		data.chatmessage = msg;
		data.chatimg = chatimg;
		data.hasDonation = "";
		data.hasMembership = "";;
		data.contentimg = "";
		data.type = "theta";

		pushMessage(data);
	}

	function pushMessage(data){
		try{
			chrome.runtime.sendMessage(chrome.runtime.id, { "message": data }, function(){});
		} catch(e){}
	}
	var listener = false;
	
	function startListener(){
		if (listener){return;}
		listener = true;
		chrome.runtime.onMessage.addListener(
			function (request, sender, sendResponse) {
				try{
					if ("focusChat" == request){
						try {
							var ele = document.querySelector("textbox") || document.querySelector("input[type='text']");
							if (ele){
								ele.focus();
								sendResponse(true);
								return;
							} 
						} catch(e){}
						
						sendResponse(false);
						return;
					}
					if ("textOnlyMode" == request){
						textOnlyMode = true;
						sendResponse(true);
						return;
					} else if ("richTextMode" == request){
						textOnlyMode = false;
						sendResponse(true);
						return;
					}
				} catch(e){}
				sendResponse(false);
			}
		);
	}
	
	var textOnlyMode = false;
	chrome.runtime.sendMessage(chrome.runtime.id, { "getSettings": true }, function(response){  // {"state":isExtensionOn,"streamID":channel, "settings":settings}
		if ("settings" in response){
			if ("textonlymode" in response.settings){
				textOnlyMode = response.settings.textonlymode;
			}
		}
	});

	function onElementInserted(target, callback) {
		var onMutationsObserved = function(mutations) {
			mutations.forEach(function(mutation) {
				if (mutation.addedNodes.length) {
					for (var i = 0, len = mutation.addedNodes.length; i < len; i++) {
						try {
							if (mutation.addedNodes[i].classList.contains("g-chat-message")){
								callback(mutation.addedNodes[i]);
							}
						} catch(e){}
					}
				}
			});
		};
		if (!target){return;}
		var config = { childList: true, subtree: true };
		var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
		var observer = new MutationObserver(onMutationsObserved);
		observer.observe(target, config);
	}

	setTimeout(function(ele){onElementInserted(ele, processMessage);},1000, document.querySelector('.chat-popout'));
		
	startListener();
	
	} catch(e){
	}
})();