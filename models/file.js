
const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    originalName: {
        type: String,
        required: true
    },
    storageName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: false // Made optional for memory storage
    },
    fileData: {
        type: Buffer,
        required: false // For memory storage in production
    },
    mimetype: {
        type: String,
        required: false
    },
    uploadDate: {
        type: Date,
        default: Date.now
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

const File = mongoose.model('File', fileSchema);

module.exports = File;
