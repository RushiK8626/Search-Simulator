// Min-heap priority queue implementation
export class MinHeap {
    constructor() {
        this.heap = [];
    }

    push(val) {
        this.heap.push(val);
        this.bubbleUp();
    }

    pop() {
        const min = this.heap[0];
        const end = this.heap.pop();
        if (this.heap.length > 0) {
            this.heap[0] = end;
            this.bubbleDown();
        }
        return min;
    }

    bubbleUp() {
        let i = this.heap.length - 1;

        while (i > 0) {
            let parent = Math.floor((i - 1) / 2);

            if (this.heap[parent].cost <= this.heap[i].cost) break;

            [this.heap[parent], this.heap[i]] =
                [this.heap[i], this.heap[parent]];

            i = parent;
        }
    }

    bubbleDown() {
        let i = 0;

        while (true) {
            let left = 2 * i + 1;
            let right = 2 * i + 2;
            let smallest = i;

            if (left < this.heap.length &&
                this.heap[left].cost < this.heap[smallest].cost)
                smallest = left;

            if (right < this.heap.length &&
                this.heap[right].cost < this.heap[smallest].cost)
                smallest = right;

            if (smallest === i) break;

            [this.heap[i], this.heap[smallest]] =
                [this.heap[smallest], this.heap[i]];

            i = smallest;
        }
    }

    isEmpty() {
        return this.heap.length === 0;
    }
}

