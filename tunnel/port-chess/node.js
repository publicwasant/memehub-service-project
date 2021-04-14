class TempleteSet {
    constructor () {
        this.set = {
            table: "<table{^id='@id'}{^class='@class'}{^style='@style'}{^@event='@func'}>{@in}</table>",
            tbody: "<tbody{^id='@id'}{^class='@class'}{^style='@style'}{^@event='@func'}>{@in}</tbody>",
            tr: "<tr{^id='@id'}{^class='@class'}{^style='@style'}{^@event='@func'}>{@in}</tr>",
            td: "<td{^id='@id'}{^class='@class'}{^style='@style'}{^@event='@func'}>{@in}</td>",
            div: "<div{^id='@id'}{^class='@class'}{^style='@style'}{^@event='@func'}>{@in}</div>",
            span: "<span{^id='@id'}{^class='@class'}{^style='@style'}{^@event='@func'}>{@in}</span>",
            p: "<p{^id='@id'}{^class='@class'}{^style='@style'}{^@event='@func'}>{@in}</p>",
            img: "<img{^id='@id'}{^class='@class'}{^style='@style'}{^@event='@func'}{^src='@src'}{^width='@width'}{^height='@height'}>"
        }
    }
}

class Node {
    constructor (state) {
        this.state = (state == null) ? [] : state;
        this.builder = {previous: null};
        this.html;
    }

    build () {
        if (this.builder.previous == null) {
            this.builder.previous = document.body;
            this.html = this.#__nodeConstruct(this.state);

            document.body.innerHTML += this.html;
        } else {
            this.html = this.#__nodeConstruct(this.state);
            document.body.innerHTML = this.builder.previous;
            document.body.innerHTML += this.html;
        }
    }

    drop () {
        if (this.build.previous != null) {
            document.body.innerHTML = this.build.previous;
        }
    }

    get (id) {
        const searchByRecur = (__state__, __attr__, __found__) => {
            if (__found__ == null) {
                for (let [key, val] of Object.entries(__state__)) {
                    if (typeof(val) == 'object') {
                        __found__ = searchByRecur(val, __attr__, __found__);
                    } else if (key == __attr__.key && val == __attr__.val) {
                        return {
                            id: __state__.id,
                            state: __state__,
                            document: document.getElementById(__state__.id)
                        };
                    }
                }
            }
    
            return __found__;
        }

        return searchByRecur(this.state, {key: 'id', val: id}, null);
    }

    #__nodeConstruct (state) {
        const tempSet = new TempleteSet();

        const constructByRecur = (__state__) => {
            let finalHTML = new String();

            for (let [key, item] of Object.entries(__state__)) {
                let innerHTML = tempSet.set[key];

                if (innerHTML != null) {
                    for (let [attr, val] of Object.entries(item)) {
                        innerHTML = (typeof(val) == 'object') ? (
                            innerHTML.replaceAll('@' + attr, constructByRecur(val))
                        ) : (
                            innerHTML.replaceAll('@' + attr, val)
                        );
                    }

                    finalHTML = finalHTML + cleaner(innerHTML);
                } else {
                   finalHTML = finalHTML + constructByRecur(item);
                }
            }

            return finalHTML;
        };

        const cleaner = (_innerHTML_) => {
            let open = false;
            let temp = new String();
            let result = _innerHTML_;

            for (const i in _innerHTML_) {
                if (_innerHTML_[i] == '{') open = true;
                if (_innerHTML_[i] == '}') open = false;

                if (open) {
                    temp += _innerHTML_[i];
                } else if (temp.length != 0) {
                    let attr = temp + _innerHTML_[i];

                    if (attr == '{@in}' || attr.includes('@')) {
                        result = result.replaceAll(attr, '');
                    } 

                    temp = new String();
                }
            }

            result = result.replaceAll('{', '');
            result = result.replaceAll('}', '');
            result = result.replaceAll('^', ' ');

            return result;
        };

        return constructByRecur(state);
    }
}