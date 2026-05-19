import { MinHeap } from './minHeap.js';
import { sleep, shuffle } from './utils.js';

export class PathFinderDynamic {
    constructor(app) {
        this.app = app;
    }

    flashInQueue(r, c) {
        if (this.app.stopped) return;
        const cell = this.app.grid[r][c];
        if (!cell || cell.classList.contains("obstacle") || cell.classList.contains("start") || cell.classList.contains("goal")) {
            return;
        }

        this.app.color(r, c, this.app.CELL_COLORS.inQueue);

        const flashMs = this.app.settings.step_delay;
        setTimeout(() => {
            if (this.app.stopped) return;
            if (cell.style.backgroundColor !== this.app.CELL_COLORS.inQueue) return;
            const visitedColor = this.app.getVisitedColor(this.app.visitedHistory[r][c]);
            cell.style.backgroundColor = visitedColor || "";
        }, flashMs);
    }

    async yieldToRenderer() {
        await new Promise(resolve => requestAnimationFrame(resolve));
    }

    // Internal DFS for dynamic mode: finds path silently without visualization
    findPathDFS(startPos, goalPos) {
        const stack = [{ r: startPos.r, c: startPos.c }];
        const visited = new Set();
        const parent = Array.from({ length: this.app.settings.size }, () =>
            Array.from({ length: this.app.settings.size }, () => ({ r: -1, c: -1 }))
        );
        visited.add(`${startPos.r},${startPos.c}`);
        while (stack.length > 0) {
            const { r, c } = stack.pop();
            if (r === goalPos.r && c === goalPos.c) {
                const path = [];
                let cr = r, cc = c;
                while (cr !== -1 && cc !== -1) {
                    path.push({ r: cr, c: cc });
                    const p = parent[cr][cc];
                    cr = p.r; cc = p.c;
                }
                path.reverse();
                return path;
            }

            // Randomize directions to avoid stucking infinetely
            for (const [dr, dc] of shuffle(this.app.DIRS)) {
                const nr = r + dr, nc = c + dc;
                const key = `${nr},${nc}`;
                if (nr >= 0 && nr < this.app.settings.size && nc >= 0 && nc < this.app.settings.size &&
                    !this.app.grid[nr][nc].classList.contains('obstacle') && !visited.has(key)) {
                    visited.add(key);
                    parent[nr][nc] = { r, c };
                    stack.push({ r: nr, c: nc });
                    this.flashInQueue(nr, nc);
                }
            }
        }
        return null;
    }

    // Internal BFS for dynamic mode: finds path silently without visualization
    findPathBFS(startPos, goalPos) {
        const queue = [{ r: startPos.r, c: startPos.c }];
        const visited = new Set();
        const parent = Array.from({ length: this.app.settings.size }, () =>
            Array.from({ length: this.app.settings.size }, () => ({ r: -1, c: -1 }))
        );
        visited.add(`${startPos.r},${startPos.c}`);
        while (queue.length > 0) {
            const { r, c } = queue.shift();
            if (r === goalPos.r && c === goalPos.c) {
                const path = [];
                let cr = r, cc = c;
                while (cr !== -1 && cc !== -1) {
                    path.push({ r: cr, c: cc });
                    const p = parent[cr][cc];
                    cr = p.r; cc = p.c;
                }
                path.reverse();
                return path;
            }
            for (const [dr, dc] of this.app.DIRS) {
                const nr = r + dr, nc = c + dc;
                const key = `${nr},${nc}`;
                if (nr >= 0 && nr < this.app.settings.size && nc >= 0 && nc < this.app.settings.size &&
                    !this.app.grid[nr][nc].classList.contains('obstacle') && !visited.has(key)) {
                    visited.add(key);
                    parent[nr][nc] = { r, c };
                    queue.push({ r: nr, c: nc });
                    this.flashInQueue(nr, nc);
                }
            }
        }
        return null;
    }

