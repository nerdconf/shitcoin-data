// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchTokenInsights") {
      fetch(request.url)
        .then(response => response.json())
        .then(data => sendResponse({ success: true, data }))
        .catch(error => sendResponse({ success: false, error: error.toString() }));
        console.log("background.js: fetchTokenInsights");
      return true; // Indica respuesta asíncrona
    }
  });
  