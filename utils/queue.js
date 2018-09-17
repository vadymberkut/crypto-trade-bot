
class Queue {
    constructor(items = []) {
        if(!Array.isArray(items)) {
            throw new Error('Initial items must be an Array!');
        }
        this.items = items;
    }

    add(item) {
        this.items.push(item);
    }

    remove() {
        if(this.isEmpty()) {
            return null;
        }
        return this.shift();
    }

    first() {
        return this.items[0];
    }
    
    last() {
        return this.items[this.items.length - 1];
    }

    size() {
        return this.items.length;
    }

    isEmpty() {
        return this.size() === 0;
    }
}

class PriorityQueue {
    constructor(props) {
        let {
            items = [],
            // fields = [], // list of fields to order by. it empty use value itself
            comparer = ((a, b) => a < b ? -1 : (a > b ? 1 : 0)) // must be redefined for non primitive types
        } = props;

        if(!Array.isArray(items)) {
            throw new Error("'items' must be an Array!");
        }
        // if(!Array.isArray(fields)) {
        //     throw new Error("'fields' must be an Array!");
        // }
        
        this.items = items;
        // this.fields = fields;
        this.comparer = comparer;
    }


    add(item) {
        // Find position to insert new item
        if(this.isEmpty()) {
            this.items.push(item);
        } else {
            let position = -1;

            for(let i = 0; i < this.items.length; i++) {
                let x = this.items[i];
                let compare = this.comparer(item, x);
                if(compare === 1 || compare === 0) {
                    position = i;
                } else {
                    // Found element with bigger priority
                    // No need to go further
                    break;
                }
            }

            if(position === -1) {
                this.items.unshift(item);
            } else if(position >= 0 && position <= this.items.length - 1) {
                // Delete element at found position and insert it back followed 
                // by new item
                let existingAtPosition = this.items[position];
                this.items.splice(position, 1, existingAtPosition, item);

            } else if(position === this.items.length) {
                this.items.push(item);
            }

        }
    }

    remove() {
        if(this.isEmpty()) {
            return null;
        }
        return this.items.shift();
    }

    first() {
        return this.items[0];
    }
    
    last() {
        return this.items[this.items.length - 1];
    }

    size() {
        return this.items.length;
    }

    isEmpty() {
        return this.size() === 0;
    }
}

module.exports =  {
    Queue,
    PriorityQueue
};