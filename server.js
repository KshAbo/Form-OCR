const express = require("express")
const path = require("path")
const ImageProcessor = require("./ImageProcessor")

const app = express()
const PORT = 8000;

app.use(express.urlencoded({extended: false}))
app.use(express.json())

app.use(express.static(path.join(__dirname, '/Form')))
app.use(express.static(path.join(__dirname, '/uploads')))

app.use('/process', ImageProcessor);
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Form', 'index1.html'))
})

app.post("/submit",(req,res)=>{
    console.log(req.body);
    res.send("Response Received!");
})


app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`))
