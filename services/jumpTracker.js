const JUMPSTARTEDCOUNT = 2;
const VALUEFOUND = 3;
const SAMPLEMAXSIZE = 32;
const MAXJUMPTIME = 1; //EQUIVALENTE A SALTO DE 1.25M
const MINJUMPTIME = 0.4; //EQUIVALENTE A SALTO DE 0.30M
const MAX1THRESHOLD = 2;
const MAX2THRESHOLD = 1.5;
const MINTHRESHOLD = -1.1;
const GRAVITY = 9.80665;
const DATATOSTORE = 2;
const SAMPLEFREQUENCY = 20;

var ft = require('fourier-transform');

class JumpTracker {

    constructor() {
        this.sampleSize = 0;
        this.max1Found = 0;
        this.max2Found = 0
        this.minFound = 0;
        //[0] will be time, [1] the acc
        this.max1 = [];
        this.max2 = [];
        this.min = [];
        //to identify the phase
        this.jumping = false;
        this.findingMax1 = false;
        this.findingMax2 = false;
        this.findingMin = false;
        //[0] will be time, [1] the acc
        this.jumpSamples = [[]];
        this.jumps = [];
        this.max1Index = 0;
    }

    findLocalMinimum(i) {
        var localMin = this.jumpSamples[i - JUMPSTARTEDCOUNT];
        for (var j = 1; j >= 0; j--) {
            if (this.jumpSamples[i - j][1] < localMin[1])
                localMin = this.jumpSamples[i - j];
        }
        return localMin;
    };

    isArrayGrowing(stopIndex) {
        for (var i = 0; i < stopIndex; i++) {
            if (this.jumpSamples[i][1] > this.jumpSamples[i + 1][1])
                return false;
        }
        return true;
    };
    restartVariables() {
        this.max1 = (function (s) {
            var a = []; while (s-- > 0)
                a.push(0); return a;
        })(DATATOSTORE);
        this.max2 = (function (s) {
            var a = []; while (s-- > 0)
                a.push(0); return a;
        })(DATATOSTORE);
        this.min = (function (s) {
            var a = []; while (s-- > 0)
                a.push(0); return a;
        })(DATATOSTORE);
        this.max1Index = 0;
        this.max1Found = 0;
        this.max2Found = 0;
        this.minFound = 0;
        this.findingMax1 = false;
        this.findingMax2 = false;
        this.findingMin = false;
    };

    setupNewData() {
        this.restartVariables();
        this.max1 = this.jumpSamples[JUMPSTARTEDCOUNT - 1];
        this.findingMax1 = true;
        for (var i = JUMPSTARTEDCOUNT; i < this.sampleSize; i++) {
            if (this.findingMax1) {
                if (this.jumpSamples[i][1] > this.max1[1]) {
                    this.max1 = this.jumpSamples[i];
                    this.max1Found = 0;
                }
                else {
                    this.max1Found++;
                    if (this.max1Found === VALUEFOUND) {
                        if (this.max1[1] < MAX1THRESHOLD)
                            return false;
                        else {
                            this.findingMax1 = false;
                            this.findingMin = true;
                            this.min = this.findLocalMinimum(i);
                            this.max1Index = i - 3;
                        }
                    }
                }
            }
            else if (this.findingMin) {
                if (this.jumpSamples[i][1] < this.min[1])
                    this.min = this.jumpSamples[i];
                else {
                    this.minFound++;
                    if (this.minFound === VALUEFOUND) {
                        this.findingMin = false;
                        this.findingMax2 = true;
                        this.max2 = this.min;
                    }
                }
            }
            else if (this.findingMax2) {
                if (this.jumpSamples[i][1] > this.max2[1]) {
                    this.max2 = this.jumpSamples[i];
                    this.max2Found = 0;
                }
                else if (this.max2[1] > MAX2THRESHOLD && this.jumpSamples[i][1] <= this.max2[1]) {
                    this.max2Found++;
                    if (this.max2Found === this.VALUEFOUND) {
                        this.finishedJumpAnalysis();
                    }
                }
            }
        }
        return true;
    };

