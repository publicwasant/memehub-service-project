class ChessPieces extends Node {
    #prebuild;

    constructor (option) {
        super ();

        this.option = option;
        this.size = {
            type: option.size.type,
            width: option.size.width,
            height: option.size.height
        };

        this.initSet = (option.initSet == null) ? [
            ['wp1', 'wp'], ['wp2', 'wp'], ['wp3', 'wp'], ['wp4', 'wp'], ['wp5', 'wp'], ['wp6', 'wp'], ['wp7', 'wp'], ['wp8', 'wp'],
            ['wr1', 'wr'], ['wr2', 'wr'], ['wn1', 'wn'], ['wn2', 'wn'], ['wb1', 'wb'], ['wb2', 'wb'], ['wq', 'wq'], ['wk', 'wk'], 
            ['bp1', 'bp'], ['bp2', 'bp'], ['bp3', 'bp'], ['bp4', 'bp'], ['bp5', 'bp'], ['bp6', 'bp'], ['bp7', 'bp'], ['bp8', 'bp'],
            ['br1', 'br'], ['br2', 'br'], ['bn1', 'bn'], ['bn2', 'bn'], ['bb1', 'bb'], ['bb2', 'bb'], ['bq', 'bq'], ['bk', 'bk']
        ] : option.initSet;
        this.#prebuild = this.#__prebuild();
    }

    build () {
        this.state = this.#prebuild.pieces;

        super.build();
    }

    getPieces () {
        let pieces = [];

        if (this.builder.previous != null) {
            for (let [key, val] of Object.entries(this.#prebuild.piecesId)) {
                pieces.push(this.get(val));
            }
        }

        return pieces;
    }

    #__prebuild () {
        let pieces = [];
        let piecesId = [];

        for (let [key, val] of Object.entries(this.initSet)) {
            let id = val[0];
            let className = 'piece ' + val[1];
            let style = 'width:' + this.size.width + this.size.type + ';'
                        +'height:' + this.size.height + this.size.type + ';';

            pieces.push({
                div: {
                    id: id,
                    class: className,
                    style: style
                }
            });

            piecesId.push(id);
        }

        return {pieces: pieces, piecesId: piecesId};
    }
}