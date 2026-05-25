import { PathFinder } from "./pathFinder.js"
import { PathFinderDynamic } from './pathFinderDynamic.js'
import { ALGORITHM, ALGORITHM_INFO, ALGORITHM_MAP, HEURISTIC, HEURISTIC_INFO, HEURISTIC_MAP, MODE } from "./constants.js";
import { sleep } from "./utils.js";

export class App {

    DIRS = [
        [0, 1], [1, 0], [0, -1], [-1, 0]
    ];

    CELL_COLORS = {
        start: "green",
        goal: "navy",
        obstacle: "black",
        current: "deepskyblue",
        visited: "lightcoral",
        inQueue: "yellow",
        path: "lightgreen"
    };

    MAX_STEPS = 10000;  // To prevent infinite loops
    controller = new AbortController();
    stepCount = 0;
    visitedCount = 0;
    replanCount = 0;
    startTime = 0;
    actualPath = [];

    constructor(settings) {
        this.grid = [];
        this.gridCopy = null;
        this.obstacles = new Set();
        this.settings = settings;
        this.paused = false;
        this.stopped = true;

        this.stepCount = 0;
        this.visitedCount = 0;
        this.pathLength = -1;
        this.optimalPathLength = -1;
        this.actualPath = [];
        this.replanCount = 0;
        this.startTime = 0;

        this.current = { r: this.settings.start.r, c: this.settings.start.c };

        this.pathFinder = new PathFinder(this);
        this.dynamicPathFinder = new PathFinderDynamic(this);

    }

    // Initialize: setup visited history, generate obstacles, render grid
    initialize() {
        this.initializeVisitedHistory();
        do {
            this.obstacles = this.generateObstacles(this.settings.obstacle_density);
        } while (!this.isReachable(this.settings.start, this.settings.goal));
        this.createGrid();
    }

    // Create DOM grid with cells, event listeners, and obstacles
    createGrid() {
        const gridElement = document.getElementById("grid");
        gridElement.innerHTML = "";

        gridElement.style.gridTemplateRows = `repeat(${this.settings.size}, 1fr)`;
        gridElement.style.gridTemplateColumns = `repeat(${this.settings.size}, 1fr)`;

        for (let r = 0; r < this.settings.size; r++) {
            this.grid[r] = [];

            for (let c = 0; c < this.settings.size; c++) {
                const cell = document.createElement("div");
                cell.classList.add("cell");

                cell.addEventListener("click", () => {
                    this.handleCellClick(r, c);
                });

                cell.addEventListener("mouseenter", () => {
                    this.handleCellHover(r, c);
                });

                cell.addEventListener("mouseleave", () => {
                    this.handleCellLeave(r, c);
                });

                let index = r * this.settings.size + c;

                if (index !== 0 && index !== this.settings.size * this.settings.size - 1) {
                    if (this.obstacles.has(index)) {
                        cell.classList.add("obstacle");
                    }
                }

                gridElement.appendChild(cell);
                this.grid[r][c] = cell;
            }
        }

        const start = this.settings.start;
        const goal = this.settings.goal;

        this.grid[start.r][start.c].classList.add("start");
        this.grid[goal.r][goal.c].classList.add("goal");
    }

    updateObstacles() {
        for (let r = 0; r < this.settings.size; r++) {
            for (let c = 0; c < this.settings.size; c++) {
                if ((r === this.settings.start.r && c === this.settings.start.c) ||
                    (r === this.settings.goal.r && c === this.settings.goal.c)) {
                    this.grid[r][c].classList.remove("obstacle");
                    continue;
                }

                let index = r * this.settings.size + c;
                if (!this.grid[r][c].classList.contains("obstacle") && this.obstacles.has(index)) {
                    this.grid[r][c].classList.add("obstacle");
                    this.grid[r][c].style.backgroundColor = "";
                }
                else if (this.grid[r][c].classList.contains("obstacle") && !this.obstacles.has(index)) {
                    this.grid[r][c].classList.remove("obstacle");
                    this.grid[r][c].style.backgroundColor = this.getVisitedColor(this.visitedHistory[r][c]);
                }
                else if (!this.grid[r][c].classList.contains("obstacle")) {
                    const visitedColor = this.getVisitedColor(this.visitedHistory[r][c]);
                    if (visitedColor) {
                        this.grid[r][c].style.backgroundColor = visitedColor;
                    }
                }
            }
        }
    }

