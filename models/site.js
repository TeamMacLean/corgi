const mongoose = require('mongoose');

const Site = mongoose.model('Site', {
    name: {type:String, required:true}
});

// const kitty = new Site({ name: 'Zildjian' });
// kitty.save().then(() => console.log('meow'));

module.exports = Site;