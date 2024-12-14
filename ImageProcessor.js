const express = require('express');
const router = express.Router();
const multer = require('multer');
const tesseract = require('tesseract.js')
const path = require('path');
const fs = require('fs')

const sharp = require('sharp')

const data = require('./data.json')

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
    // console.log(text);
    await worker.terminate();
    return text;
}


async function cropImage(imagePath, outputPath, cropCoordinates) {
    const { x, y, width, height } = cropCoordinates;

    await sharp(imagePath)
        .extract({ left: x, top: y, width, height }) // Crop the image
        .toFile(outputPath); // Save the cropped image

    console.log("Cropped image saved to:", outputPath);
}

async function GetScanRegion(location){
    const worker = await tesseract.createWorker("eng", 1, {
        logger: m => console.log(m),
    });  
    // const { data: { text } } = await worker.recognize(location);
    let rectangles = [];

    const result = await worker.recognize(location);
    let wordMatch= [];
    for(const property in data){
        wordMatch.push(data[property].split(" ")[0]);
    }
    // const rectangles = result.data.words.map((word) => ({
    //     text: word.text,
    //     x: word.bbox.x0,
    //     y: word.bbox.y0,
    //     width: word.bbox.x1 - word.bbox.x0,
    //     height: word.bbox.y1 - word.bbox.y0,
    // })); 

    for(const word in result.data.words){
        let prop;
        for(const property in data){
            if(data[property].split(" ")[0] === result.data.words[word].text){
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
            <text x="${rect.x + 2}" y="${rect.y - 2}" fill="red" font-size="10">${rect.text}</text>
            `
        )
        .join("");

    const svgRectangles1 = rectangles
        .map(
            (rect) => `
            <rect x="${rect.search.x}" y="${rect.search.y}" width="${rect.search.width}" height="${rect.search.height}" 
            fill="none" stroke="red" stroke-width="1" />
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

async function drawRectangle(imagePath, rectangle, outputPath) {
    const svgRectangle = `<rect x="${rectangle.x}" y="${rectangle.y}" width="${rectangle.width}" height="${rectangle.height}" 
    fill="none" stroke="blue" stroke-width="1" />
        <text x="${rectangle.x + 2}" y="${rectangle.y - 2}" fill="red" font-size="10">${rectangle.text}</text>`

    const svgRectangle1 = `<rect x="${rectangle.search.x}" y="${rectangle.search.y}" width="${rectangle.search.width}" height="${rectangle.search.height}" 
    fill="none" stroke="red" stroke-width="1" />`

    const {width, height} = await sharp(imagePath).metadata();
    const svgOverlay = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        ${svgRectangle}
        ${svgRectangle1}
        </svg>
        `;

    await sharp(imagePath)
        .composite([{ input: Buffer.from(svgOverlay), blend: "over" }])
        .toFile(outputPath);

    console.log("Image with rectangles saved to:", outputPath);
}

router.post('/', upload.single('processImage'), (req, res) => {     // POST '\process'
    console.log(req.file);
    const loc = path.resolve(__dirname, req.file.path);
    console.log(loc);
    // GetScanRegion(loc).then((result) => {
    //     text = result;
    // }).then(() => {
    //     let formdatTa = {}
    //     for(const property in data){
    //         let scanner = `${data[property]}`;
    //         scanner = "\(" + scanner + "\)\(\\W*\)\(\[a-zA-Z0-9#-/@ \]*\)"
    //         const regex = RegExp(scanner)
    //         let value = regex.exec(text)[3]
    //         formdata[`${property}`] = value
    //         console.log(formdata[`${property}`])
    //     }
    //     res.json(formdata)
    // })
    GetScanRegion(loc)
        .then((rectangles) => {
            drawRectangles(loc, rectangles, "/home/Abo/Pictures/Screenshots/damn.png");
            let formData = {}
            const promises = rectangles.map((rect, i) => {
                const rectangle = {
                    x: rect.search.x,
                    y: rect.search.y,
                    width: rect.search.width,
                    height: rect.search.height,
                };

                // Draw the rectangle
                drawRectangle(loc, rect, "/home/Abo/Pictures/Screenshots/damn.png");

                // Crop the image
                cropImage(loc, `/home/Abo/Pictures/Screenshots/damn${i}.png`, rectangle);

                // Process the cropped region
                return Worker(loc, rectangle).then((text) => {
                    const regex = RegExp(`(${rect.ogText}[\n|[ ]*)([A-Za-z0-9@#*/ ]*)`);
                    const value = regex.exec(text) ? regex.exec(text)[2] : " ";
                    formData[`${rect.property}`] = value;
                });
            });

            console.log(rectangles[8]);
            return Promise.all(promises).then(() => formData);
        })
        .then((formData) => {
            console.log(formData)
            res.json(formData);
        })


        
});

module.exports = router
