var mqtt = require('mqtt')
//var client = mqtt.connect('mqtt://192.168.0.122')
var client = mqtt.connect('mqtt://192.168.1.1')

client.on('connect', function () {
    client.subscribe('operation');
    client.subscribe('fetchDevices');
    setInterval(() => {
        f = ble.getPeripherals();
        client.publish('connected', JSON.stringify(f));
    }, 1000);
})

const ble = require('./services/ble')

client.on('message', function (topic, message) {
    let f;
    switch (topic) {
        case 'operation':
            const obj = JSON.parse(message.toString())
            switch (obj.operation) {
                case 'startRaw':
                    ble.startRaw(obj.address, obj.gameId, obj.ppgId, obj.peripheralPosition);
                    break;
                case 'stopRaw':
                    ble.idle(obj.address);
                    break;
                case 'shutdown':
                    ble.shutdown(obj.address);
                    break;
                case 'startAllRaw':
                    f = ble.getPeripherals();
                    if (f.length > 0) {
                        f.map(p => p.address).forEach(element => {
                            ble.startRaw(element)
                        });
                    }
                    break;
                case 'stopAllRaw':
                    f = ble.getPeripherals();
                    if (f.length > 0) {
                        f.map(p => p.address).forEach(element => {
                            ble.idle(element)
                        });
                    }
                    break;
                case 'shutdownAll':
                    f = ble.getPeripherals();
                    if (f.length > 0) {
                        f.map(p => p.address).forEach(element => {
                            ble.shutdown(element)
                        });
                    }
                    break;
            }
            break;
        default:
            console.log(topic, message)

    }
})

function Disconnected (peripheralAddress) {
    console.log('disconnected', peripheralAddress)
    client.publish('disconnected', peripheralAddress)
}

function SendActivityTimeData (gameId, ppgId, data) {
    let f = {gameId, ppgId, 'activityTime': data};
    client.publish('metrics/' + gameId + '/activityTime', JSON.stringify(f));
}

function SendJumps(gameId, ppgId, data) {
    let f = {gameId, ppgId, 'jumps': data};
    client.publish('metrics/' + gameId + '/jumps', JSON.stringify(f));
}

function SendSteps(gameId, ppgId, data) {
    let f = {gameId, ppgId, 'steps': data.Steps, 'distance': data.Distance};
    client.publish('metrics/' + gameId + '/steps', JSON.stringify(f));
}

function SendDribbles(gameId, ppgId, dribbleCount, dribblingTime) {
    let f = {gameId, ppgId, "dribbleCount": dribbleCount, 'dribblingTime': dribblingTime};
    client.publish('metrics/' + gameId + '/dribble', JSON.stringify(f));
}

module.exports.Disconnected = Disconnected;
module.exports.SendActivityTimeData = SendActivityTimeData;
module.exports.SendJumps = SendJumps;
module.exports.SendSteps = SendSteps;
module.exports.SendDribbles = SendDribbles;