    // Generate random obstacles with given density, avoiding start/goal
    generateObstacles(density = 0.3, currentPos = null) {
        const start = this.settings.start;
        const goal = this.settings.goal;
        const total = this.settings.size * this.settings.size;
        const target = Math.floor(total * density);

        const obstacles = new Set();
        let count = 0;

        while (count < target) {
            let r = Math.floor(Math.random() * this.settings.size);
            let c = Math.floor(Math.random() * this.settings.size);
            let index = r * this.settings.size + c;

            if (
                obstacles.has(index) ||
                (r === start.r && c === start.c) ||
                (r === goal.r && c === goal.c) ||
                (currentPos && r === currentPos.r && c === currentPos.c)
            ) continue;

            obstacles.add(index);
            count++;
        }

        return obstacles;
    }

    // check if goal reachable from start using bfs
    isReachable(current, goal) {
        let queue = [current];
        let visited = new Set();
        visited.add(`${current.r},${current.c}`);

        while (queue.length > 0) {
            let node = queue.shift();

            if (node.r === goal.r && node.c === goal.c) {
                return true;
            }

            for (const [dr, dc] of this.DIRS) {
                let nr = node.r + dr;
                let nc = node.c + dc;
                let key = `${nr},${nc}`;

                if (
                    nr >= 0 && nr < this.settings.size &&
                    nc >= 0 && nc < this.settings.size &&
                    !visited.has(key)
                ) {
                    let index = nr * this.settings.size + nc;
                    if (!this.obstacles.has(index)) {
                        visited.add(key);
                        queue.push({ r: nr, c: nc });
                    }
                }
            }
        }

        return false;
    }

    // Reset obstacles to new random configuration while ensuring path exists
    resetObstacles(current) {
        const goal = this.settings.goal;
        const start = this.settings.start;

        this.clearObstacles();
        this.obstacles.clear();

        let attempts = 0;
        const maxAttempts = 100;

        do {
            this.obstacles = this.generateObstacles(this.settings.obstacle_density, current);
            attempts++;

            if (attempts >= maxAttempts) {
                console.warn("Could not find valid obstacle configuration after " + maxAttempts + " attempts.");
                break;
            }
        } while (!this.isReachable(current, goal));

        this.updateObstacles();
        this.replanCount++;
    }

    clearObstacles() {
        for (const idx of this.obstacles) {
            const r = Math.floor(idx / this.settings.size);
            const c = idx % this.settings.size;
            this.grid[r][c].classList.remove("obstacle");
        }
    }

    initializeVisitedHistory() {
        this.visitedHistory = Array.from({ length: this.settings.size }, () =>
            Array(this.settings.size).fill(0)
        );
    }

    // Reconstruct and visualize path from parent pointers or actual path
    async reconstructPath(parent, useActualPath = false) {
        this.updateStatus("found");

        let path = [];

        if (useActualPath && this.actualPath.length > 0) {
            path = [...this.actualPath];  // Dynamic mode: use actual path taken
        } else {
            let r = this.settings.goal.r, c = this.settings.goal.c;
            while (r !== -1 && c !== -1) {
                path.push({ r, c });
                let p = parent[r][c];
                r = p.r; c = p.c;
            }
            path.reverse();
        }

        this.pathLength = path.length;
        this.updateLog();

        for (const { r, c } of path) {
            if ((r === this.settings.start.r && c === this.settings.start.c) ||
                (r === this.settings.goal.r && c === this.settings.goal.c)) {
                continue;  // Skip coloring start and goal
            }
            this.color(r, c, this.CELL_COLORS.path);
            this.updateLog();
            await sleep(this.settings.step_delay);
        }
    }

    updateCellLabel(r, c, id) {
        const label = document.getElementById(id);
        label.textContent = "(" + r.toString() + " ," + c.toString() + ")";
    }

