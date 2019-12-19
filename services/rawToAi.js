let map = new Map();
const aiError = Math.pow(0.001, 2); //power here to simplify

function getActivityTime(peripheralAddress) {
    if (map.get(peripheralAddress))
        return map.get(peripheralAddress).activityTime;
    else
        return {
            "STILL": 0,
            "WALKING": 0,
            "RUNNING": 0
        };
}

function convertRawToActivity(peripheralAddress, raw) {

    if (map.get(peripheralAddress) === undefined) {
        map.set(peripheralAddress, {
            "accX": [],
            "accY": [],
            "accZ": [],
            "activityTime": {
                "STILL": 0,
                "WALKING": 0,
                "RUNNING": 0
            }
        })
    }

    if (map.get(peripheralAddress).accX.length <= 50) {
        (map.get(peripheralAddress).accX).push(raw[0]);
        (map.get(peripheralAddress).accY).push(raw[1]);
        (map.get(peripheralAddress).accZ).push(raw[2]);
    }
    if (map.get(peripheralAddress).accX.length == 50) {
        let stdevX = stdev(map.get(peripheralAddress).accX);
        let stdevY = stdev(map.get(peripheralAddress).accY);
        let stdevZ = stdev(map.get(peripheralAddress).accZ);
        let ai = Math.sqrt((((Math.pow(stdevX, 2) - aiError) / aiError) + ((Math.pow(stdevY, 2) - aiError) / aiError) + ((Math.pow(stdevZ, 2) - aiError) / aiError)) / 3);
        map.get(peripheralAddress).accX = [];
        map.get(peripheralAddress).accY = [];
        map.get(peripheralAddress).accZ = [];
        let currentAIFromRaw = ai;
        //TODO review these parameters
        let tempActivityTime = map.get(peripheralAddress).activityTime;
        if (ai < 100) {
            //activityTime.put("STILL", activityTime.get("STILL") + 1);
            map.get(peripheralAddress).activityTime.STILL = tempActivityTime.STILL + 1;
        }
        else if (ai >= 100 && ai < 600) {
            //activityTime.put("WALKING", activityTime.get("WALKING") + 1);
            map.get(peripheralAddress).activityTime.WALKING = tempActivityTime.WALKING + 1;
        }
        else if (ai >= 600) {
            //activityTime.put("RUNNING", activityTime.get("RUNNING") + 1);
            map.get(peripheralAddress).activityTime.RUNNING = tempActivityTime.RUNNING + 1;
        }
        //console.log(peripheralAddress, "Activity Index: " + ai);
    }
}

/**
 * Calculates the standard deviation of a arraylist of values
 * @param acc array list with acceleration to calculate standard deviation
 * @return standard deviation from given values
 */
function stdev(accArray) {
    let sum = 0;
    let mean;
    let sq_sum = 0;
    accArray.forEach(d => {
        sum += d;
        sq_sum += d * d;
    });
    mean = sum / accArray.length;
    let variance = sq_sum / accArray.length - mean * mean;

    return Math.sqrt(variance);
}

var exports = module.exports = { convertRawToActivity, getActivityTime };