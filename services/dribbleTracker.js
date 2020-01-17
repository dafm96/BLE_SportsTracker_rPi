var ft = require('fourier-transform');
var index = require('../index')

const GYRO_THRESHOLD = 250;
const FOURIER_MAXTHRESHOLD = 0.1;
const FOURIER_MINTHRESHOLD = 0.04;
const ACC_THRESHOLD = 2.5;
const FOURIER_ACCYTHRESHOLD = 0.6;
const MAX_FOUND = 5;

class DribbleTracker {

    constructor(gameId, ppgId, peripheralAddress, readingFrequency) {
        this.dataAccY = ([]);
        this.dataGyroX = ([]);
        this.dribblesPerSession = ([]);
        this.noThreshold = 0;
        this.startAnalysis = (readingFrequency / 2 | 0);
        this.endAnalysis = ((readingFrequency * 1.25) | 0);
        this.firstMax = [0, 0];
        this.firstMaxCount = 0;
        this.timeFromLastMax = (this.endAnalysis / readingFrequency | 0);
        this.dribblingTime = 0;
        this.dribbleCount = 0;
        this.lastTime = 0;
        this.currentSession = 0;

        this.gameId = gameId;
        this.ppgId = ppgId;
        this.peripheralAddress = peripheralAddress;
    }

    /**
    * Returns dribble count
    * @return {number[]} dribble count
    */
    returnDribbleCount() {
        return this.dribblesPerSession;
    };
    /**
    * Returns dribble time
    * @return {number} dribble time
    */
    getDribblingTime() {
        return Math.round(this.dribblingTime * 100.0) / 100.0;
    };

    /**
     * Returns dribble rate
     * @return {number} dribble rate
     */
    getDribblingRate() {
        return Math.round(this.dribbleCount / this.dribblingTime * 100.0) / 100.0;
    };

    /**
    * Main method, called by the main class
    * @param {string} line line of a csv file
    */
    analyzeData (acceY, gyrX, nSample) {
        //var lineArray = line//.split(",");
        var accY = acceY;
        var gyroX = gyrX;
        this.lastTime = nSample;
        //var dataSession = parseInt(lineArray[2]);

        // if (dataSession !== this.currentSession) {
        //     this.evaluateLastSamples();
        //         /* add */ (this.dribblesPerSession.push(this.dribbleCount) > 0);
        //     this.dribbleCount = 0;
        //     this.resetData();
        //     this.currentSession = dataSession;
        // }

        if (accY > 8 || accY < -8)
            accY /= 1000;
        if (gyroX > 1000 || gyroX < -1000)
            gyroX /= 1000;
        this.dataAccY.push(accY);
        this.dataGyroX.push(gyroX);
        if (!this.dribbling) {
            if (accY < ACC_THRESHOLD && gyroX < GYRO_THRESHOLD && this.dataAccY.length === this.startAnalysis) {
                    /* poll */ this.dataAccY.shift();
                    /* poll */ this.dataGyroX.shift();
            }
            else if (accY >= ACC_THRESHOLD || gyroX >= GYRO_THRESHOLD) {
                this.dribbling = true;
                this.startTime = this.lastTime;
                this.firstMax[1] = accY;
            }
        }
        else {
            if (!this.firstMaxFound) {
                if (accY > this.firstMax[1]) {
                    this.firstMax[0] = this.lastTime;
                    this.firstMax[1] = accY;
                }
                else {
                    this.firstMaxCount++;
                    if (this.firstMaxCount === MAX_FOUND)
                        this.firstMaxFound = true;
                }
            }
            if (accY >= ACC_THRESHOLD || gyroX >= GYRO_THRESHOLD)
                this.noThreshold = 0;
            else {
                this.noThreshold++;
                if (this.noThreshold === this.endAnalysis) {
                    this.fourierAnalysis();
                    this.resetData();
                }
            }
        }
    };

    /**
    * If the file ends, but dribbles were being evaluated, counts the last dribbles performed
    */
    evaluateLastSamples() {
        if (this.dribbling)
            this.fourierAnalysis();
    };

    addLastDribbles() {
        this.evaluateLastSamples();
        this.dribblesPerSession.push(this.dribbleCount);
    };

    /**
    * Counts the dribble time
    * @param timeInMs Time in ms of the last measurement
    * @private
    */
    checkDribbleTime() {
        var startTime = this.firstMax[0];
        var endTime = this.lastTime - this.timeFromLastMax;
        if (endTime < startTime)
            endTime += 60;
        this.dribblingTime += (endTime - startTime);
    };