    handleCellClick(r, c) {
        const cell = this.grid[r][c];

        if (this.settings.mode === MODE.SELECTSTART) {
            const start = this.settings.start;
            this.grid[start.r][start.c].classList.remove("start");
            this.settings.setStart(r, c);
            this.grid[r][c].classList.add("start");
            const startCellLabel = document.getElementById("start-cell-label");
            startCellLabel.textContent = "(" + r.toString() + " ," + c.toString() + ")";
            this.settings.setMode(MODE.IDLE);
            this.initialize();
            this.gridCopy = null;
        }
        else if (this.settings.mode === MODE.SELECTGOAL) {
            const goal = this.settings.goal;
            this.grid[goal.r][goal.c].classList.remove("goal");
            this.settings.setGoal(r, c);
            this.grid[r][c].classList.add("goal");
            const goalCellLabel = document.getElementById("goal-cell-label");
            goalCellLabel.textContent = "(" + r.toString() + " ," + c.toString() + ")";
            this.settings.setMode(MODE.IDLE);
            this.initialize();
            this.gridCopy = null;
        }

        this.updateObstacles();
    }

    handleCellHover(r, c) {
        const cell = this.grid[r][c];

        if (this.settings.mode === MODE.SELECTSTART) {
            cell.classList.add("hover-start");
        }
        if (this.settings.mode === MODE.SELECTGOAL) {
            cell.classList.add("hover-goal");
        }
    }

    handleCellLeave(r, c) {
        const cell = this.grid[r][c];
        cell.classList.remove("hover-start", "hover-goal");
    }

    color(r, c, color) {
        if (this.stopped) return;
        if (this.grid[r][c].classList.contains("obstacle")) return;
        if (color === this.CELL_COLORS.visited) {
            this.visitedHistory[r][c]++;
            color = this.getVisitedColor(this.visitedHistory[r][c]);
        }
        this.grid[r][c].style.backgroundColor = color;
    }

    getVisitedColor(visitCount) {
        if (visitCount === 0) return "";

        if (visitCount === 1) return "rgb(240, 128, 128)";
        if (visitCount === 2) return "rgb(255, 77, 77)";
        if (visitCount === 3) return "rgb(230, 51, 51)";
        if (visitCount === 4) return "rgb(200, 30, 30)";

        return "rgb(160, 0, 0)";
    }

    removeFromClassList(r, c, name) {
        this.grid[r][c].classList.remove(name);
    }

    heuristic(r, c) {
        const goal = this.settings.goal;

        const euclidian = (r, c) => {
            return Math.sqrt(((r - goal.r) ** 2) + ((c - goal.c) ** 2));
        }

        const manhattan = (r, c) => {
            return Math.abs(r - goal.r) + Math.abs(c - goal.c);
        }

        const chebyshev = (r, c) => {
            return Math.max(Math.abs(r - goal.r), Math.abs(c - goal.c))
        }

        if (this.settings.heuristic === HEURISTIC.EUCLIDIAN) return euclidian(r, c);
        else if (this.settings.heuristic === HEURISTIC.CHEBYSHEV) return chebyshev(r, c);
        else return manhattan(r, c);
    }

    clearGrid(preserveVisitedColors = false) {
        for (let r = 0; r < this.settings.size; r++) {
            for (let c = 0; c < this.settings.size; c++) {
                const cell = this.grid[r][c];
                if (!cell.classList.contains('obstacle')) {
                    if (preserveVisitedColors) {
                        const visitedColor = this.getVisitedColor(this.visitedHistory[r][c]);
                        cell.style.backgroundColor = visitedColor;
                    } else {
                        cell.style.backgroundColor = "";
                    }
                }
            }
        }
        if (!preserveVisitedColors) {
            this.stepCount = 0;
            this.visitedCount = 0;
            this.pathLength = -1;
            this.optimalPathLength = -1;
        }
    }

    saveGridCopy() {
        this.gridCopy = {
            obstacles: new Set(this.obstacles),
            cells: this.grid.map(row => row.map(cell => ({
                className: cell.className,
                backgroundColor: cell.style.backgroundColor
            })))
        };
    }

