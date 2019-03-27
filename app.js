const express = require('express');
const path = require('path');
const lessMiddleware = require('less-middleware');
const logger = require('morgan');
const mongoose = require('mongoose');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(lessMiddleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect('mongodb://localhost:27017/corgi', {useNewUrlParser: true});

// const Site = require('./models/site');
const Ping = require('./models/ping');

app.get('/', function (req, res, next) {

    Ping.distinct('origin').countDocuments().exec(function (err, count) {
        console.log('The number of unique origins is: %d', count);
    });

    Ping.find().distinct('origin')
        .then(pings => {

            Promise.all(pings.map(ping => {
                return Ping.find({origin: ping}).countDocuments().exec()
            }))
                .then(out => {
                    pings = pings.map((p, i) => {
                        return {origin: p, count: out[i]};
                    });
                    return res.render('index', {pings});
                })
                .catch(err => {
                    console.error(err);
                    return next(err);
                })
        })
        .catch(err => {
            console.error(err);
            return next(err);
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
