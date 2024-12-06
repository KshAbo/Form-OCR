const express = require('express');
const router = express.Router();
const multer = require('multer');
const tesseract = require('tesseract.js')
const path = require('path');
const fs = require('fs')

const data = require('./data.json')

// import data from './data.json' with { type: 'json' };

// const storage = multer.diskStorage({
//     destination: function(req, file, cb) => {
//         cb(null, './uploads/');
//     },
//     filename: function(req, file, cb) => {
//         cb(null, new Date().toISOString() + file.originalname);
//     }
// });
// const upload = multer({storage: storage});
const upload = multer({dest: 'uploads/'})


async function Worker(location){
    const worker = await tesseract.createWorker("eng", 1, {
        logger: m => console.log(m),
    });  
    const { data: { text } } = await worker.recognize(location);
    await worker.terminate();
    return text;
}


router.post('/', upload.single('processImage'), (req, res) => {     // POST '\process'
    let text;
    console.log(req.file);
    const loc = path.resolve(__dirname, req.file.path);
    console.log(loc);
    Worker(loc).then((result) => {
        text = result;
    }).then(() => {
        let formdata = {}
        for(const property in data){
            let scanner = `${data[property]}`;
            scanner = "\(" + scanner + "\)\(\\W*\)\(\[a-zA-Z0-9#-/@ \]*\)"
            const regex = RegExp(scanner)
            let value = regex.exec(text)[3]
            formdata[`${property}`] = value
            console.log(formdata[`${property}`])
        }
        res.json(formdata)
    })
});

module.exports = router
