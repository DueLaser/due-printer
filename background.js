// Open a window when launched.
chrome.app.runtime.onLaunched.addListener(function() { 
  chrome.app.window.create('main.html', {
    bounds: {
      width: 1024,
      height: 840,
    },
    minWidth: 1024,
    minHeight: 840,
  });
});

// TODO: cleanup?
chrome.runtime.onSuspend.addListener(function() { 
});
