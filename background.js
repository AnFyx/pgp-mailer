chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "KEY_STORE_ACTION") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;

      chrome.tabs.sendMessage(tabs[0].id, message, sendResponse);
    });

    return true;
  }
});
