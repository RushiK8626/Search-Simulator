const ALGORITHM = Object.freeze({
    DFS: "dfs",
    BFS: "bfs",
    UCS: "ucs",
    GREEDY: "greedy",
    ASTAR: "astar"
});

const ALGORITHM_MAP = {
    dfs: "Depth First Search",
    bfs: "Breadth First Search",
    ucs: "Uniform Cost Search",
    greedy: "Best First Search",
    astar: "A Star Search",
};

const ALGORITHM_INFO = {
    dfs: "Goes deep along one path before backtracking. Uses less memory, but does not guarantee the shortest path",
    bfs: "Explores all neighbors level by level. Guarantees shortest path in unweighted grids.",
    ucs: "Expands the path with the lowest total cost so far. Guarantees the optimal path when step costs are non-negative.",
    greedy: "Chooses the node that looks closest to the goal using only heuristic value. Usually fast, but not guaranteed shortest.",
    astar: "Combines path cost so far and heuristic estimate to goal. Efficient and guarantees shortest path when the heuristic is admissible.",
};

const HEURISTIC = Object.freeze({
    EUCLIDIAN: "euclidian",
    MANHATTAN: "manhattan",
    CHEBYSHEV: "chebyshev",
});

const HEURISTIC_INFO = {
    euclidian: "Straight-line distance to the goal. Good when movement can be in any direction.",
    manhattan: "Sum of horizontal and vertical moves to the goal. Best for 4-direction grid movement.",
    chebyshev: "Maximum of horizontal and vertical difference. Useful when diagonal moves cost the same as straight moves."
};

const HEURISTIC_MAP = {
    euclidian: "Euclidian Distance",
    manhattan: "Manhattan Distance",
    chebyshev: "Chebyshev Distance"
};

const MODE = {
    IDLE: "idle",
    SELECTSTART: "selectStart",
    SELECTGOAL: "selectGoal"
};

export { ALGORITHM, ALGORITHM_MAP, ALGORITHM_INFO, HEURISTIC, HEURISTIC_MAP, HEURISTIC_INFO, MODE };