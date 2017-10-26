
require('./config/config');

const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const async = require('async');
const _ = require('lodash');

//db connection
const {mongoose} = require('./db/mongoose');

//own modules
const {Record} = require('./models/record');

const app = express();

app.use(bodyParser.json());

//returns an object containing info for rates on currency. Also writes results into the Database if they do not exist already.
// if results already exist, then data is recieved from db and appended to the response data array.
app.get('/rates', (req, res) => {
    // declaring initial variables
    let newData = []; // end data array sent to the app
    let date = new Date(); // declaring new date on each request to return data for today and 25 weeks before.
    let i = 0; // data
    const base = req.header("base");
    const rates = req.header("rates");

    async.whilst(function () { return i <= 25}, function (callback) {

        let ts = date.getTime();
        let minusDays = ts - ((7 * i) * 24 * 60 * 60 * 1000);
        let minusDate = new Date (minusDays);
        let dateObj = {
            'year': minusDate.getFullYear().toString(),
            'month': (minusDate.getMonth() + 1).toString(),
            'date': (minusDate.getDate() - 1).toString()
        };

        if (dateObj.date.length !== 2 && dateObj.month.length !== 2) {
            dateObj.date = "0" + dateObj.date;
            dateObj.month = "0" + dateObj.month;
        } else if (dateObj.date.length !== 2) {
            dateObj.date = "0" + dateObj.date;
        } else if (dateObj.month.length !== 2) {
            dateObj.month = "0" + dateObj.month;
        }

        if(dateObj.date === "00") {
            dateObj.date = "01";
        }

        i++;

        let reqDate = `${dateObj.year}-${dateObj.month}-${dateObj.date}?base=${base}`;
        // query database, before making http request to API.
        Record.find({base: base, date: `${dateObj.year}-${dateObj.month}-${dateObj.date}`}).then((data) => {
            if (data.length >= 1) {
                newData.push({
                    base: data[0].base,
                    date: data[0].date,
                    rates: data[0].rates[rates]
                });
                callback(null, newData);
            } else {
                http.get('http://api.fixer.io/' + reqDate, (resp) => {
                    let data = [];
                    resp.on('data', (chunk) => {
                        data += chunk;
                    });

                    resp.on('end', () => {
                        let newRecord = new Record(JSON.parse(data));
                        newData.push({
                            base: newRecord.base,
                            date: newRecord.date,
                            rates: newRecord.rates[rates]
                        });
                        newRecord.save();
                        callback(null, newData);

                    });
                }).on('error', (err) => {
                    console.log("Error: " + err.message);
                    callback(err);
                });

            }

        }).catch((e) => {
            res.send(e);
            console.log("ERROR");
        })
    },
    function(err, newData) {
        if (err) {
            res.send(err);
        } else {
            res.send(newData);
        }
    });


});

app.listen(process.env.PORT, () => {
    console.log("app started on port " + process.env.PORT);
});

module.exports = {
    app
};