    restoreGrid() {
        if (!this.gridCopy) return;

        this.obstacles = new Set(this.gridCopy.obstacles);

        for (let r = 0; r < this.settings.size; r++) {
            for (let c = 0; c < this.settings.size; c++) {
                const snapshot = this.gridCopy.cells[r][c];
                const cell = this.grid[r][c];
                cell.className = snapshot.className;
                cell.style.backgroundColor = snapshot.backgroundColor;
            }
        }

        this.gridCopy = null;
    }

    startLog() {
        this.stepCount = 0;
        this.visitedCount = 0;
        this.replanCount = 0;
        this.optimalPathLength = -1;
        this.startTime = performance.now();
        const steplogSection = document.getElementById("steplog-section");
        if (steplogSection) {
            steplogSection.style.display = "block";
        }
        const steplog = document.getElementById("steplog");
        steplog.innerHTML = `
                    <div> Status: <span class="log-value" id="statusDisplay" style="background: rgba(255,165,0,0.2); border-color: rgba(255,165,0,0.4); color: orange;">Searching...</span> </div>
                    <div> Steps Taken: <span class="log-value" id="stepCount">0</span> </div>
                    <div> Cells Visited: <span class="log-value" id="cellsVisited">0</span> </div>
                    <div> Path Length (Actual): <span class="log-value" id="pathLength"></span> </div>
                    <div> Optimal Length: <span class="log-value" id="optimalPathLength" style="background: rgba(0,255,0,0.15); border-color: rgba(0,255,0,0.3); color: lightgreen;"></span> </div>
                    <div> Time Elapsed: <span class="log-value" id="timeElapsed">0 ms</span> </div>
                    <div> Obstacle Resets: <span class="log-value" id="replanCount">0</span> </div>
                `;
        const statusBar = document.getElementById("status-bar");
        if (statusBar) {
            const mode = this.settings.enableReplanning ? "Dynamic" : "Static";
            statusBar.textContent = mode + " Mode: Searching...";
            statusBar.style.color = "orange";
        }
    }

    endLog() {
        const steplogSection = document.getElementById("steplog-section");
        if (steplogSection) {
            steplogSection.style.display = "none";
        }
        const steplog = document.getElementById("steplog");
        steplog.innerHTML = `
                    <p> Simulation not started. Select algorithm and click Run to begin. </p>
                `;
        const statusBar = document.getElementById("status-bar");
        if (statusBar) {
            statusBar.textContent = "Ready";
            statusBar.style.color = "#888";
        }
    }

    updateLog() {
        const stepCountElem = document.getElementById("stepCount");
        const cellsVisitedElem = document.getElementById("cellsVisited");
        const pathLengthElem = document.getElementById("pathLength");
        const timeElapsedElem = document.getElementById("timeElapsed");
        const replanCountElem = document.getElementById("replanCount");
        const optimalPathLengthElem = document.getElementById("optimalPathLength");
        if (stepCountElem) stepCountElem.textContent = this.stepCount.toString();
        if (cellsVisitedElem) cellsVisitedElem.textContent = this.visitedCount.toString();
        if (pathLengthElem) pathLengthElem.textContent = (this.pathLength != -1) ? this.pathLength.toString() : "";
        if (timeElapsedElem) {
            const elapsed = Math.round(performance.now() - this.startTime);
            timeElapsedElem.textContent = elapsed + " ms";
        }
        if (replanCountElem) replanCountElem.textContent = this.replanCount.toString();
        if (optimalPathLengthElem) {
            if (this.optimalPathLength > 0) {
                optimalPathLengthElem.textContent = this.optimalPathLength.toString();
            } else if (this.optimalPathLength === -1 && this.pathLength > 0) {
                // Path blocked in final config - handled separately in runDynamicMode
            } else {
                optimalPathLengthElem.textContent = "";
            }
        }
    }

