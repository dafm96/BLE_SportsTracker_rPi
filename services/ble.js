//TEST REBASE TO PI

var noble = require('noble');
//change min and max in leconn located in /node_modules/noble/lib/hci-socket/hci.js
//const matrix = require('sense-hat-led');
var rawToAi = require('./rawToAi')
const off = [0, 0, 0];
const red = [255, 0, 0];
const green = [0, 255, 0];
const blue = [0, 0, 255];
//matrix.clear(off);
var fs = require('fs')

const index = require('../index');
const JumpTracker = require('./jumpTracker.js');
const DribbleTracker = require('./dribbleTracker');

var fullList = []
var peripherals = [];
var whitelist = ['0C:B2:B7:39:97:B0',
    '20:C3:8F:D1:07:38',
    '20:C3:8F:D1:0B:20',
    '0C:B2:B7:39:99:7C',
    '0C:B2:B7:39:99:56',
    '0C:B2:B7:39:99:26',
    '0C:B2:B7:39:92:EA',
    '0C:B2:B7:39:99:13',
    '0C:B2:B7:39:9A:80',
    // '0C:B2:B7:39:99:65',
    '0C:B2:B7:39:9D:5D'
]

function bufferToByteArray(buffer) {
    return Array.prototype.slice.call(buffer, 0)
}

function getPeripherals() {
    return fullList.map(p => {
        let activityTime = rawToAi.getActivityTime(p.address);
        p.activityTime = activityTime;
        let {interval, ...rest} = p //don't send some keys
        //TODO put here tracking info
        return rest
    });
}

function getPeripheral(peripheralAddress) {
    let peripheral = fullList.find(p => p.address === peripheralAddress);
    let activityTime = rawToAi.getActivityTime(peripheralAddress);

    return { peripheral, activityTime };
}

function startRaw(peripheralAddress, gameId, ppgId, peripheralPosition) {
    let peripheral = peripherals.find(p => p.address === peripheralAddress)
    let rep = fullList.find((p => p.address === peripheralAddress))
    if (peripheral) {
        rep.gameId = gameId;
        rep.ppgId = ppgId;
        //Depending on the sensor position
        if(peripheralPosition === 'BACK')
            var jt = new JumpTracker(gameId, ppgId, peripheralAddress);
        if(peripheralPosition === 'HAND')
            var dt = new DribbleTracker(gameId, ppgId, peripheralAddress, 20);
        peripheral.discoverSomeServicesAndCharacteristics(['ff30'], ['ff35', 'ff38'], function (error, services, characteristics) {
            var SmartLifeService = services[0];
            var stateCharacteristic = characteristics.find(c => c.uuid == 'ff35');
            var rawCharacteristic = characteristics.find(c => c.uuid == 'ff38');

            stateCharacteristic.write(new Buffer([0x01]), true, function (error) {
                console.log('Started RAW');
                rep.startedRaw = true;
                //matrix.setPixel(rep.ledId % 8, 2 + ~~(rep.ledId / 8), green);

                if(peripheralPosition === 'FOOT'){
                    rep.interval = setInterval(async () => {
                        let filename = 'log_' + new Date().toISOString().slice(0, 19) + '_' + rep.address + '.csv';
                        var logger = fs.createWriteStream('./logs/' + filename, {
                            flags: 'a' // 'a' means appending (old data will be preserved)
                        })
                        //console.log(convertToCSV(rep.rawData))
                        if (rep.rawData.length > 0)
                            await logger.write("" + convertToCSV(rep.rawData).replace(/,/gi, ';') + "\n");

                        tracking((err, result) => {
                            if(err){
                                console.log(err);
                            }
                            else if (result){
                                rep.tracking = JSON.parse(result)
                                //console.log(rep.tracking) //SEND
                                index.SendSteps(gameId, ppgId, rep.tracking);
                                fs.unlink('./logs/' + filename, (err) => {
                                    if (err) {
                                        console.error(err)
                                        return
                                    }
                                })
                            }
                        }, filename)
                    }, 30000)
                }
                
                rawCharacteristic.on('data', function (data, isNotification) {
                    let outputs = [];
                    let arr = Array.prototype.slice.call(data, 0)
                    let ratio_ACC = (4.0 / 32767); //originally 4.0
                    let ratio_GYR = (1000.0 / 32767);

                    let nSample = ((arr[1] & 0xFF) << 8 | arr[0] & 0xFF);
                    let accX = 0;
                    let accY = 0;
                    let accZ = 0;
                    let gyrX = 0;
                    let gyrY = 0;
                    let gyrZ = 0;


                    for (let i = 0; i < 9; i++) {
                        let mov = (arr[2 * i + 3] & 0xFF) << 8 | arr[2 * i + 2] & 0xFF;
                        if (mov > 32767) {
                            mov = -(65534 - mov);
                        }
                        if (i == 0) {
                            accX = mov;
                            accX *= ratio_ACC;
                        } else if (i == 1) {
                            accY = mov;
                            accY *= ratio_ACC;
                        } else if (i == 2) {
                            accZ = mov;
                            accZ *= ratio_ACC;
                        } else if (i == 3) {
                            gyrX = mov;
                            gyrX *= ratio_GYR;
                        } else if (i == 4) {
                            gyrY = mov;
                            gyrY *= ratio_GYR;
                        } else if (i == 5) {
                            gyrZ = mov;
                            gyrZ *= ratio_GYR;
                        }
                    }
                    if(peripheralPosition === 'FOOT')
                        rawToAi.convertRawToActivity(gameId, ppgId, peripheralAddress, [accX, accY, accZ]);

                    nSample = (nSample * 0.02).toFixed(2);
                    //Depending on the sensor position
                    if(peripheralPosition === 'BACK')
                        jt.analyzeData(accX, nSample);
                    if(peripheralPosition === 'HAND')
                        dt.analyzeData(accX, gyrX, nSample);
                    accX = accX * 9.8;
                    accY = accY * 9.8;
                    accZ = accZ * 9.8;
                    gyrX = gyrX * Math.PI / 180;
                    gyrY = gyrY * Math.PI / 180;
                    gyrZ = gyrZ * Math.PI / 180;
                    let sample = {
                        nSample,
                        accX,
                        accY,
                        accZ,
                        gyrX,
                        gyrY,
                        gyrZ
                    };
                    
                    rep.rawData.push(sample);
                });
            });
        })
    }
}