    // Internal UCS for dynamic mode: finds path silently without visualization
    findPathUCS(startPos, goalPos) {
        const pq = new MinHeap();
        const dist = Array.from({ length: this.app.settings.size }, () =>
            Array(this.app.settings.size).fill(Number.MAX_SAFE_INTEGER)
        );
        const parent = Array.from({ length: this.app.settings.size }, () =>
            Array.from({ length: this.app.settings.size }, () => ({ r: -1, c: -1 }))
        );
        dist[startPos.r][startPos.c] = 0;
        pq.push({ cost: 0, r: startPos.r, c: startPos.c });
        const visited = new Set();
        while (!pq.isEmpty()) {
            const { cost, r, c } = pq.pop();
            const key = `${r},${c}`;
            if (visited.has(key)) continue;
            visited.add(key);
            if (r === goalPos.r && c === goalPos.c) {
                const path = [];
                let cr = r, cc = c;
                while (cr !== -1 && cc !== -1) {
                    path.push({ r: cr, c: cc });
                    const p = parent[cr][cc];
                    cr = p.r; cc = p.c;
                }
                path.reverse();
                return path;
            }
            for (const [dr, dc] of this.app.DIRS) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < this.app.settings.size && nc >= 0 && nc < this.app.settings.size &&
                    !this.app.grid[nr][nc].classList.contains('obstacle')) {
                    const newDist = dist[r][c] + 1;
                    if (newDist < dist[nr][nc]) {
                        dist[nr][nc] = newDist;
                        parent[nr][nc] = { r, c };
                        pq.push({ cost: newDist, r: nr, c: nc });
                        this.flashInQueue(nr, nc);
                    }
                }
            }
        }
        return null;
    }

    // Internal Greedy Best-First for dynamic mode: finds path silently without visualization
    findPathGreedy(startPos, goalPos) {
        const pq = new MinHeap();
        const visited = new Set();
        const parent = Array.from({ length: this.app.settings.size }, () =>
            Array.from({ length: this.app.settings.size }, () => ({ r: -1, c: -1 }))
        );
        pq.push({ cost: this.app.heuristic(startPos.r, startPos.c), r: startPos.r, c: startPos.c });
        visited.add(`${startPos.r},${startPos.c}`);
        while (!pq.isEmpty()) {
            const { r, c } = pq.pop();
            if (r === goalPos.r && c === goalPos.c) {
                const path = [];
                let cr = r, cc = c;
                while (cr !== -1 && cc !== -1) {
                    path.push({ r: cr, c: cc });
                    const p = parent[cr][cc];
                    cr = p.r; cc = p.c;
                }
                path.reverse();
                return path;
            }
            for (const [dr, dc] of this.app.DIRS) {
                const nr = r + dr, nc = c + dc;
                const key = `${nr},${nc}`;
                if (nr >= 0 && nr < this.app.settings.size && nc >= 0 && nc < this.app.settings.size &&
                    !this.app.grid[nr][nc].classList.contains('obstacle') && !visited.has(key)) {
                    visited.add(key);
                    parent[nr][nc] = { r, c };
                    pq.push({ cost: this.app.heuristic(nr, nc), r: nr, c: nc });
                    this.flashInQueue(nr, nc);
                }
            }
        }
        return null;
    }

    async findPathAStarDynamic(startPos, goalPos) {
        const pq = new MinHeap();
        const gScore = Array.from({ length: this.app.settings.size }, () =>
            Array(this.app.settings.size).fill(Number.MAX_SAFE_INTEGER)
        );
        const parent = Array.from({ length: this.app.settings.size }, () =>
            Array.from({ length: this.app.settings.size }, () => ({ r: -1, c: -1 }))
        );

        gScore[startPos.r][startPos.c] = 0;
        pq.push({ cost: this.app.heuristic(startPos.r, startPos.c), r: startPos.r, c: startPos.c });

        const visited = new Set();
        let enqueueCounter = 0;

        while (!pq.isEmpty()) {
            if (this.app.stopped) return null;
            while (this.app.paused) {
                await sleep(50);
            }

            const { r, c } = pq.pop();
            const key = `${r},${c}`;

            if (visited.has(key)) continue;
            visited.add(key);

            if (r === goalPos.r && c === goalPos.c) {
                const path = [];
                let cr = r, cc = c;
                while (cr !== -1 && cc !== -1) {
                    path.push({ r: cr, c: cc });
                    const p = parent[cr][cc];
                    cr = p.r;
                    cc = p.c;
                }
                path.reverse();
                return path;
            }

            for (const [dr, dc] of this.app.DIRS) {
                const nr = r + dr, nc = c + dc;
                if (
                    nr >= 0 && nr < this.app.settings.size &&
                    nc >= 0 && nc < this.app.settings.size &&
                    !this.app.grid[nr][nc].classList.contains('obstacle')
                ) {
                    const tentative = gScore[r][c] + 1;
                    if (tentative < gScore[nr][nc]) {
                        parent[nr][nc] = { r, c };
                        gScore[nr][nc] = tentative;
                        pq.push({ cost: tentative + this.app.heuristic(nr, nc), r: nr, c: nc });
                        this.flashInQueue(nr, nc);
                        enqueueCounter++;
                        if (enqueueCounter % 12 === 0) {
                            await this.yieldToRenderer();
                        }
                    }
                }
            }
        }

        return null;
    }

    // Internal A* for replanning: finds path silently without visualization
    findPathAStar(startPos, goalPos) {
        const pq = new MinHeap();
        const gScore = Array.from({ length: this.app.settings.size }, () =>
            Array(this.app.settings.size).fill(Number.MAX_SAFE_INTEGER)
        );
        const parent = Array.from({ length: this.app.settings.size }, () =>
            Array.from({ length: this.app.settings.size }, () => ({ r: -1, c: -1 }))
        );

        gScore[startPos.r][startPos.c] = 0;
        pq.push({ cost: this.app.heuristic(startPos.r, startPos.c), r: startPos.r, c: startPos.c });

        const visited = new Set();

        while (!pq.isEmpty()) {
            const { r, c } = pq.pop();
            const key = `${r},${c}`;

            if (visited.has(key)) continue;
            visited.add(key);

            if (r === goalPos.r && c === goalPos.c) {
                const path = [];
                let cr = r, cc = c;
                while (cr !== -1 && cc !== -1) {
                    path.push({ r: cr, c: cc });
                    const p = parent[cr][cc];
                    cr = p.r;
                    cc = p.c;
                }
                path.reverse();
                return path;
            }

            for (const [dr, dc] of this.app.DIRS) {
                const nr = r + dr, nc = c + dc;
                if (
                    nr >= 0 && nr < this.app.settings.size &&
                    nc >= 0 && nc < this.app.settings.size &&
                    !this.app.grid[nr][nc].classList.contains('obstacle')
                ) {
                    const tentative = gScore[r][c] + 1;
                    if (tentative < gScore[nr][nc]) {
                        parent[nr][nc] = { r, c };
                        gScore[nr][nc] = tentative;
                        pq.push({ cost: tentative + this.app.heuristic(nr, nc), r: nr, c: nc });
                    }
                }
            }
        }
        return null;
    }
}
