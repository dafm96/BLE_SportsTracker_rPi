var DribbleTracker = require('./dribbleTracker');

var dt = new DribbleTracker('', '', '', 20);

var fs = require('fs'); 
var parse = require('csv-parse');
const RIGHT_HAND_SENSOR = "20:C3:8F:D1:07:38";


var csvData=[];
fs.createReadStream('./DribblingStanding2.csv')
    .pipe(parse({delimiter: ','}))
    .on('data', function(csvrow) {
        var sensorMAC = csvrow[1].substring(0,csvrow[1].length);
        if(sensorMAC === RIGHT_HAND_SENSOR)
            dt.analyzeData(csvrow)
        //do something with csvrow
                
    })
    .on('end',function() {
        dt.addLastDribbles();
      //do something wiht csvData
      console.log(dt.returnDribbleCount())
        console.log(dt.getDribblingTime())

      console.log('finished');
    });