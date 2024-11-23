/*
Share by Mourad Mokrane from Noun Project (CC BY 3.0)
https://thenounproject.com/icon/share-23580/
*/

chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const currentTab = tabs[0];
        const currentUrl = currentTab.url; // Get the URL of the active tab
        const currentTitle = currentTab.title; // Get the title of the active tab
     
        // Perform an action with the current URL (e.g., log it or open a new tab)
        console.log("Current page URL:", currentUrl);
  
        // Example: Open a new tab with the BlueSky compose page and pass the current URL as a query parameter
        chrome.tabs.create({ url: `https://bsky.app/intent/compose?text=${encodeURIComponent(currentTitle)}%20${encodeURIComponent(currentUrl)}` });
      } else {
        console.log("No active tab found.");
      }
    });
  });