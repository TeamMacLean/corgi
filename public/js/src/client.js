import fetch from 'unfetch';
import Fingerprint2 from 'fingerprintjs2';

const config = require('../../../config');

function getFingerprint(cb) {

    function doit() {
        Fingerprint2.get(function (components) {
            const murmur = Fingerprint2.x64hash128(components.map(function (pair) {
                return pair.value
            }).join(), 31);
            cb(murmur)
        })
    }

    if (window.requestIdleCallback) {
        requestIdleCallback(function () {
            doit();
        })
    } else {
        setTimeout(function () {
            doit();
        }, 500)
    }

}

try {
    const {href, ancestorOrigins, origin, protocol, host, hostname, port, pathname, search, hash} = window.location;

    getFingerprint(function (fingerprint) {

        fetch(config.URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                location: {
                    href, ancestorOrigins, origin, protocol, host, hostname, port, pathname, search, hash
                },
                fingerprint: fingerprint
            })
        })
            .then(out => {
                console.log(out);
            })
            .catch(err => {
                console.error(err);

            });
    })
} catch (err) {
    console.log('error posting to corgi');
}