    /**
    * Gets the Fourier Max for the gyro data and the accelerometer data. If both maxes are under a threshold, counts the dribbles detected
    * @param timeInMs Time in ms of the last measurement
    * @private
    */
    fourierAnalysis() {
        var fourierAccMax = this.getFourierMax(true);
        var fourierGyroMax = this.getFourierMax(false);
        // console.info("Fourier Acc: " + fourierAccMax[0]);
        // console.info("Fourier Gyro: " + fourierGyroMax[0]);
        // console.info();
        if (fourierAccMax[0] < FOURIER_MAXTHRESHOLD && fourierGyroMax[0] < FOURIER_MAXTHRESHOLD && fourierAccMax[0] > FOURIER_MINTHRESHOLD && fourierGyroMax[0] > FOURIER_MINTHRESHOLD) {
            this.countDribbles();
            this.checkDribbleTime();
            index.SendDribbles(this.gameId, this.ppgId, this.dribbleCount, this.dribblingTime);

        }
    };

    /**
    * Counts dribbles of the current dataAccY List
    * @private
    */
    countDribbles() {
        var max = 0;
        var maxFound = false;
        for (var i = 0; i < this.dataGyroX.length; i++) {
            var sample = this.dataGyroX[i];
            if (sample > max) {
                max = sample;
                if (max > GYRO_THRESHOLD)
                    maxFound = true;
            }
            else if (sample < 0 && maxFound) {
                this.dribbleCount++;
                maxFound = false;
                max = 0;
            }
        }
    };

    /**
    * Gets the Fourier max value: its x and y coordinates
    * @param {boolean} acc if true, gets the max of the accelerometer data, else gets the max of the gyro data
    * @return {Array} the x and y values of the requested Fourier max
    * @private
    */
    getFourierMax(acc) {
        var fourierSize = this.getFourierSize();
        var sampleValues = this.buildFourierData(fourierSize, acc);

        /*FOURIER HERE*/

        // FourierTransform ft = new FourierTransform(sampleValues);
        // ft.transform();

        // Complex[] complexNumbers = ft.getTransformedDataAsComplex();
        // double[] results = getFourierResults(fourierSize, complexNumbers);

        // var results = this.getFourierResults(fourierSize);
        var results = ft(sampleValues);

        var i = this.getFourierMaxIndexValue(results);
        return [i[0] / fourierSize, i[1]];
    };

    /**
    * Calculates what is the size of the dataAccY (binary number) to be used on the Fourier Analysis
    * @return {number} the size to be used
    * @private
    */
    getFourierSize() {
        var i = this.dataGyroX.length;
        var toReturn = 1;
        while ((toReturn < i)) {
            toReturn = toReturn * 2;
        }
        return toReturn;
    };

    /**
    * Copies the information from the dataAccY List to a double typed array, with size dataSize
    * @param {number} dataSize the size of the array to be returned
    * @return {Array} an array with the dataAccY
    * @param {boolean} acc
    * @private
    */
    buildFourierData(dataSize, acc) {
        var fourierData = (function (s) {
            var a = []; while (s-- > 0)
                a.push(0); return a;
        })(dataSize);
        var count = 0;
        if (acc) {
            for (var i = 0; i < this.dataAccY.length; i++) {
                var sample = this.dataAccY[i];
                {
                    fourierData[count++] = sample;
                }
            }
        }
        else {
            for (var index10294 = 0; index10294 < this.dataGyroX.length; index10294++) {
                var sample = this.dataGyroX[index10294];
                {
                    fourierData[count++] = sample;
                }
            }
        }
        return fourierData;
    };

    /**
    * Calculates de Fourier Values from the complex values calculated previously
    * @param {number} dataSize the size of the array to be returned
    * @param complexNumbers the array with the complex numbers
    * @return {Array} an array with the results
    * @private
    */
    getFourierResults(dataSize) {
        var results = (function (s) {
            var a = []; while (s-- > 0)
                a.push(0); return a;
        })(dataSize);
        for (var i = 0; i < dataSize; i++) {
            results[i] = (2.0 / dataSize);
        }
        return results;
    };

    /**
         * Searches the index of the maximum Fourier value. The search is made in the range[0, dataSize/2]
         * @param {Array} results the array where the search will happen
         * @return {Array} the index of the max value
         * @private
         */
    getFourierMaxIndexValue(results) {
        var index = -1;
        var maxValue = 0;
        var dataSize = results.length;
        var i = 0;
        while ((i / dataSize < 0.02)) {
            i++;
        }
        dataSize = (function (n) { return n < 0 ? Math.ceil(n) : Math.floor(n); })(dataSize / 2);
        for (; i < dataSize; i++) {
            if (results[i] > maxValue) {
                maxValue = results[i];
                index = i;
            }
        }
        return [index, maxValue];
    };

    /**
    * Resets the analysis
    * @private
    */
    resetData() {
        this.dataAccY = ([]);
        this.dataGyroX = ([]);
        this.noThreshold = 0;
        this.dribbling = false;
        this.firstMax = [0, 0];
        this.firstMaxCount = 0;
        this.firstMaxFound = false;
    };
}

module.exports = DribbleTracker