const mongoose = require('mongoose');

const Site = mongoose.model('Site', {
    name: {type:String, required:true}
});

module.exports = Site;