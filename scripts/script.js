import { Settings } from "./settings.js";
import { App } from "./app.js";
import { MinHeap } from "./minHeap.js";
import { MODE } from "./constants.js";

const settings = new Settings();
const app = new App(settings);
settings.setApp(app);

app.initialize();

document.querySelectorAll(".dropdown").forEach(dropdown => {

    const btn = dropdown.querySelector("#dropdownBtn");
    const menu = dropdown.querySelector(".dropdown-menu");
    const items = dropdown.querySelectorAll(".dropdown-item");

    btn.addEventListener("click", () => {
        menu.classList.toggle("show");
    });

    items.forEach(item => {
        item.addEventListener("click", () => {
            const value = item.dataset.value;
            const action = dropdown.dataset.action;
            btn.textContent = item.textContent + " ▼";
            menu.classList.remove("show");
            handleSelection(action, value);
        });
    });
});
document.addEventListener("click", (e) => {
    if (!e.target.closest(".dropdown")) {
        document.querySelectorAll(".dropdown-menu")
            .forEach(menu => menu.classList.remove("show"));
    }
});

document.querySelectorAll('.slider-control').forEach(slider => {
    slider.addEventListener('input', handleSliderChange);
    handleSliderChange({ target: slider });
});

// Handle replanning toggle
const replanningToggle = document.getElementById('replanning-toggle');
if (replanningToggle) {
    replanningToggle.addEventListener('change', (e) => {
        settings.setEnableReplanning(e.target.checked);
    });
}

// Handle slider input changes for settings (delay, grid size, density)
function handleSliderChange(e) {
    const slider = e.target;
    if (slider.disabled) return;
    const action = slider.dataset.action;
    const value = slider.value;

    const valueDisplay = document.querySelector('.slider-value[data-action="' + action + '"]');
    if (valueDisplay) {
        valueDisplay.textContent = action === "step-delay" ? value + " ms" : value;
    }

    if (action === "step-delay") {
        settings.setStepDelay(Number(value));
    } else if (action === "grid-size" && app.stopped) {
        settings.setSize(Number(value));
    } else if (action === "obstacle-density" && app.stopped) {
        settings.setObstacleDensity(parseFloat(value));
    }
}

// Route dropdown selections to appropriate settings methods
function handleSelection(action, value) {

    if (action === "algorithm") {
        settings.setAlgorithm(value);
    }

    if (action === "heuristic") {
        settings.setHeuristic(value);
    }
}

document.getElementById("select-start-btn").addEventListener("click", () => {
    settings.setMode(MODE.SELECTSTART);
})
document.getElementById("select-goal-btn").addEventListener("click", () => {
    settings.setMode(MODE.SELECTGOAL);
})


// Start or resume algorithm execution
function run() {
    app.startLog();
    const runButton = document.querySelector('button.btn-safe[value="run"]');
    const pauseButton = document.querySelector('button.btn-danger[value="pause"]');
    const gridSizeSlider = document.querySelector('input[type="range"][data-action="grid-size"]');
    const obstacleDensitySlider = document.querySelector('input[type="range"][data-action="obstacle-density"]');
    const replanningToggle = document.getElementById("replanning-toggle");

    
    if (app.paused) {
        app.paused = false;
        runButton.textContent = "Run";
        runButton.disabled = true;
        pauseButton.disabled = false;
    } else {
        app.stopped = false;
        runButton.textContent = "Resume";
        runButton.disabled = true;
        pauseButton.disabled = false;
        gridSizeSlider.disabled = true;
        obstacleDensitySlider.disabled = true;
        if (replanningToggle) replanningToggle.disabled = true;
        app.startLog();
        app.run().then(() => {
            runButton.textContent = "Run";
            runButton.disabled = false;
            pauseButton.disabled = true;
            if (replanningToggle) replanningToggle.disabled = false;
            gridSizeSlider.disabled = false;
            obstacleDensitySlider.disabled = false;
        });
    }
}

// Pause algorithm execution
function pauseAlgorithm() {
    const runButton = document.querySelector('button.btn-safe[value="run"]');
    const pauseButton = document.querySelector('button.btn-danger[value="pause"]');
    runButton.textContent = "Resume";
    runButton.disabled = false;
    pauseButton.disabled = true;
    app.paused = true;
}


// Clear grid visualization while keeping algorithm selected
function clearGrid() {
    app.stopped = true;
    app.paused = false;
    app.controller.abort();
    app.controller = new AbortController();
    app.clearGrid();
    app.initializeVisitedHistory();
    app.endLog();
    const runButton = document.querySelector('button.btn-safe[value="run"]');
    const pauseButton = document.querySelector('button.btn-danger[value="pause"]');
    const gridSizeSlider = document.querySelector('input[type="range"][data-action="grid-size"]');
    const obstacleDensitySlider = document.querySelector('input[type="range"][data-action="obstacle-density"]');
    runButton.textContent = "Run";
    runButton.disabled = false;
    pauseButton.disabled = true;
    gridSizeSlider.disabled = false;
    obstacleDensitySlider.disabled = false;
}

// Reset to initial state with fresh grid and obstacles
function reset() {
    const runButton = document.querySelector('button.btn-safe[value="run"]');
    const pauseButton = document.querySelector('button.btn-danger[value="pause"]');
    const gridSizeSlider = document.querySelector('input[type="range"][data-action="grid-size"]');
    const obstacleDensitySlider = document.querySelector('input[type="range"][data-action="obstacle-density"]');
    app.stop();
    app.reset();
    runButton.textContent = "Run";
    runButton.disabled = false;
    pauseButton.disabled = true;
    gridSizeSlider.disabled = false;
    obstacleDensitySlider.disabled = false;
}

// Make functions available globally for onclick handlers
window.run = run;
window.pauseAlgorithm = pauseAlgorithm;
window.clearGrid = clearGrid;
window.reset = reset;
