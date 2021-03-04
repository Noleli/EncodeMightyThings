class ChuteVisualizer {
    constructor(containerSelector) {
        this.container = d3.select(containerSelector);
        
        this.svg = this.container.append("svg");
        this.radialContainer = this.svg.append("g");
        this.parachute = this.radialContainer.append("g");
        this.explanatory = this.radialContainer.append("g");
        this.margin = 2;
        
        // inner and outer radius of each ring as a proportion of the total radius
        this.ringProportions = [[0.09, 0.37], [0.37, 0.63], [0.63, 0.80], [0.90, 1]];
        
        // not doing this in CSS so it's a legit exportable SVG
        this.colors = {
            dataTrue: "#D24A4C",
            dataFalse: "#FFFFFF",
            preWordPadding: "#555555",
            interBytePadding: "#AAAAAA",
            postWordPadding: "#555555",
            postDataPadding: "#A83B3D"
        };
        
        this.angle = d3.scaleLinear()
            .range([0, 2 * Math.PI]);
                
        this.size();
        // this.update(); // probably in the constructor for debug only
    }
    
    updateData() {
        this.data = strings.map((s, i) => encoder.encodePadded(i, s));
        this.update();
    }
    
    update() {
        this.angle
            .domain([0, this.data[0].length]); // in case the number of bits changed (although there's no UI for that)
        
        const rings = this.parachute.selectAll("g.ring").data(this.data);
        rings.join("g")
            .attr("class", "ring")
            .each((rowData, rowIndex, rowG) => {
                const row = d3.select(rowG[rowIndex]);
                let bits = row.selectAll("g.bit").data(d => d);
                
                const bitsEnter = bits.enter().append("g").attr("class", "bit");
                bitsEnter.append("path").attr("class", "bitPath");
                bits = bits.merge(bitsEnter);
                
                bits.select("path.bitPath")
                    .attr("d", (b, bitIndex) => this.makePath(bitIndex, rowIndex))
                    .attr("stroke", "#111111")
                    .attr("stroke-width", this.radius/600)
                    .attr("fill", d => {
                        if(explain) {
                            if(d.role == "data") {
                                return d.value ? this.colors.dataTrue : this.colors.dataFalse;
                            }
                            else {
                                return this.colors[d.role];
                            }
                        }
                        else {
                            return d.value ? this.colors.dataTrue : this.colors.dataFalse;
                        }
                    });
            });
            
        const explanatoryRings = this.explanatory.selectAll("g.ring").data(this.data);
        explanatoryRings.join("g").attr("class", "ring").each((rowData, rowIndex, rowG) => {
            const row = d3.select(rowG[rowIndex]);
            let bits = row.selectAll("g.bit").data(d => d);
            
            const bitsEnter = bits.enter().append("g").attr("class", "bit");
            bitsEnter.append("text").attr("class", "token");
            bits = bits.merge(bitsEnter);
            
            bits.select("text.token")
                .text(d => d.bit === 3 && explain ? d.token : "")
                .attr("font-family", "Helvetica, sans-serif")
                .attr("font-weight", "bold")
                .attr("font-size", this.radius/12)
                .attr("stroke", "#FFFFFF")
                .attr("stroke-width", this.radius/300)
                .attr("x", (d, bitIndex) => this.center(bitIndex, rowIndex)[0])
                .attr("y", (d, bitIndex) => this.center(bitIndex, rowIndex)[1])
                .attr("dx", (d, i, n) => -n[i].getBBox().width/2)
                .attr("dy", this.radius/12 * .4);
        });
    }
    
    makePath(bitIndex, rowIndex) {
        // whether or not the inner and outer edges of the rings have angled stitching
        const stitched = [[false, true], [true, true], [true, false], [false, false]];
        const stitchDepth = 0.04; // proportion of radius
        
        const innerRadius = this.radius * this.ringProportions[rowIndex][0];
        const outerRadius = this.radius * this.ringProportions[rowIndex][1];
        
        // arbitrary decision: the inner edge of the stitching is on the
        // innerRadius, and the outer edge pokes outside of it.
        
        // odd bits stitch outward going clockwise.
        
        const startAngle = this.angle(bitIndex);
        const endAngle = this.angle(bitIndex + 1);
        
        // define the four corner points as [angle, radius]
        const corners = [];
        if(bitIndex % 2 == 0) {
            corners[0] = [startAngle, innerRadius];
            corners[1] = [startAngle, outerRadius];
            
            if(stitched[rowIndex][1]) {
                corners[2] = [endAngle, outerRadius + this.radius * stitchDepth];
            }
            else {
                corners[2] = [endAngle, outerRadius];
            }
            
            if(stitched[rowIndex][0]) {
                corners[3] = [endAngle, innerRadius + this.radius * stitchDepth];
            }
            else {
                corners[3] = [endAngle, innerRadius];
            }
        }
        else {
            if(stitched[rowIndex][0]) {
                corners[0] = [startAngle, innerRadius + this.radius * stitchDepth];
            }
            else {
                corners[0] = [startAngle, innerRadius];
            }
            
            if(stitched[rowIndex][1]) {
                corners[1] = [startAngle, outerRadius + this.radius * stitchDepth];
            }
            else {
                corners[1] = [startAngle, outerRadius];
            }
            
            corners[2] = [endAngle, outerRadius];
            corners[3] = [endAngle, innerRadius];
        }
        
        const cartesianCorners = corners.map(c => d3.pointRadial(...c));
        
        let pathData = `M ${cartesianCorners[0].join(" ")}
                        L ${cartesianCorners[1].join(" ")}`;
        
        if(stitched[rowIndex][1]) {
            pathData += `L ${cartesianCorners[2].join(" ")}`;
        }
        else {
            pathData += `A ${outerRadius} ${outerRadius} 0 0 1 ${cartesianCorners[2].join(" ")}`;
        }
        
        pathData += `L ${cartesianCorners[3]}`;
        
        if(stitched[rowIndex][0]) {
            pathData += "Z";
        }
        else {
            pathData += `A ${innerRadius} ${innerRadius} 0 0 0 ${cartesianCorners[0].join(" ")}`;
        }
        
        return pathData;
    }
    
    center(bitIndex, rowIndex) {
        const startAngle = this.angle(bitIndex);
        const endAngle = this.angle(bitIndex + 1);
        const avgAngle = (startAngle + endAngle)/2;
        
        const innerRadius = this.radius * this.ringProportions[rowIndex][0];
        const outerRadius = this.radius * this.ringProportions[rowIndex][1];
        const avgRadius = (innerRadius + outerRadius)/2;
        
        return d3.pointRadial(avgAngle, avgRadius);
    }
    
    size() {
        this.outerRadius = 300;
        this.radius = this.outerRadius - this.margin;
        
        this.svg
            .attr("width", 2 * this.outerRadius)
            .attr("height", 2 * this.outerRadius);
            
        this.radialContainer
            .attr("transform", `translate(${this.outerRadius}, ${this.outerRadius})`);
        
        
        
    }
}

