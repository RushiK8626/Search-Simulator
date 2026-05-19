// Promise-based delay
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Fisher-Yates shuffle algorithm
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export { sleep, shuffle };