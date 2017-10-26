const mongoose = require('mongoose');

const RecordSchema = new mongoose.Schema({
    "base": {
        type: String
    },
    "date": {
        type: String
    },
    "rates": {}
});

const Record = mongoose.model('Record', RecordSchema);

module.exports = {
    Record
}