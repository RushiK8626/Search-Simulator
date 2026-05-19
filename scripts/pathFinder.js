import { sleep } from './utils.js';
import { MinHeap } from './minHeap.js';

export class PathFinder {
    
    constructor(app) {
        this.app = app;
    }

    async DFS() {
        this.app.stepCount = 0;
        this.app.visitedCount = 0;

        let visited = Array.from({ length: this.app.settings.size }, () =>
            Array(this.app.settings.size).fill(false));
        let parent = Array.from({ length: this.app.settings.size }, () =>
            Array.from({ length: this.app.settings.size }, () => ({ r: -1, c: -1 }))
        );

        let stepSinceReplan = 0;
        const start = this.app.settings.start;
        const goal = this.app.settings.goal;

        let stack = [];
        stack.push({ r: start.r, c: start.c });
        visited[start.r][start.c] = true;

        while (stack.length > 0) {
            if (this.app.stopped) return;
            while (this.app.paused) {
                await new Promise(r => setTimeout(r, 50));
            }

            const { r, c } = stack.pop();

            if (this.app.grid[r][c].classList.contains('obstacle')) continue;

            if (this.app.settings.allowReplanning && stepSinceReplan > this.app.settings.replanThreshold) {
                this.app.updateObstacles();
                visited = new Array(this.app.settings.size).fill(null).map(() => new Array(this.app.settings.size).fill(false));
                stepSinceReplan = 0;
            }

            this.app.current = { r, c };
            this.app.color(r, c, this.app.CELL_COLORS.current);
            this.app.stepCount++;
            this.app.visitedCount++;
            this.app.updateLog();
            stepSinceReplan++;

            if (r === goal.r && c === goal.c) {
                await this.app.reconstructPath(parent);
                return;
            }

            await sleep(this.app.settings.step_delay);
            while (this.app.paused) {
                await new Promise(r => setTimeout(r, 50));
            }

            this.app.color(r, c, this.app.CELL_COLORS.visited);

            for (const [dr, dc] of this.app.DIRS) {
                let nr = r + dr;
                let nc = c + dc;

                if (
                    nr >= 0 && nr < this.app.settings.size &&
                    nc >= 0 && nc < this.app.settings.size &&
                    !this.app.grid[nr][nc].classList.contains('obstacle') &&
                    !visited[nr][nc]
                ) {
                    visited[nr][nc] = true;
                    parent[nr][nc] = { r, c };
                    stack.push({ r: nr, c: nc });
                    this.app.color(nr, nc, this.app.CELL_COLORS.inQueue);
                    this.app.updateLog();
                }
            }
        }
    }

    async BFS() {
        this.app.stepCount = 0;
        this.app.visitedCount = 0;

        let visited = Array.from({ length: this.app.settings.size }, () => Array(this.app.settings.size).fill(false));
        let parent = Array.from({ length: this.app.settings.size }, () =>
            Array.from({ length: this.app.settings.size }, () => ({ r: -1, c: -1 }))
        );

        let stepSinceReplan = 0;

        const start = this.app.settings.start;
        const goal = this.app.settings.goal;

        let queue = [];
        queue.push({ r: start.r, c: start.c });
        visited[start.r][start.c] = true;

        while (queue.length) {
            const size = queue.length;

            for (let i = 0; i < size; ++i) {

                if (this.app.stopped) return;
                while (this.app.paused) {
                    await new Promise(r => setTimeout(r, 50));
                }

                const { r, c } = queue.shift();

                this.app.color(r, c, this.app.CELL_COLORS.current);
                this.app.stepCount++;
                this.app.visitedCount++;
                this.app.updateLog();
                stepSinceReplan++;

                if (r === goal.r && c === goal.c) {
                    await this.app.reconstructPath(parent);
                    return
                }

                if (this.app.stopped) return;
                await sleep(this.app.settings.step_delay);
                while (this.app.paused) {
                    await new Promise(r => setTimeout(r, 50));
                }

                this.app.color(r, c, this.app.CELL_COLORS.visited);

                for (const [dr, dc] of this.app.DIRS) {
                    let nr = r + dr;
                    let nc = c + dc;

                    if (
                        nr >= 0 && nr < this.app.settings.size &&
                        nc >= 0 && nc < this.app.settings.size &&
                        !this.app.grid[nr][nc].classList.contains('obstacle') &&
                        !visited[nr][nc]
                    ) {
                        parent[nr][nc] = { r, c };
                        visited[nr][nc] = true;
                        queue.push({ r: nr, c: nc });
                        this.app.color(nr, nc, this.app.CELL_COLORS.inQueue);
                        this.app.updateLog();
                    }
                }
            }
        }
    }

