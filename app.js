const express = require("express");
const axios = require("axios");
const redis = require("redis");
const cors = require('cors');
const dotenv = require("dotenv");
dotenv.config();
const multer = require('multer');
const inMemoryStorage = multer.memoryStorage();
const uploadStrategy = multer({storage: inMemoryStorage}).single('image');


const app = express();
app.use(cors());
// setup redis client

const client = redis.createClient({
    port: process.env.REDIS_PORT,
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD,
});

// redis store configs
const usersRedisKey = "store:student";

// start express server
const PORT = process.env.PORT || 5001;

// users endpoint with caching
app.get("/student/get", (req, res) => {
    // try to fetch the result from redis
    return client.get(usersRedisKey, (err, students) => {
        if (students) {
            return res.json({source: "cache", data: JSON.parse(students)});

            // if cache not available call API
        } else {
            // get data from remote API
            axios
                .get("https://uokse-app.azurewebsites.net/student/get")
                .then((students) => {
                    // save the API response in redis store
                    client.setex(usersRedisKey, 3600, JSON.stringify(students.data));

                    // send JSON response to client
                    return res.json({source: "api", data: students.data});
                })
                .catch((error) => {
                    // send error to the client
                    return res.json(error.toString());
                });
        }
    });
});

// user details endpoint
app.get("/", (req, res) =>
    res.send("Service 2 works...")
);

app.post("/file/upload", uploadStrategy, (req, res) => {

    try {
        axios
            .post("https://uokse15-16.azurewebsites.net/api/HttpTrigger", {
                filedata: req.file.buffer,
                filename: req.file.originalname
            })
            .then((Res) => {
                if (Res.status === 200) {
                    return res.status(200).json({
                        message: 'Image Uploaded!',
                        statusCode: 200
                    });
                } else {
                    throw error;
                }
            })
            .catch(e => {
                return res.status(200).json({
                    message: 'Image Upload failed!',
                    statusCode: 400
                });
                console.error(e);
            });

    } catch (e) {
        console.error(e);
    }

});

app.listen(PORT, () => {
    console.log("Server listening on port:", PORT);
});
