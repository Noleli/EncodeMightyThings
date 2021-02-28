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
        
        this.interByteGap = 3;
        this.interByteChar = "0";
        this.padChar = "1";
        
        // there are 4 rows of bits. each one has some amount of padding at the
        // beginning. they are ordered from the center to the edge.
        this.startBits = [1, 41, 21, 1];
        
        this.letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        
        this.inputString = "";
        this.outputStrings = "";
    }
    
    tokenize() {       
        // turn each string into an array of characters or numbers, ignoring
        // spaces. if a number is < 128, return a number; otherwise characters.
        const words = this.inputString.split(" ");
        
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
                
        const tokens = charArray.flat(2);
        if(tokens.length > 8) {
            throw "Word must be 8 tokens or fewer.";
        }
        else {
            this.tokens = tokens;
        }
    }
    
    binEncoder(token) {
        let numVal;
        if(typeof(token) == "string") {
            numVal = this.letters.indexOf(token) + 1;
            if(numVal < 1) {
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
        
        return binVal.join("");
    }
    
    encode() {
        this.tokenize(this.inputString);
        return this.tokens.map(t => this.binEncoder(t));
    }
    
    encodePadded(row) {
        const encoded = this.encode(this.inputString);
        
        // pad between each byte
        let padded = encoded.join(this.interByteChar.repeat(this.interByteGap));
        
        // pad before all bytes
        padded = this.interByteChar.repeat(this.interByteGap) + padded;
        
        // pad after all bytes (if there's room)
        if(this.tokens.length < 8) {
            padded = padded + this.interByteChar.repeat(this.interByteGap);
        }
        
        // pad the end until there are 80 bits
        while(padded.length < 80) {
            padded += this.padChar;
        }
        
        console.log(padded);
        // rotate the array so it starts on the right place based on the row
        padded = padded.split("").map((v, i, ar) => {
            let shiftedIndex = (i - this.startBits[row]) % ar.length;
            shiftedIndex += shiftedIndex < 0 ? ar.length : 0;
            return ar[shiftedIndex];
        }).join("");
        
        return padded;
    }
}

const inputStrings = ["DARE", "MIGHTY", "THINGS", "34 11 58 N 118 10 31 W"];

const encoder = new MightyThingsEncoder();
encoder.inputString = inputStrings[0];

console.log(encoder.encodePadded(0));