    async UCS() {
        this.app.stepCount = 0;
        this.app.visitedCount = 0;

        let pq = new MinHeap();

        let dist = Array.from({ length: this.app.settings.size }, () =>
            Array(this.app.settings.size).fill(Number.MAX_SAFE_INTEGER)
        );

        let parent = Array.from({ length: this.app.settings.size }, () =>
            Array.from({ length: this.app.settings.size }, () => ({ r: -1, c: -1 }))
        );

        let stepSinceReplan = 0;

        const start = this.app.settings.start;
        const goal = this.app.settings.goal;

        dist[start.r][start.c] = 0;
        pq.push({ cost: 0, r: start.r, c: start.c });

        while (!pq.isEmpty()) {

            if (this.app.stopped) return;
            while (this.app.paused) {
                await new Promise(r => setTimeout(r, 50));
            }

            const { cost, r, c } = pq.pop();

            if (cost > dist[r][c]) continue;

            this.app.stepCount++;
            this.app.visitedCount++;
            this.app.updateLog();
            stepSinceReplan++;

            if (r === goal.r && c === goal.c) {
                await this.app.reconstructPath(parent);
                return
            }

            this.app.color(r, c, this.app.CELL_COLORS.current);

            if (this.app.stopped) return;
            await sleep(this.app.settings.step_delay);
            while (this.app.paused) {
                await new Promise(r => setTimeout(r, 50));
            }

            for (const [dr, dc] of this.app.DIRS) {

                let nr = r + dr, nc = c + dc;

                if (
                    nr >= 0 && nr < this.app.settings.size &&
                    nc >= 0 && nc < this.app.settings.size &&
                    !this.app.grid[nr][nc].classList.contains('obstacle') &&
                    dist[r][c] + 1 < dist[nr][nc]
                ) {
                    dist[nr][nc] = dist[r][c] + 1;
                    parent[nr][nc] = { r, c };
                    pq.push({ cost: dist[nr][nc], r: nr, c: nc });
                    this.app.color(nr, nc, this.app.CELL_COLORS.inQueue);
                    this.app.updateLog();
                }
            }

            this.app.color(r, c, this.app.CELL_COLORS.visited);
        }
    }

