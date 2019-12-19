var mqtt = require('mqtt')
var client  = mqtt.connect('mqtt://192.168.1.1')


function handleOperation(message) {
    console.log("OPERATION", message)
}

function handleOther(message) {
    console.log("OTHER", message)
}

client.on('connect', function () {
    client.subscribe('operation');
    client.subscribe('other');
    client.publish('connected', 'THIS_IS_A_MAC_ADDRESS')
})

client.on('message', function (topic, message) {
    switch(topic){
        case 'operation':
            handleOperation(message);
            break;
        case 'other':
            handleOther(message);
            break;
        default:
            console.log(topic, message)

    }
})