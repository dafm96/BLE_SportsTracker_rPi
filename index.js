var mqtt = require('mqtt')
var client = mqtt.connect('mqtt://192.168.1.1')

client.on('connect', function () {
    client.subscribe('operation');
    client.subscribe('fetchDevices');
})

const ble = require('./services/ble')

client.on('message', function (topic, message) {
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
                    let f = ble.getPeripherals();
                    if (f.length > 0) {
                        f.map(p => p.address).forEach(element => {
                            startRaw(element)
                        });
                    }
                    break;
                case 'stopAllRaw':
                    f = ble.getPeripherals();
                    if (f.length > 0) {
                        f.map(p => p.address).forEach(element => {
                            idle(element)
                        });
                    }
                    break;
                case 'shutdownAll':
                    f = ble.getPeripherals();
                    if (f.length > 0) {
                        f.map(p => p.address).forEach(element => {
                            shutdown(element)
                        });
                    }
                    break;
            }
            break;
        case 'fetchDevices':
            f = ble.getPeripherals();
            client.publish('connected', JSON.stringify(f));
            break;
        default:
            console.log(topic, message)

    }
})