    async BestFS() {
        this.app.stepCount = 0;
        this.app.visitedCount = 0;

        let pq = new MinHeap();

        let visited = Array.from({ length: this.app.settings.size }, () => Array(this.app.settings.size).fill(false));
        let parent = Array.from({ length: this.app.settings.size }, () =>
            Array.from({ length: this.app.settings.size }, () => ({ r: -1, c: -1 }))
        );

        let stepSinceReplan = 0;

        const start = this.app.settings.start;
        const goal = this.app.settings.goal;

        pq.push({ cost: this.app.heuristic(start.r, start.c), r: start.r, c: start.c });

        while (!pq.isEmpty()) {

            if (this.app.stopped) return;
            while (this.app.paused) {
                await new Promise(r => setTimeout(r, 50));
            }

            let { cost, r, c } = pq.pop();

            if (visited[r][c]) continue;
            visited[r][c] = true;

            this.app.stepCount++;
            this.app.visitedCount++;
            this.app.updateLog();
            stepSinceReplan++;

            this.app.color(r, c, this.app.CELL_COLORS.current);

            if (r === goal.r && c === goal.c) {
                await this.app.reconstructPath(parent);
                return;
            }

            if (this.app.stopped) return;
            await sleep(this.app.settings.step_delay);
            while (this.app.paused) {
                await new Promise(r => setTimeout(r, 50));
            }

            this.app.color(r, c, this.app.CELL_COLORS.visited);

            for (const [dr, dc] of this.app.DIRS) {

                let nr = r + dr, nc = c + dc;

                if (
                    nr >= 0 && nr < this.app.settings.size &&
                    nc >= 0 && nc < this.app.settings.size &&
                    !this.app.grid[nr][nc].classList.contains('obstacle') &&
                    !visited[nr][nc]
                ) {
                    parent[nr][nc] = { r, c };
                    pq.push({ cost: this.app.heuristic(nr, nc), r: nr, c: nc });
                    this.app.color(nr, nc, this.app.CELL_COLORS.inQueue);
                    this.app.updateLog();
                }
            }
        }
    }

    async AStar() {
        this.app.stepCount = 0;
        this.app.visitedCount = 0;


        let pq = new MinHeap();

        let gScore = Array.from({ length: this.app.settings.size }, () =>
            Array(this.app.settings.size).fill(Number.MAX_SAFE_INTEGER)
        );

        let fScore = Array.from({ length: this.app.settings.size }, () =>
            Array(this.app.settings.size).fill(Number.MAX_SAFE_INTEGER)
        );

        let visited = Array.from({ length: this.app.settings.size }, () =>
            Array(this.app.settings.size).fill(false)
        );

        let parent = Array.from({ length: this.app.settings.size }, () =>
            Array.from({ length: this.app.settings.size }, () => ({ r: -1, c: -1 }))
        );

        let stepSinceReplan = 0;

        const start = this.app.settings.start;
        const goal = this.app.settings.goal;

        gScore[start.r][start.c] = 0;
        fScore[start.r][start.c] = this.app.heuristic(start.r, start.c)

        pq.push({ cost: fScore[start.r][start.c], r: start.r, c: start.c });


        while (!pq.isEmpty()) {

            if (this.app.stopped) return;
            while (this.app.paused) {
                await new Promise(r => setTimeout(r, 50));
            }

            let { cost, r, c } = pq.pop();

            if (cost > fScore[r][c]) continue;
            if (visited[r][c]) continue;
            visited[r][c] = true;

            this.app.stepCount++;
            this.app.visitedCount++;
            this.app.updateLog();
            stepSinceReplan++;

            this.app.color(r, c, this.app.CELL_COLORS.current);

            if (r === goal.r && c === goal.c) {
                await this.app.reconstructPath(parent);
                return true;
            }

            if (this.app.stopped) return;
            await sleep(this.app.settings.step_delay);
            while (this.app.paused) {
                await new Promise(r => setTimeout(r, 50));
            }

            this.app.color(r, c, this.app.CELL_COLORS.visited);

            for (const [dr, dc] of this.app.DIRS) {

                let nr = r + dr, nc = c + dc;

                if (
                    nr >= 0 && nr < this.app.settings.size &&
                    nc >= 0 && nc < this.app.settings.size &&
                    !this.app.grid[nr][nc].classList.contains('obstacle')
                ) {

                    let tentative = gScore[r][c] + 1;

                    if (tentative < gScore[nr][nc]) {
                        parent[nr][nc] = { r, c };

                        gScore[nr][nc] = tentative;
                        fScore[nr][nc] = tentative + this.app.heuristic(nr, nc);
                        pq.push({ cost: fScore[nr][nc], r: nr, c: nc });
                        this.app.color(nr, nc, this.app.CELL_COLORS.inQueue);
                        this.app.updateLog();
                    }

                }
            }
        }
    }
}