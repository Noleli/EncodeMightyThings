class ChuteVisualizer {
    constructor(containerSelector) {
        this.container = d3.select(containerSelector);
    }
    
    update() {
        
    }
}

class MightyThingsEncoder {
    constructor() {
        this.totalBits = 80;
        this.interBitGap = 3;
        
        // there are 4 rows of bits. each one has some amount of padding at the
        // beginning. they are ordered from the center to the edge.
        this.startBits = [4, 44, 24, 4];
        
        this.letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        this.inputStrings = ["DARE", "MIGHTY", "THINGS", "34 11 58 N 118 10 31 W"];
        this.outputStrings = [];
    }
    
    tokenize(inString) {       
        // turn each string into an array of characters or numbers, ignoring
        // spaces. if a number is < 128, return a number; otherwise characters.
        const words = inString.split(" ");
        
        const charArray = words.map(w => {
            return w.split(/(\d+)|(\D+)/g)
            .filter(d => d !== "" && d !== undefined)
            .map(d => {
                if(!isNaN(parseInt(d))) {
                    const num = parseInt(d);
                    if(num < 128) {
                        return num;
                    }
                    else {
                        throw "Number is greater than available bit width. Numbers must be 0--127.";
                    }
                }
                else {
                    return d.split("");
                }
            });
        });
                
        return charArray.flat(2);
    }
    
    binEncoder(token) {
        let numVal;
        if(typeof(token) == "string") {
            numVal = this.letters.indexOf(token) + 1;
            if(numVal < 0) {
                throw "Letters must be capital letters A--Z.";
            }
        }
        else {
            numVal = token;
        }
        const binVal = numVal.toString(2).split("");
        
        while(binVal.length < 7) {
            binVal.splice(0, 0, "0");
        }
        
        return binVal;
    }
    
    encode(inString) {
        const tokens = this.tokenize(inString);
        return tokens.map(t => this.binEncoder(t));
    }
}

const encoder = new MightyThingsEncoder();

console.log(encoder.encode(encoder.inputStrings[3]));
