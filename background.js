chrome.action.onClicked.addListener((tab) => {
   chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
       const currentTab = tabs[0];
       chrome.scripting.executeScript({
           target: {tabId: tab.id},
           func: injectScript
       });
   }); 
});


function injectScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('content.js');
    script.onload = function() {
        this.remove();
    };  
    (document.head || document.documentElement).appendChild(script);
}

