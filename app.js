const express = require('express');
const path = require('path');
const lessMiddleware = require('less-middleware');
const mongoose = require('mongoose');
const cors = require('cors');
const moment = require('moment');
const browser = require('browser-detect');

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

function getBrowsers(origin) {
    return Ping.find({origin}).distinct('browserInfo')
}

function getBrowserStats(origin) {

    return new Promise((good, bad) => {

        const output = {browsers: {}, os: [], mobile: []};


        const promises = [
            new Promise((g, b) => {
                Ping.find({origin}).distinct('browserInfo.name')
                    .then(names => {

                        // output.names = names;

                        Promise.all(
                            names.map(name => {

                                return new Promise((gg, bb) => {
                                    Ping.find({origin, 'browserInfo.name': name}).distinct('browserInfo.versionNumber')
                                        .then(versions => {

                                            if (!output.browsers[name]) {
                                                output.browsers[name] = {}
                                            }

                                            output.browsers[name].versions = versions;
                                            gg()
                                        })
                                        .catch(bb);
                                })
                            })
                        )
                            .then(() => {
                                g()
                            })
                            .catch(b);
                    });
            }),


            new Promise((g, b) => {
                Ping.find({origin}).distinct('browserInfo.os')
                    .then(oss => {
                        output.oss = oss;
                        g();
                    })
                    .catch(b)
            }),

            new Promise((g, b) => {
                Ping.find({origin}).distinct('browserInfo.mobile')
                    .then(mobile => {
                        output.mobile = mobile;
                        g();
                    })
                    .catch(b)
            }),
        ];


        Promise.all(promises)
            .then(() => {
                good(output);
            })
            .catch(bad);
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


app.get('/client.js', function (req, res, next) {
    return res.sendFile(path.join(__dirname, '/public/js/dist/client.js'));
});

app.get('/', function (req, res, next) {

    Ping.find().distinct('origin')
        .then(uniqueOrigins => {

            Promise.all(uniqueOrigins.map(origin => {
                return Ping.find({origin: origin}).exec()
            }))
                .then(counts => {

                    Promise.all(
                        uniqueOrigins.map((ping, i) => {
                            return Ping.find({origin: ping}).distinct('fingerprint', {"fingerprint": {$ne: null}}).exec()
                                .then(uniques => {
                                    return {
                                        origin: ping,
                                        count: counts[i].length,
                                        originBase64: new Buffer.from(ping).toString('base64'),
                                        uniqueVisitors: uniques.length
                                    }
                                })
                                .catch(next)
                        })
                    )
                        .then(pings => {
                            return res.render('index', {pings});
                        })
                        .catch(next);


                })
                .catch(err => {
                    console.error(err);
                    next(err);
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

                    getBrowserStats(origin)
                        .then(browserStats => {
                            site.browserStats = browserStats;
                            // getBrowsers(origin)
                            //     .then(browsers => {
                            //         site.browsers = browsers;
                            return res.render('show', {site})
                            // }).catch(next);
                        }).catch(next);
                })
                .catch(next);
        })
        .catch(next)
    // getWeek();


});

app.post('/', function (req, res, next) {

    const ClientBrowser = browser(req.headers['user-agent']);
    if (req.body && req.body.location) {
        const {href, ancestorOrigins, origin, protocol, host, hostname, port, pathname, search, hash} = req.body.location;
        const fingerprint = req.body.fingerprint;
        new Ping({
            href, ancestorOrigins, origin, protocol, host, hostname, port, pathname, search, hash,
            fingerprint: fingerprint,
            browserInfo: ClientBrowser
        })
            .save()
            .then(() => {
                res.status(200).json({status: "ok"})
            })
            .catch(err => {
                console.error('error', err);
                res.status(200).json({status: "ok"})
            })
    }

});


module.exports = app;
