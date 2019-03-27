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

// const Site = require('./models/site');
const Ping = require('./models/ping');


function applyToEach(ping) {
    return new Promise((good, bad) => {

        const promises = [];
        const output = {origin: ping, paths: []};

        console.log(ping);

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
                        // console.log('paths', paths);


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
                return good(output);
            }).catch(bad);


    })
}

app.get('/', function (req, res, next) {

    Ping.find().distinct('origin')
        .then(pings => {

            Promise.all(
                pings.map(ping => {
                    return applyToEach(ping)
                })
            )
                .then(output => {
                    console.log(JSON.stringify(output));
                    return res.render('index', {pings: output});
                })
                .catch(err => {

                })
        })
});

app.get('/client.js', function (req, res, next) {
    return res.sendFile(path.join(__dirname, '/public/js/dist/client.js'));
});

app.post('/', function (req, res, next) {
    // console.log(req.body);

    if (req.body && req.body.location) {
        const {href, ancestorOrigins, origin, protocol, host, hostname, port, pathname, search, hash} = req.body.location
        new Ping({
            href, ancestorOrigins, origin, protocol, host, hostname, port, pathname, search, hash
        })
            .save()
            .catch(err => {
                console.error('error', err);
            })
    }

});


module.exports = app;