function convertToCSV(arr) {
    if (arr != undefined && arr.length > 0) {
        //const array = [Object.keys(arr[0])].concat(arr)

        return arr.map(it => {
            return Object.values(it).toString()
        }).join('\n')
    }
}

function idle(peripheralAddress) {
    let peripheral = peripherals.find(p => p.address === peripheralAddress)
    let rep = fullList.find((p => p.address === peripheralAddress))
    if (peripheral) {
        peripheral.discoverSomeServicesAndCharacteristics(['ff30'], ['ff35'], function (error, services, characteristics) {
            var SmartLifeService = services[0];
            var stateCharacteristic = characteristics.find(c => c.uuid == 'ff35');
            stateCharacteristic.write(new Buffer([0x00]), true, function (error) {
                console.log('Stopped RAW');
                //matrix.setPixel(rep.ledId % 8, 2 + ~~(rep.ledId / 8), red);
                rep.startedRaw = false;
                clearInterval(rep.interval);
                rawToAi.reset(peripheralAddress);
                // let filename = 'log_' + new Date().toISOString().slice(0, 19) + '_' + rep.address + '.csv';
                // var logger = fs.createWriteStream('./logs/' + filename, {
                //     flags: 'a' // 'a' means appending (old data will be preserved)
                // })
                // //console.log(convertToCSV(rep.rawData))
                // if (rep.rawData.length > 0)
                //     logger.write("" + convertToCSV(rep.rawData).replace(/,/gi, ';') + "\n");
                rep.rawData = [];
            });
        })
    }
}

function shutdown(peripheralAddress) {
    let peripheral = peripherals.find(p => p.address === peripheralAddress)
    if (peripheral) {
        peripheral.discoverSomeServicesAndCharacteristics(['ff30'], ['ff35'], function (error, services, characteristics) {
            var SmartLifeService = services[0];
            var stateCharacteristic = characteristics.find(c => c.uuid == 'ff35');

            stateCharacteristic.write(new Buffer([0x0A]), true, function (error) {
                console.log('Shutdown ' + peripheralAddress);
            });
        })
    }
}

