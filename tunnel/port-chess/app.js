class Application {
    #initSet;
    #size;
    #board;
    #pieces;
    
    #animator;

    constructor () {
        this.gameBuilder = {runnable: false, setup: null};

        this.#initSet;
        this.#size;
        this.#board;
        this.#pieces;

        this.#animator;

        this.player = {
            mouse: {x: null, y: null},
            pressed: false,
            pressInPiece: null,
            pressInSubBoard: null,
            clickInPiece: null,
            clickInSubBoard: null,
            moveInPiece: null,
            moveInSubBoard: null
        }
    }

    gameSetup (setup) {
        this.gameBuilder.setup = setup;

        this.#initSet = setup.initSet;
        this.#size = setup.size;
        this.#board = new ChessBoard(setup.board);
        this.#pieces = new ChessPieces(setup.pieces);

        this.#animator = new Animator();

    }

    buildGameSetup () {
        if (this.gameBuilder.setup != null) {
            this.#board.build();
            this.#pieces.build();

            for (let [key, val] of Object.entries(this.#initSet)) {
                this.#animator.paste(this.#pieces.get(val[0]), this.#board.get(val[1]));
            }

            this.gameBuilder.runnable = true;
        }
    }

    run () {
        if (this.gameBuilder.setup == null) return;

        this.#animator.enQueueMovement(this.#pieces.get('wp5'), this.#board.get('e4'));
        this.#animator.enQueueMovement(this.#pieces.get('bp5'), this.#board.get('e5'));
        this.#animator.enQueueMovement(this.#pieces.get('wn2'), this.#board.get('f3'));
        this.#animator.enQueueMovement(this.#pieces.get('bn1'), this.#board.get('c6'));
        this.#animator.enQueueMovement(this.#pieces.get('wb2'), this.#board.get('c4'));
        this.#animator.enQueueMovement(this.#pieces.get('bb2'), this.#board.get('c5'));
        this.#animator.enQueueMovement(this.#pieces.get('wk'), this.#board.get('g1'));
        this.#animator.enQueueMovement(this.#pieces.get('wr2'), this.#board.get('f1'));
        this.#animator.enQueueMovement(this.#pieces.get('bn2'), this.#board.get('f6'));
        this.#animator.enQueueMovement(this.#pieces.get('wp4'), this.#board.get('d3'));

        this.#__buildGameEvent();
        this.#__mainLoop();
    }

    #__mainLoop () {
        setTimeout(() => {

            this.#__mainLoop();
        }, 1000);
    }

    #__buildGameEvent () {
        for (let [key, val] of Object.entries(this.#pieces.getPieces())) {
            let piece = val;

            piece.document.addEventListener('mouseover', () => {
                piece.document.style.cursor = 'grab';
                this.player.moveInPiece = piece;
            });

            piece.document.addEventListener('mouseout', () => {
                piece.document.style.cursor = 'auto';
                this.player.moveInPiece = null;
            });

            piece.document.addEventListener('mousedown', () => {
                piece.document.style.cursor = 'grabbing';
                
                this.player.pressed = true;
                this.player.pressInPiece = piece;
            });

            piece.document.addEventListener('mouseup', () => {
                piece.document.style.cursor = 'auto';

                this.player.pressed = false;
                this.player.pressInPiece = null;
            });

            piece.document.addEventListener('click', () => {
                this.player.clickInPiece = piece;
                this.player.clickInSubBoard = null;
            });
        }

        for (let [key, val] of Object.entries(this.#board.getSubBoards())) {
            let subBoard = val;

            subBoard.document.addEventListener('mouseover', () => {
                this.player.moveInSubBoard = subBoard;

                if (this.player.moveInPiece == null) {
                    subBoard.document.style.border = '3px solid darkgray';
                    subBoard.document.style.width = (this.#pieces.size.width - 4) + this.#pieces.size.type;
                    subBoard.document.style.height = (this.#pieces.size.height - 4) + this.#pieces.size.type;
                }
            });

            subBoard.document.addEventListener('mouseout', () => {
                subBoard.document.style.border = '1px solid #ddd';
                subBoard.document.style.width = this.#pieces.size.width + this.#pieces.size.type;
                subBoard.document.style.height = this.#pieces.size.height + this.#pieces.size.type;
            });

            subBoard.document.addEventListener('click', () => {
                this.player.clickInSubBoard = subBoard;

                if (this.player.clickInPiece != null) {
                    this.#animator.enQueueMovement(this.player.clickInPiece, this.player.clickInSubBoard);
                }

                this.player.clickInPiece = null;
            });
        }

        document.body.addEventListener('mouseup', () => {
            if (this.player.pressed && this.player.pressInPiece != null) {

                this.#animator.enQueueMovement(this.player.pressInPiece, this.player.moveInSubBoard);

                document.body.style.cursor = 'auto';
                this.player.pressInPiece.document.style.pointerEvents = 'all';
            } else if (this.player.pressed && this.player.moveInPiece != null) {
                console.log('xxx');
            }
            
            this.player.pressed = false;
            this.player.pressInPiece = null;
        });

        document.body.addEventListener('mousemove', (event) => {
            this.player.mouse.x = event.clientX;
            this.player.mouse.y = event.clientY;

            if (this.player.pressed && this.player.pressInPiece != null) {
                document.body.style.cursor = 'none';

                this.player.pressInPiece.document.style.pointerEvents = 'none';

                this.player.pressInPiece.document.style.left = (this.player.mouse.x - (this.#pieces.size.width/2)) + 'px';
                this.player.pressInPiece.document.style.top = (this.player.mouse.y - (this.#pieces.size.height/2)) + 'px';
            }
        });
    }
}


const app = new Application();

app.gameSetup({
    initSet: [
        ['wp1', 'a2'], ['wp2', 'b2'], ['wp3', 'c2'], ['wp4', 'd2'],
        ['wp5', 'e2'], ['wp6', 'f2'], ['wp7', 'g2'], ['wp8', 'h2'], 
        ['wr1', 'a1'], ['wr2', 'h1'], ['wn1', 'b1'], ['wn2', 'g1'],
        ['wb1', 'c1'], ['wb2', 'f1'], ['wq', 'd1'], ['wk', 'e1'],
        ['bp1', 'a7'], ['bp2', 'b7'], ['bp3', 'c7'], ['bp4', 'd7'],
        ['bp5', 'e7'], ['bp6', 'f7'], ['bp7', 'g7'], ['bp8', 'h7'], 
        ['br1', 'a8'], ['br2', 'h8'], ['bn1', 'b8'], ['bn2', 'g8'],
        ['bb1', 'c8'], ['bb2', 'f8'], ['bq', 'd8'], ['bk', 'e8'],
    ],
    size: {
        type: 'px', 
        rows: 8,
        cols: 8,
        width: 480, 
        height: 480
    },
    board: {
        id: 'extraBoard', 
        theme: [
            ['mintcream', 'lightsteelblue'],
            ['lightsteelblue', 'mintcream']
        ],
        size: {
            type: 'px', 
            rows: 8,
            cols: 8,
            width: 480, 
            height: 480
        }
    },
    pieces: {
        id: 'extraPieces',
        size: {
            type: 'px', 
            width: 480/8, 
            height: 480/8
        }
    }
});

app.buildGameSetup();
app.run();

