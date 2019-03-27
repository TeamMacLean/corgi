const express = require('express');
const path = require('path');
const lessMiddleware = require('less-middleware');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

const config = require('./config');

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
})

mongoose.connect('mongodb://localhost:27017/corgi', {useNewUrlParser: true});

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

app.get('/client.js', function (req, res, next) {
    return res.sendFile(path.join(__dirname, '/public/js/dist/client.js'));
});

app.get('/', function (req, res, next) {

    Ping.find().distinct('origin')
        .then(pings => {

            Promise.all(pings.map(ping => {
                return Ping.find({origin: ping}).countDocuments().exec()
            }))
                .then(counts => {

                    pings = pings.map((ping, i) => {
                        return {origin: ping, count: counts[i], originBase64: new Buffer.from(ping).toString('base64')}
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
    let text = buff.toString('ascii');


    SiteStats(text)
        .then(site => {
            // console.log(site);
            return res.render('show', {site})
        })
        .catch(err => {
            return next(err);
        });

});

app.post('/', function (req, res, next) {

    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'UNKNOWN';


    if (req.body && req.body.location) {
        const {href, ancestorOrigins, origin, protocol, host, hostname, port, pathname, search, hash} = req.body.location
        new Ping({
            href, ancestorOrigins, origin, protocol, host, hostname, port, pathname, search, hash,
            fromIP: ip
        })
            .save()
            .catch(err => {
                console.error('error', err);
            })
    }

});


module.exports = app;