noble.on('stateChange', function (state) {
    if (state === 'poweredOn') {
        noble.startScanning();
    } else {
        noble.stopScanning();
    }
});

noble.on('scanStart', function () {
    console.warn('Scan started');
});

noble.on('scanStop', function () {
    console.warn('Scan stopped');
});


noble.on('discover', function (peripheral) {
    var address = peripheral.address
    //console.log(address)
    if (whitelist.includes(peripheral.address.toUpperCase()) && peripheral.state === 'disconnected') {

        peripheral.once('connect', function () {
            console.log(address, 'connected');
            let rep = {
                address: peripheral.address,
                connected: true,
                startedRaw: false,
                rawData: [],
                ledId: peripherals.length,
            }
            fullList.push(rep);
            peripherals.push(peripheral);
            //matrix.setPixel(rep.ledId % 8, 2 + ~~(rep.ledId / 8), blue);
            // client.publish('connected', JSON.stringify(fullList));
            //MPUConfig(address)
            peripheral.discoverSomeServicesAndCharacteristics(['ff30'], ['ff35', 'ff37', 'ff38', 'ff3c', 'ff3b'], function (error, services, characteristics) {
                var SmartLifeService = services[0];
                var stateCharacteristic = characteristics.find(c => c.uuid == 'ff35');
                var buttonCharacteristic = characteristics.find(c => c.uuid == 'ff37');
                var rawCharacteristic = characteristics.find(c => c.uuid == 'ff38');
                var MPUCharacteristic = characteristics.find(c => c.uuid == 'ff3c');
                var RateCharacteristic = characteristics.find(c => c.uuid == 'ff3b');
                MPUCharacteristic.write(new Buffer([0x07, 0x00, 0x00, 0x08, 0x03, 0x03, 0x10]), true, function (error) {
                    if (error) {
                        console.log(error)
                    } else {
                        console.log('Changed MPU config')
                    }
                })

                RateCharacteristic.write(new Buffer([20]), true, function (error) {
                    if (error) {
                        console.log(error)
                    } else {
                        console.log('Changed rate to ' + 20 + 'ms')
                    }
                })

                // to enable notify
                rawCharacteristic.subscribe(function (error) {
                    console.log('raw notification on');
                });

                stateCharacteristic.subscribe(function (error) {
                    console.log('state notification on');
                });

                buttonCharacteristic.subscribe(function (error) {
                    console.log('button notification on');
                });
                // stateCharacteristic.on('data', function(data, isNotification) {
                //     console.log(data)
                // })
                // buttonCharacteristic.on('data', function(data, isNotification) {
                //     console.log(data)
                // })
                // rawCharacteristic.on('data', function(data, isNotification) {
                //     console.log(data)
                // })
            })
        })


        peripheral.once('disconnect', function () {
            console.log(address, 'disconnected');
            clearInterval(fullList.find((p => p.address === address)).interval);
            index.Disconnected(peripheral.address);
            //let tempLedId = fullList.find(p => p.address == peripheral.address).ledId;
            //matrix.setPixel(tempLedId % 8, 2 + ~~(tempLedId / 8), off);
            peripherals = peripherals.filter(p => { return p.address !== peripheral.address })
            fullList = fullList.filter(p => { return p.address !== peripheral.address })
        });

        peripheral.connect(function (error) {
            if (error) {
                console.log(error);
            }

            noble.startScanning();
            return;
        });

    }
})

function tracking(callback, filename) {
    let out = '';
    let error = false;
    var spawn = require('child_process').spawn,
	 ls = spawn('octave-cli', ['./services/inertial_pdr.m',
             './logs/' + filename
         ]);

    ls.stdout.on('data', function (data) {
        out += data.toString();
    });

    ls.stderr.on('data', function (data) {
        if (data.toString().includes('error'))
            error = true;
    });

    ls.on('exit', function (code) {
        if (error || out == '') {
            return callback("Error in tracking algorithm");
        }
        else {
            if (IsJsonString(out)) {
                return callback(null, out);
            }
            else {
                return callback("Error in tracking algorithm(data)");

            }
        }
    });
}

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        console.log(e);
        return false;
    }
    return true;
}

module.exports = { getPeripherals, getPeripheral, startRaw, idle, shutdown, tracking };
