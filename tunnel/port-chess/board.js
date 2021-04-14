class ChessBoard extends Node {
    #prebuild;

    constructor (option) {
        super();

        this.option = option;
        this.size = {
            type: option.size.type,
            rows: option.size.rows,
            cols: option.size.cols,
            extraSize: {width: option.size.width, height: option.size.height},
            subBoardSize: {width: this.option.size.width/this.option.size.rows, height: this.option.size.height/this.option.size.cols},
        }

        this.#prebuild = this.#__prebuild();
    }

    build () {
        this.state = [{
            table: {
                id: this.option.id,
                class: 'board',
                in: [{
                    tbody: {
                        in: this.#prebuild.subBoards
                    }
                }]
            }
        }];

        super.build();
    }

    getSubBoards () {
        let subBoards = [];

        if (this.builder.previous != null) {
            for (let [key, val] of Object.entries(this.#prebuild.subBoardsId)) {
                subBoards.push(this.get(val));
            }
        }

        return subBoards;
    }

    #__prebuild () {
        let subBoards = [];
        let subBoardsId = [];

        for (let i = 0; i < this.size.rows; i++) {
            let row = {tr: {in: []}};

            for (let j = 0; j < this.size.cols; j++) {
                let id = String.fromCharCode(97 + j) + (this.size.rows - i);
                let className = 'subBoard ' + this.option.theme[i % 2][j % 2];
                let style = 'width:' + this.size.subBoardSize.width + this.size.type + ';'
                            +'height:' + this.size.subBoardSize.height + this.size.type + ';';

                subBoardsId.push(id);
                row.tr.in.push({td: {in: [{div: {class: className, id: id, style: style}}]}});
            }

            subBoards.push(row);
        }

        return {subBoards: subBoards, subBoardsId: subBoardsId};
    }
}