    updateStatus(status) {
        const statusElem = document.getElementById("statusDisplay");
        const statusBar = document.getElementById("status-bar");

        let text, bgColor, borderColor, textColor;

        if (status === "searching") {
            text = "Searching...";
            bgColor = "rgba(255,165,0,0.2)";
            borderColor = "rgba(255,165,0,0.4)";
            textColor = "orange";
        } else if (status === "found") {
            text = "Path Found!";
            bgColor = "rgba(0,255,0,0.2)";
            borderColor = "rgba(0,255,0,0.4)";
            textColor = "lightgreen";
        } else if (status === "not_found") {
            text = "No Path Found";
            bgColor = "rgba(255,0,0,0.2)";
            borderColor = "rgba(255,0,0,0.4)";
            textColor = "lightcoral";
        } else if (status === "max_steps") {
            text = "Max Steps Reached";
            bgColor = "rgba(255,165,0,0.2)";
            borderColor = "rgba(255,165,0,0.4)";
            textColor = "orange";
        }

        if (statusElem) {
            statusElem.textContent = text;
            statusElem.style.background = bgColor;
            statusElem.style.borderColor = borderColor;
            statusElem.style.color = textColor;
        }

        if (statusBar) {
            statusBar.textContent = text;
            statusBar.style.color = textColor;
        }
    }

    pause() {
        this.paused = true;
    }

    stop() {
        this.stopped = true;
        this.paused = false;
        this.controller.abort();
        this.controller = new AbortController();
    }

    reset() {
        this.stopped = true;
        this.paused = false;
        this.stepCount = 0;
        this.visitedCount = 0;
        this.pathLength = -1;
        this.optimalPathLength = -1;
        this.endLog();
        this.controller.abort();
        this.controller = new AbortController();
        this.clearGrid();
        this.initialize();
    }

