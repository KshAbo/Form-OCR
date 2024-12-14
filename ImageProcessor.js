const express = require('express');
const router = express.Router();
const multer = require('multer');
const tesseract = require('tesseract.js')
const path = require('path');
const fs = require('fs')
const sharp = require('sharp')


const BUFFER_PIXEL = 5;

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

async function Worker(location, rect){
    const worker = await tesseract.createWorker("eng");
    let rectangle = {left: rect.x, top: rect.y, width: rect.width, height: rect.height};
    const {data: {text}} = await worker.recognize(location, {rectangle})
    await worker.terminate();
    return text;
}

async function GetScanRegion(location){

    const worker = await tesseract.createWorker("eng", 1, {
        logger: m => console.log(m),
    });  

    let rectangles = [];

    const result = await worker.recognize(location);
    let wordMatch= [];
    for(const property in data){
        wordMatch.push(data[property].split(" ")[0]);
    }
    console.log(result.data.text);

    for(const word in result.data.words){
        for(const property in data){
            if(data[property].split(" ")[0] === result.data.words[word].text){
                let prop;
                prop = property;
                const rectangle = {
                    text: result.data.words[word].text,
                    ogText: data[prop],
                    property: prop,
                    x: result.data.words[word].bbox.x0 - BUFFER_PIXEL,
                    y: result.data.words[word].bbox.y0 - BUFFER_PIXEL,
                    width: result.data.words[word].bbox.x1 - result.data.words[word].bbox.x0 + 2*BUFFER_PIXEL,
                    height: result.data.words[word].bbox.y1 - result.data.words[word].bbox.y0 + 2*BUFFER_PIXEL
                }
                rectangles.push(rectangle);
                break;
            }
        }
        
    }

    const {width, height} = await sharp(location).metadata();

    for(let i = 0; i+1 < rectangles.length; i++){
        if(Math.abs((rectangles[i].x - rectangles[i+1].x)) > BUFFER_PIXEL){
            let j = i+1;
            while(j < rectangles.length){
                if(Math.abs(rectangles[i].y - Math.abs(rectangles[j].y)) > BUFFER_PIXEL){
                    break;
                }
                j++;
            }
            rectangles[i].search = {
                x: rectangles[i].x,
                y: rectangles[i].y,
                width: (rectangles[i+1].x - rectangles[i].x)<0?(width - rectangles[i].x):(rectangles[i+1].x - rectangles[i].x),
                height: (j<rectangles.length)?(rectangles[j].y - rectangles[i].y):height - rectangles[i].y,
            }
        }
        else{
            rectangles[i].search = {
                x: rectangles[i].x,
                y: rectangles[i].y,
                width: width - rectangles[i].x,
                height: rectangles[i+1].y - rectangles[i].y
            }
        }
    }

    rectangles[rectangles.length-1].search = {
        x: rectangles[rectangles.length-1].x,
        y: rectangles[rectangles.length-1].y,
        width: width - rectangles[rectangles.length-1].x,
        height: height - rectangles[rectangles.length-1].y
    } 
    console.log(rectangles);
    await worker.terminate();
    return rectangles;
}


async function drawRectangles(imagePath, rectangles, outputPath) {
    const svgRectangles = rectangles
        .map(
            (rect) => `
            <rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" 
            fill="none" stroke="blue" stroke-width="1" />
            <text x="${rect.x + 2}" y="${rect.y - 2}" fill="blue" font-size="10">${rect.text}</text>
            `
        )
        .join("");

    const svgRectangles1 = rectangles
        .map(
            (rect) => `
            <rect x="${rect.search.x}" y="${rect.search.y}" width="${rect.search.width}" height="${rect.search.height}" 
            fill="none" stroke="red" stroke-width="1" />
            <text x="${rect.x + 2}" y="${rect.y - 2}" fill="blue" font-size="10">${rect.text}</text>
            `
        )
        .join("");

    const {width, height} = await sharp(imagePath).metadata();
    const svgOverlay = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        ${svgRectangles}
        ${svgRectangles1}
        </svg>
        `;

    await sharp(imagePath)
        .composite([{ input: Buffer.from(svgOverlay), blend: "over" }])
        .toFile(outputPath);

    console.log("Image with rectangles saved to:", outputPath);
}




router.post('/', upload.single('processImage'), (req, res) => {     // POST '\process'

    data = req.jsondata;
    console.log(req.file);
    const loc = path.resolve(__dirname, req.file.path);
    console.log(loc);
    GetScanRegion(loc)
        .then((rectangles) => {
            drawRectangles(loc, rectangles, path.join(__dirname, "uploads", "damn"));
            let formData = {}
            const promises = rectangles.map((rect, i) => {
                const rectangle = {
                    x: rect.search.x,
                    y: rect.search.y,
                    width: rect.search.width,
                    height: rect.search.height,
                };

                return Worker(loc, rectangle).then((text) => {
                    const regex = RegExp(`(${rect.ogText}[\n|:[ ]*)([A-Za-z0-9@#*/, ]*)`);
                    console.log(regex.exec(text));
                    const value = regex.exec(text) ? regex.exec(text)[2] : " ";     //If the regex.exec() returns null, we give out empty string
                    formData[`${rect.property}`] = value;
                });
           });

            return Promise.all(promises).then(() => formData);
        })
        .then((formData) => {
            console.log(formData)
            res.json(formData);
        })
});

module.exports = router
