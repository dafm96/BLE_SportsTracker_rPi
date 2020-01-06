var mqtt = require('mqtt')
var client = mqtt.connect('mqtt://192.168.0.122')

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
                    ble.startRaw(obj.address);
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
                            ble.startRaw(element, obj.gameId)
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