    analyzeData(accX, time) {
        // var data = line.split(",");
        // var accX = parseFloat(data[4].substring(1, data[4].length - 1));
        // var time = parseFloat(data[10].substring(data[10].lastIndexOf(":") + 1, data[10].indexOf("+")));

        if (accX > 50 || accX < -50)
            accX /= 1000;

        this.jumpSamples[this.sampleSize++] = [time, accX];
        //console.log(this.jumpSamples[this.sampleSize - 1]);
        if (!this.jumping) {
            if (this.sampleSize > 1 && this.jumpSamples[this.sampleSize - 2][1] < accX) {
                if (this.sampleSize === JUMPSTARTEDCOUNT) {
                    this.jumping = true;
                    this.findingMax1 = true;
                    this.max1 = this.jumpSamples[this.sampleSize - 1];
                }
            }
            else if (this.sampleSize !== 1) {
                this.cleanupPossibleJump();
                //console.log("1cleanup");
            }
        }
        else {
            if (this.findingMax1) {
                if (accX > this.max1[1]) {
                    this.max1 = this.jumpSamples[this.sampleSize - 1];
                    this.max1Found = 0;
                }
                else {
                    this.max1Found++;
                    if (this.max1Found === VALUEFOUND) {
                        if (this.max1[1] < MAX1THRESHOLD) {
                            this.cleanupPossibleJump();
                            //console.log("2cleanup");
                        } else {
                            this.findingMax1 = false;
                            this.findingMin = true;
                            this.min = this.findLocalMinimum(this.sampleSize - 1);
                            this.max1Index = this.sampleSize - 4;
                        }
                    }
                }
            }
            else if (this.findingMin) {
                if (accX < this.min[1])
                    this.min = this.jumpSamples[this.sampleSize - 1];
                else {
                    this.minFound++;
                    if (this.minFound === VALUEFOUND) {
                        this.findingMin = false;
                        this.findingMax2 = true;
                        this.max2 = this.min;
                    }
                }
            }
            else if (this.findingMax2) {
                if (accX > this.max2[1]) {
                    this.max2 = this.jumpSamples[this.sampleSize - 1];
                    this.max2Found = 0;
                }
                else if (this.max2[1] > MAX2THRESHOLD && accX <= this.max2[1]) {
                    this.max2Found++;
                    if (this.max2Found === VALUEFOUND) {
                        this.finishedJumpAnalysis();
                    }
                }
            }
        }
        if (this.sampleSize === SAMPLEMAXSIZE) {
            this.cleanupPossibleJump();
            //console.log("3cleanup");
        }
    }

    cleanupPossibleJump() {
        while ((this.sampleSize > 1)) {
            for (var i = 0; i < this.sampleSize - 1; i++) {
                {
                    this.jumpSamples[i] = this.jumpSamples[i + 1];
                    this.jumpSamples[i + 1] = (function (s) {
                        var a = []; while (s-- > 0)
                            a.push(0); return a;
                    })(DATATOSTORE);
                }
                ;
            }
            this.sampleSize--;
            if (this.sampleSize >= JUMPSTARTEDCOUNT && this.isArrayGrowing(JUMPSTARTEDCOUNT - 1)) {
                if (this.sampleSize === JUMPSTARTEDCOUNT) {
                    this.restartVariables();
                    this.findingMax1 = true;
                    this.max1 = this.jumpSamples[this.sampleSize - 1];
                    break;
                }
                else if (this.setupNewData())
                    break;
            }
            else if (this.sampleSize < JUMPSTARTEDCOUNT) {
                this.jumping = false;
                this.restartVariables();
                if (this.isArrayGrowing(this.sampleSize - 1))
                    break;
            }
        }
        this.jumpSamples[SAMPLEMAXSIZE - 1] = (function (s) {
            var a = []; while (s-- > 0)
                a.push(0); return a;
        })(DATATOSTORE);
    };

    restartJumpAnalysis() {
        this.jumpSamples = (function (dims) {
            var allocate = function (dims) {
                if (dims.length == 0) {
                    return 0;
                }
                else {
                    var array = [];
                    for (var i = 0; i < dims[0]; i++) {
                        array.push(allocate(dims.slice(1)));
                    }
                    return array;
                }
            }; return allocate(dims);
        })([SAMPLEMAXSIZE, DATATOSTORE]);
        this.sampleSize = 0;
        this.restartVariables();
    }

    finishedJumpAnalysis() {
        // if (this.max2[0] < this.max1[0])
        //     this.max2[0] += 60;
        var jumpTime = this.max2[0] - this.max1[0];
        var halfJumpTime = jumpTime / 2.0;
        var jumpHeight;
        if (jumpTime < MAXJUMPTIME && jumpTime > MINJUMPTIME) {
            var fourierMax = this.getFourierMax();
            console.log(fourierMax)
            if ((fourierMax === 1.25 && this.min[1] < 0) || this.min[1] < MINTHRESHOLD) {
                jumpHeight = 0.5 * GRAVITY * halfJumpTime * halfJumpTime;
                this.jumps.push([this.max2[0], jumpHeight]);
                console.log(this.jumps)
                console.log("jump: " + jumpHeight + "m");
                this.restartJumpAnalysis();
            }
            else
                this.cleanupPossibleJump();
        }
        else {
            this.cleanupPossibleJump();
        }
    };

    getSampleAccelerations() {
        var sampleAccelerations = (function (s) {
            var a = []; while (s-- > 0)
                a.push(0); return a;
        })(SAMPLEMAXSIZE);
        var i;
        for (i = this.max1Index - 1; i < this.sampleSize; i++) {
            sampleAccelerations[i - (this.max1Index - 1)] = this.jumpSamples[i][1];
        }
        var used = this.sampleSize - (this.max1Index - 1);
        for (i = used; i < SAMPLEMAXSIZE; i++) {
            sampleAccelerations[i] = 0.0;
        }
        return sampleAccelerations;
    }

    getFourierMax() {
        var sampleValues = this.getSampleAccelerations();
        var fft = ft(sampleValues);
        console.log(fft)
        var index = -1;
        var maxValue = 0;
        for (var i = 1; i < 16; i++) {
            {
                if (fft[i] > maxValue) {
                    maxValue = fft[i];
                    index = i;
                }
            }
            ;
        }
        return index * (SAMPLEFREQUENCY / SAMPLEMAXSIZE);
    };
}
module.exports = JumpTracker