/* --- PUBLIC API --- */
function animateControls(prefix) {
  console.log(`> func: animateControls(${prefix})`);

  const wrapper = document.querySelector(`.controls-wrapper[data-prefix="${prefix}"]`);

  if (!wrapper) {
    console.warn(`> Controls wrapper missing for ${prefix}`);
    return;
  }

  // Prevent duplicates
  if (wrapper.querySelector(".animation-controls")) return;

  const controls = document.createElement("div");
  controls.className = "animation-controls";
  controls.style.cssText = `
    position: absolute;
    top: 6px;
    right: 6px;
    display: flex;
    gap: 4px;
    z-index: 50;
    pointer-events: auto;
  `;

  const startBtn = document.createElement("button");
  startBtn.id = `${prefix}_ANIMATION_START`;
  startBtn.textContent = "▶️";
  startBtn.title = "Start animation";
  startBtn.style.cssText = `
    background: rgba(0,0,0,0.4);
    border: none;
    border-radius: 4px;
    color: white;
    width: 30px;
    height: 26px;
    cursor: pointer;
  `;

  const stopBtn = document.createElement("button");
  stopBtn.id = `${prefix}_ANIMATION_STOP`;
  stopBtn.textContent = "⏸️";
  stopBtn.title = "Stop animation";
  stopBtn.style.cssText = startBtn.style.cssText;

  controls.append(startBtn, stopBtn);
  wrapper.appendChild(controls);
}

window.animateControls = animateControls;

// /* --- PUBLIC API --- */
// function animateControls(prefix, process = "start") {
//   console.log(`> func: animateControls(${prefix})`);

//   // Wrapper around the canvas (NOT the canvas itself)
//   const wrapper = document.querySelector(`.controls-canvas[data-prefix="${prefix}"]`);

//   const img = document.getElementById(`${prefix}_image_cache`);

//   if (!wrapper || !img) {
//     console.warn(`   > Controls setup missing for ${prefix}`);
//     return;
//   }

//   // Prevent duplicates
//   if (wrapper.querySelector(".animation-controls")) return;

//   // Ensure wrapper can position children
//   wrapper.style.position = "relative";

//   const controls = document.createElement("div");
//   controls.className = "animation-controls";
//   controls.style.cssText = `
//     position: absolute;
//     top: 4px;
//     right: 4px;
//     display: flex;
//     align-items: center;
//     gap: 4px;
//     z-index: 10;
//     pointer-events: auto;
//   `;

//   const startBtn = document.createElement("button");
//   startBtn.id = `${prefix}_ANIMATION_START`;
//   startBtn.title = "Start the METAR Animation";
//   startBtn.textContent = "▶️";
//   startBtn.style.cssText = `
//     background: transparent;
//     border: none;
//     color: #666;
//     width: 30px;
//     height: 24px;
//     cursor: pointer;
//   `;

//   const stopBtn = document.createElement("button");
//   stopBtn.id = `${prefix}_ANIMATION_STOP`;
//   stopBtn.title = "Stop the METAR Animation";
//   stopBtn.textContent = "⏸️";
//   stopBtn.style.cssText = startBtn.style.cssText;

//   controls.appendChild(startBtn);
//   controls.appendChild(stopBtn);

//   wrapper.appendChild(controls);
// }

// // Make globally accessible
// window.animateControls = animateControls;
