class Animator {
    #__movementPorcess;

    constructor () {
        this.#__movementPorcess = {task: false, queue: []};
    }

    paste (fromPiece, toSubBoard) {
        let pieceRect = fromPiece.document.getBoundingClientRect();
        let subBoardRect = toSubBoard.document.getBoundingClientRect();
        
        fromPiece.document.style.left = (subBoardRect.x + 1) + 'px';
        fromPiece.document.style.top = (subBoardRect.y + 1) + 'px';
    }

    enQueueMovement (fromPiece, toSubBoard) {
        this.#__movementPorcess.queue.push({fromPiece: fromPiece, toSubBoard: toSubBoard});

        let movementSchedule = () => {
            setTimeout(() => {
                if (this.#__movementPorcess.queue.length != 0) {
                    if (!this.#__movementPorcess.task) {
                        let queue = this.#__movementPorcess.queue.shift();

                        console.log(queue.fromPiece.id, queue.toSubBoard.id);

                        this.#__movementByDDA(queue.fromPiece, queue.toSubBoard);
                    }
                    
                    movementSchedule();
                }
            }, 1);
        };

        if (this.#__movementPorcess.queue.length != 0) {
            movementSchedule();
        }
    }

    #__movementByDDA (fromPiece, toSubBoard) {
        this.#__movementPorcess.task = true;

        let pieceRect = fromPiece.document.getBoundingClientRect();
        let subBoardRect = toSubBoard.document.getBoundingClientRect();

        let x1 = pieceRect.x;
        let y1 = pieceRect.y;
        let x2 = subBoardRect.x;
        let y2 = subBoardRect.y;

        let dx = x2 - x1;
        let dy = y2 - y1;

        let steps = Math.abs(dx) > Math.abs(dy) ? Math.abs(dx) : Math.abs(dy);

        let xinc = dx / steps;
        let yinc = dy / steps;

        let x = x1;
        let y = y1;

        let reach = 0;
        let traction = 0.25;

        let movement = () => {
            setTimeout(() => {
                if (reach < (steps*2)/(reach * traction)) {
                    fromPiece.document.style.left = x + 'px';
                    fromPiece.document.style.top = y + 'px'

                    x += xinc * (reach * traction);
                    y += yinc * (reach * traction);
                    reach += 1;

                    movement();
                } else {
                    this.#__movementPorcess.task = false;
                    this.paste(fromPiece, toSubBoard);
                }
            }, 10);
        };

        movement();
    }
}