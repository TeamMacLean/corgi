const express = require('express');
const path = require('path');
const lessMiddleware = require('less-middleware');
const mongoose = require('mongoose');
const cors = require('cors');
const moment = require('moment');

const app = express();

const config = require('./config');

mongoose.connect('mongodb://localhost:27017/corgi', {useNewUrlParser: true});

app.use(cors());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(lessMiddleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.use(function (req, res, next) {
    res.locals.URL = config.URL;
    next();
});


const Ping = require('./models/ping');


function SiteStats(ping) {
    return new Promise((good, bad) => {

        const promises = [];
        const output = {origin: ping, paths: []};

        promises.push(
            new Promise((good, bad) => {
                Ping.find({origin: ping}).countDocuments().exec()
                    .then(count => {
                        output.count = count;
                        return good();
                    })
                    .catch(err => {
                        return bad(err);
                    });
            })
        );


        promises.push(
            new Promise((good, bad) => {
                Ping.find({origin: ping}).distinct('pathname')
                    .then(paths => {


                        Promise.all(paths.map(path => {
                                return new Promise((g, b) => {
                                    Ping.find({origin: ping, pathname: path}).countDocuments().exec()
                                        .then(count => {
                                            output.paths.push({path, count});
                                            g();
                                        })
                                        .catch(b);
                                })
                            })
                        )
                            .then(good)
                            .catch(bad)


                    })
                    .catch(bad)
            })
        );

        Promise.all(promises)
            .then(() => {
                output.paths = output.paths.sort((a, b) => {
                    if (a.path < b.path)
                        return -1;
                    if (a.path > b.path)
                        return 1;
                    return 0;
                });

                return good(output);
            }).catch(bad);
    })
}

function getWeek(origin, daysCount) {

    return new Promise((good, bad) => {

        const ranges = [];

        for (let i = 0; i < daysCount; i++) {
            let human = 'Today';

            if (!moment().subtract(i, 'days').isSame(moment(), 'day')) {
                human = moment().subtract(i, 'days').format("dddd Do");
            }
            ranges.push({
                start: moment().subtract(i, 'days').startOf('day').toDate(),
                end: moment().subtract(i, 'days').endOf('day').toDate(),
                human: human,
                offset: i
            })
        }


        return Promise.all(ranges.map((range, i) => {
            return new Promise((g2, b2) => {
                const dateRange = {"$gte": range.start, "$lt": range.end};
                Ping.find( //query today up to tonight
                    {origin: origin, "createdAt": dateRange}).countDocuments().exec()
                    .then(count => {
                        range.count = count;

                        uniqueVisitors(origin, dateRange)
                            .then(uv => {
                                range.uniqueVisitors = uv.length;
                                return g2(range);

                            })
                            .catch(b2);


                    })
                    .catch(b2);
            })
        }))
            .then((ranges) => {

                ranges.sort((a, b) => {
                    return a.offset > b.offset ? -1 : 1;
                });

                return good(ranges);

            })
            .catch(bad)
    })
}

function uniqueVisitors(origin, dateRange) {
    return Ping.find({origin: origin, "createdAt": dateRange}).distinct('fingerprint', {"fingerprint": {$ne: null}})
        .exec()
}

function uniqueFromPings(pings) {
    function removeDuplicates(myArr, prop) {
        return myArr.filter((obj, pos, arr) => {
            return arr.map(mapObj => mapObj[prop]).indexOf(obj[prop]) === pos;
        });
    }

    return removeDuplicates(pings, 'fingerprint');


}


app.get('/client.js', function (req, res, next) {
    return res.sendFile(path.join(__dirname, '/public/js/dist/client.js'));
});

app.get('/', function (req, res, next) {

    Ping.find().distinct('origin')
        .then(pings => {

            Promise.all(pings.map(ping => {
                return Ping.find({origin: ping}).exec()
            }))
                .then(counts => {

                    pings = pings.map((ping, i) => {
                        return {
                            origin: ping,
                            count: counts[i].length,
                            originBase64: new Buffer.from(ping).toString('base64'),
                            unique: uniqueFromPings(counts[i]).length
                        }
                    });

                    return res.render('index', {pings});
                })
                .catch(err => {
                    console.error(err);
                    next();
                })


        })
});


app.get('/site/:base', function (req, res, next) {
    let buff = new Buffer.from(req.params.base, 'base64');
    let origin = buff.toString('ascii');

    let daysCount = parseInt(req.query.days) || 7;

    getWeek(origin, daysCount)
        .then(week => {

            return SiteStats(origin)
                .then(site => {

                    site.week = week;
                    return res.render('show', {site})
                })
                .catch(err => {
                    return next(err);
                });

        })
        .catch(err => {
            return next(err);
        })
    // getWeek();


});

app.post('/', function (req, res, next) {

    const ClientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'UNKNOWN';


    if (req.body && req.body.location) {
        const {href, ancestorOrigins, origin, protocol, host, hostname, port, pathname, search, hash} = req.body.location;
        const fingerprint = req.body.fingerprint;
        new Ping({
            href, ancestorOrigins, origin, protocol, host, hostname, port, pathname, search, hash,
            fromIP: ClientIP,
            fingerprint: fingerprint
        })
            .save()
            .catch(err => {
                console.error('error', err);
            })
    }

});


module.exports = app;