class UIControls {
    constructor(containerSelector) {
        this.container = d3.select(containerSelector);
        
        this.container.html(`<label><input id="explainToggle" type="checkbox"> Explain</label>
            <div class="textboxContainer"></div>`);
        
        this.explainCheckbox = this.container.select("#explainToggle")
            .on("change", e => {
                const checked = e.currentTarget.checked;
                explain = checked;
                this.update();
                vis.update();
            });
        
        this.textboxContainer = this.container.select(".textboxContainer");
    }
    
    update() {
        this.explainCheckbox.property("checked", explain);
        
        let textboxes = this.textboxContainer.selectAll("div.textbox").data(strings);
        const textboxesEnter = textboxes.enter().append("div").attr("class", "textbox");
        textboxesEnter.append("label")
            .attr("for", (d, i) => "textbox" + i)
            .text((d, i) => "Textbox " + i); // todo
        textboxesEnter.append("input")
            .attr("id", (d, i) => "texbox" + i)
            .attr("data-index", (d, i) => i) // to be able to get it in event callbacks
            .on("input", (e, d) => {
                let newString = e.target.value.toUpperCase();
                strings[e.currentTarget.dataset.index] = newString;
                this.update();
                vis.updateData();
            });
        textboxes = textboxes.merge(textboxesEnter);
        textboxes.select("input")
            .property("value", d => d);
    }
}

class MightyThingsEncoder {
    constructor() {
        this.totalBits = 80;
        
        this.interByteGap = 3;
        this.interByteVal = false;
        this.padVal = true;
        
        // there are 4 rows of bits. each one has some amount of padding at the
        // beginning. they are ordered from the center to the edge.
        this.startBits = [1, 41, 21, 1];
        
        this.letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        
        this.inputString = "";
        this.outputStrings = "";
    }
    
    tokenize(inputString) {
        // turn each string into an array of characters or numbers, ignoring
        // spaces. if a number is < 128, return a number; otherwise characters.
        if(inputString !== undefined) this.inputString = inputString;
        
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
        
        return tokens;
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
    
    encode(inputString) {
        if(inputString !== undefined) {
            this.inputString = inputString;
        }
        this.tokenize(this.inputString);
        return this.tokens.map(t => this.binEncoder(t));
    }
    
    encodePadded(row, inputString) {
        if(inputString !== undefined) {
            this.inputString = inputString;
        }
        
        let encoded = this.encode(this.inputString);
        encoded = encoded.map((encodedToken, byteIndex) => {
            return encodedToken.split("").map((bit, bitIndex) => {
                return {
                    byte: byteIndex,
                    bit: bitIndex,
                    role: "data",
                    token: this.tokens[byteIndex],
                    value: bit === "1"
                }
            });
        });
        
        // pad between each byte
        for(let i = 1; encoded.length < 2 * encoder.tokens.length - 1; i += 2) {
            encoded.splice(i, 0, Array(this.interByteGap).fill({
                role: "interBytePadding",
                value: this.interByteVal
            }));
        }

        // pad before all bytes
        encoded.unshift(Array(this.interByteGap).fill({
            role: "preWordPadding",
            value: this.interByteVal
        }));
        
        // pad after all bytes (if there's room)
        if(this.tokens.length < 8) {
            encoded.push(Array(this.interByteGap).fill({
                role: "postWordPadding",
                value: this.interByteVal
            }));
        }
        
        encoded = encoded.flat();
        
        // pad the end until there are 80 bits
        encoded.push(...Array(this.totalBits - encoded.length).fill({
            role: "postDataPadding",
            value: this.padVal
        }));
       
        
        // rotate the array so it starts on the right place based on the row
        encoded = encoded.map((v, i, ar) => {
            let shiftedIndex = (i - this.startBits[row]) % ar.length;
            shiftedIndex += shiftedIndex < 0 ? ar.length : 0;
            return ar[shiftedIndex];
        });
        
        return encoded;
    }
}

const encoder = new MightyThingsEncoder();
const vis = new ChuteVisualizer("#chuteContainer");
const ui = new UIControls("#uiControls");

const strings = ["DARE", "MIGHTY", "THINGS", "34 11 58 N 118 10 31 W"];
let explain = false;

function init() {
    vis.updateData();
    ui.update();
}
init();

