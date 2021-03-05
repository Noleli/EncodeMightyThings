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
            interBytePadding: "#CCCCCC",
            postWordPadding: "#555555",
            postDataPadding: "#882a2c"
        };
        
        this.angle = d3.scaleLinear()
            .range([0, 2 * Math.PI]);
                
        this.size();
        
        this.windowWidth = 0;
        this.windowHeight = 0;
        d3.select(window).on("resize.vis", () => {
            // there's a mobile safari bug that fires resize events when scrolling,
            // so manually track the window size. https://stackoverflow.com/a/29940941
            const newWidth = document.documentElement.clientWidth;
            const newHeight = document.documentElement.clientHeight
            if(this.windowWidth !== newWidth || this.windowHeight != newHeight) {
                // catching a special case for rotating devices that have width 768.
                // gotta run it twice. kinda janky, but here we are. I think it
                // has to do with scrollbars.
                if(newWidth <= 768 && this.windowWidth > 768 || newWidth == 768) {
                    this.size();
                    this.update();
                }
                this.size();
                this.update();
            }
        });
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
                    .attr("stroke", d => {
                        const normalColor = "#111111";
                        // const nonDataColor = "none";
                        if(explain) {
                            if(d.role == "data") {
                                return normalColor;
                            }
                            else {
                                return this.colors[d.role];
                            }
                        }
                        else {
                            return normalColor;
                        }
                    })
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
                .attr("font-size", this.radius/8)
                .attr("stroke", "#FFFFFF")
                .attr("stroke-width", this.radius/200)
                .attr("x", (d, bitIndex) => this.center(bitIndex, rowIndex)[0])
                .attr("y", (d, bitIndex) => this.center(bitIndex, rowIndex)[1])
                .attr("dx", (d, i, n) => -n[i].getBBox().width/2)
                .attr("dy", this.radius/8 * .4);
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
        this.svg.attr("width", 0);
        const containerContainerStyle = getComputedStyle(this.container.node());
        const availableWidth = parseFloat(containerContainerStyle.getPropertyValue("width"))
            - parseFloat(containerContainerStyle.getPropertyValue("padding-left"))
            - parseFloat(containerContainerStyle.getPropertyValue("padding-right"));
        
        this.windowWidth = document.documentElement.clientWidth;
        this.windowHeight = document.documentElement.clientHeight;
        const availableHeight = this.windowHeight - 20;
                
        this.outerRadius = Math.min(availableWidth, availableHeight)/2;
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
        
        this.textboxNames = ["Inner ring", "Ring 2", "Ring 3", "Outer ring"];
        
        this.container.html(`<div class="textboxContainer"></div>
            <div class="form-check"><label><input id="explainToggle" type="checkbox" class="form-check-input"> Explain</label></div>`);
        
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
        const textboxesEnter = textboxes.enter().append("div").attr("class", "textbox")
            .html((d, i) => `<div class="mb-3">
                                <label for="textbox${i}" class="form-label">${this.textboxNames[i]}</label>
                                <input class="form-control" id="textbox${i}" placeholder="${strings[i]}" data-index="${i}">
                            </div>`);
            
        textboxesEnter.select("input").on("input", (e, d) => {
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
        if(this.tokens.length > 0) {
            encoded.unshift(Array(this.interByteGap).fill({
                role: "preWordPadding",
                value: this.interByteVal
            }));
        }
        
        // pad after all bytes (if there's room)
        if(this.tokens.length < 8 && this.tokens.length > 0) {
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
    ui.update();
    vis.size();
    vis.updateData();
}
init();
