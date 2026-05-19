import { ALGORITHM, ALGORITHM_INFO, ALGORITHM_MAP, HEURISTIC, HEURISTIC_INFO, HEURISTIC_MAP, MODE } from "./constants.js";

export class Settings {
    constructor() {
        this.mode = MODE.IDLE;
        this.algorithm = ALGORITHM.DFS;
        this.heuristic = HEURISTIC.MANHATTAN;
        this.size = 25;
        this.start = { r: 0, c: 0 };
        this.goal = { r: this.size - 1, c: this.size - 1 };
        this.step_delay = 50;
        this.obstacle_density = 0.30;
        this.enableReplanning = true;
    }

    setApp(app) {
        this.app = app;
    }

    setAlgorithm(algorithm) {
        this.algorithm = algorithm;

        const algorithmInfo = document.getElementById("algorithm-info");
        if (!algorithmInfo) return;

        algorithmInfo.querySelector("h4").textContent = ALGORITHM_MAP[algorithm] || algorithm.toUpperCase();
        algorithmInfo.querySelector("p").textContent = ALGORITHM_INFO[algorithm] || "No description available.";

        if (algorithm !== ALGORITHM.GREEDY && algorithm !== ALGORITHM.ASTAR) {
            const heuristicInfo = document.getElementById("heuristic-info");
            if (heuristicInfo) {
                heuristicInfo.remove();
            }
        } else {
            this.setHeuristic(this.heuristic);
        }
    }

    setHeuristic(heuristic) {
        this.heuristic = heuristic;
        if (this.algorithm === ALGORITHM.GREEDY || this.algorithm === ALGORITHM.ASTAR) {
            const infoPanel = document.getElementById("info-panel");
            if (!infoPanel) return;

            if (!infoPanel.querySelector("#heuristic-info")) {
                const heuristicInfo = document.createElement("div");
                heuristicInfo.id = "heuristic-info";
                heuristicInfo.className = "submenu";
                infoPanel.appendChild(heuristicInfo);

                const heading = document.createElement("h4");
                heading.style.margin = "0";
                const description = document.createElement("p");
                heuristicInfo.appendChild(heading);
                heuristicInfo.appendChild(description);
            }

            const heuristicInfo = document.getElementById("heuristic-info");
            heuristicInfo.querySelector("h4").textContent = HEURISTIC_MAP[this.heuristic] || "Heuristic";
            heuristicInfo.querySelector("p").textContent = HEURISTIC_INFO[this.heuristic];
        }
    }

    setMode(mode) {
        this.mode = mode;
        if (this.mode == MODE.SELECTGOAL || this.mode === MODE.SELECTSTART) {
            this.app.clearGrid();
            this.app.clearObstacles();
        }
    }

    setSize(size) {
        this.size = size;
        this.goal = { r: this.size - 1, c: this.size - 1 };
        this.app.initialize();
    }

    setStepDelay(delay) {
        this.step_delay = delay;
    }

    setStart(r, c) {
        this.start = { r: r, c: c };
    }

    setGoal(r, c) {
        this.goal = { r: r, c: c };
    }

    setObstacleDensity(density) {
        this.obstacle_density = density;
        this.app.initialize();
    }

    setEnableReplanning(enabled) {
        this.enableReplanning = enabled;
    }
}
