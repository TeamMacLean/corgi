import fetch from 'unfetch';

const config = require('../../../config');
const {href, ancestorOrigins, origin, protocol, host, hostname, port, pathname, search, hash} = window.location;

try {
    fetch(config.URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            location: {
                href, ancestorOrigins, origin, protocol, host, hostname, port, pathname, search, hash
            }
        })
    })
        .then(out => {
            console.log(out);
        })
        .catch(err => {
            console.error(err);

        });
} catch (err) {
    console.log('error posting to corgi');
}