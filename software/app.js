if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("sw.js")
    .then(() => console.log("Service Worker registered"));
}

function updateApp() {
  if (!navigator.serviceWorker.controller) {
    console.log("Service worker installing or activating…");
    navigator.serviceWorker.ready.then(() => {
      console.log("Service worker ready, retrying update");
      updateApp();
    });
    return;
  }

  console.log("Updating SkyWalk App");
  navigator.serviceWorker.controller.postMessage({ action: "update" });
}

navigator.serviceWorker.addEventListener("controllerchange", () => {
  console.log("New version activated");
  alert("New SkyWalk version available. Reload or refresh screen to update.");
});

const updateBtn = document.getElementById("updateBtn");
navigator.serviceWorker.ready.then(() => {
  updateBtn.disabled = false;
});
