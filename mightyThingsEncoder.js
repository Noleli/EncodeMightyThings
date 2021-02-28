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
        
        this.inputStrings = ["DARE", "MIGHTY", "THINGS hel300lo 3D 42", "34 11 58 N 118 10 31 W"];
        this.outputStrings = [];
    }
    
    tokenize(inString) {       
        // turn each string into an array of characters or numbers, ignoring spaces
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
                        return d.split("");
                    }
                }
                else {
                    return d.split("");
                }
            });
        });
                
        console.log(charArray.flat(2));
    }
}

const encoder = new MightyThingsEncoder();
encoder.tokenize(encoder.inputStrings[3]);