    // Dynamic mode: Agent navigates with obstacles regenerating after each step
    async runDynamicMode() {
        this.stepCount = 0;
        this.visitedCount = 0;
        this.actualPath = [];
        this.replanCount = 0;
        this.optimalPathLength = -1;
        const uniqueVisitedCells = new Set();

        const goal = this.settings.goal;
        let current = { r: this.settings.start.r, c: this.settings.start.c };

        this.updateStatus("searching");

        this.color(current.r, current.c, this.CELL_COLORS.current);
        this.actualPath.push({ r: current.r, c: current.c });
        uniqueVisitedCells.add(`${current.r},${current.c}`);

        while (current.r !== goal.r || current.c !== goal.c) {
            if (this.stopped) return;
            while (this.paused) {
                await new Promise(r => setTimeout(r, 50));
            }

            if (this.stepCount >= this.MAX_STEPS) {
                this.updateStatus("max_steps");
                return;
            }

            // Find next move using selected algorithm in current configuration
            const algorithm = this.settings.algorithm;
            let path;
            if (algorithm === ALGORITHM.DFS) {
                path = this.dynamicPathFinder.findPathDFS(current, goal);
            } else if (algorithm === ALGORITHM.BFS) {
                path = this.dynamicPathFinder.findPathBFS(current, goal);
            } else if (algorithm === ALGORITHM.UCS) {
                path = this.dynamicPathFinder.findPathUCS(current, goal);
            } else if (algorithm === ALGORITHM.GREEDY) {
                path = this.dynamicPathFinder.findPathGreedy(current, goal);
            } else {
                path = this.dynamicPathFinder.findPathAStar(current, goal);
            }
            if (!path || path.length < 2) {
                this.updateStatus("not_found");
                return;
            }

            // Move agent one cell forward
            this.color(current.r, current.c, this.CELL_COLORS.visited);

            current = { r: path[1].r, c: path[1].c };
            this.actualPath.push({ r: current.r, c: current.c });
            uniqueVisitedCells.add(`${current.r},${current.c}`);
            this.visitedCount = uniqueVisitedCells.size;
            this.stepCount++;
            this.updateLog();

            this.color(current.r, current.c, this.CELL_COLORS.current);
            await sleep(this.settings.step_delay);

            if (current.r === goal.r && current.c === goal.c) {
                break;
            }

            // Reset obstacles and update display
            if (this.settings.enableReplanning) {
                this.resetObstacles(current);
                this.clearGrid(true);
                this.color(current.r, current.c, this.CELL_COLORS.current);
            }
        }

        // Goal reached - compute optimal path using A* on final obstacle configuration
        this.updateStatus("found");
        this.pathLength = this.actualPath.length;
        this.updateLog();

        // Use A* to find optimal path on final configuration
        const optimalPath = this.dynamicPathFinder.findPathAStar(this.settings.start, goal);

        const statusElem = document.getElementById("statusDisplay");
        const statusBar = document.getElementById("status-bar");
        const optimalPathLengthElem = document.getElementById("optimalPathLength");

        if (optimalPath && optimalPath.length > 0) {
            this.optimalPathLength = optimalPath.length;
            this.updateLog();

            await sleep(this.settings.step_delay * 2);

            // Display optimal path as bright green overlay
            for (const { r, c } of optimalPath) {
                if ((r === this.settings.start.r && c === this.settings.start.c) ||
                    (r === goal.r && c === goal.c)) {
                    continue;
                }
                this.grid[r][c].style.backgroundColor = "#00ff00";
                await sleep(this.settings.step_delay / 3);
            }

            if (statusElem) {
                statusElem.textContent = "Goal Reached!";
                statusElem.style.background = "rgba(0,255,0,0.2)";
                statusElem.style.borderColor = "rgba(0,255,0,0.4)";
                statusElem.style.color = "lightgreen";
            }
            if (statusBar) {
                statusBar.textContent = `Goal Reached! Actual: ${this.pathLength} steps | Optimal: ${this.optimalPathLength} steps`;
                statusBar.style.color = "lightgreen";
            }
        } else {
            this.optimalPathLength = -1;

            if (optimalPathLengthElem) {
                optimalPathLengthElem.textContent = "N/A";
                optimalPathLengthElem.style.background = "rgba(255,165,0,0.15)";
                optimalPathLengthElem.style.borderColor = "rgba(255,165,0,0.3)";
                optimalPathLengthElem.style.color = "orange";
            }

            if (statusElem) {
                statusElem.textContent = "Goal Reached!";
                statusElem.style.background = "rgba(0,255,0,0.2)";
                statusElem.style.borderColor = "rgba(0,255,0,0.4)";
                statusElem.style.color = "lightgreen";
            }
            if (statusBar) {
                statusBar.textContent = `Goal Reached! Actual: ${this.pathLength} steps | Optimal: N/A`;
                statusBar.style.color = "lightgreen";
            }
        }
    }

    // Execute static mode with selected algorithm (no replanning)
    async runStaticMode() {
        this.stepCount = 0;
        this.visitedCount = 0;
        this.pathLength = -1;
        this.optimalPathLength = -1;

        const algorithm = this.settings.algorithm;

        try {
            if (algorithm === ALGORITHM.DFS) {
                await this.pathFinder.DFS();
            } else if (algorithm === ALGORITHM.BFS) {
                await this.pathFinder.BFS();
            } else if (algorithm === ALGORITHM.UCS) {
                await this.pathFinder.UCS();
            } else if (algorithm === ALGORITHM.GREEDY) {
                await this.pathFinder.BestFS();
            } else if (algorithm === ALGORITHM.ASTAR) {
                await this.pathFinder.AStar();
            }
        } catch (error) {
            console.error("Algorithm execution error:", error);
        } finally {
            // In static mode, the path found is optimal since no replanning occurs
            if (this.pathLength > 0) {
                this.optimalPathLength = this.pathLength;
            }
            // Update final log display
            this.updateLog();
            await sleep(200);
        }
    }

    // Execute dynamic mode with selected algorithm
    async run() {
        this.clearGrid();
        this.initializeVisitedHistory();
        this.replanCount = 0;
        this.startTime = performance.now();
        this.stopped = false;

        try {
            // Choose between static and dynamic mode based on replanning toggle
            if (this.settings.enableReplanning) {
                await this.runDynamicMode();
            } else {
                await this.runStaticMode();
            }
        } finally {
            this.stopped = true;
        }
    }
}
