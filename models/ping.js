const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const pingSchema = new Schema({
    // name: {type: String, required: true}


    href: {type: String},
    ancestorOrigins: {},
    origin: {type: String},
    protocol: {type: String},
    host: {type: String},
    hostname: {type: String},
    port: {type: String},
    pathname: {type: String},
    search: {type: String},
    hash: {type: String},

    fromIP: {type: String},
    fingerprint: {type: String}


}, {timestamps: true});

const Ping = mongoose.model('Ping', pingSchema);


module.exports = Ping;