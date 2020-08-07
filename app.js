const express = require("express");
const axios = require("axios");
const redis = require("redis");

const dotenv = require("dotenv");
dotenv.config();

const app = express();

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
            return res.json({ source: "cache", data: JSON.parse(students) });

            // if cache not available call API
        } else {
            // get data from remote API
            axios
                .get("https://uokse-app.azurewebsites.net/student/get")
                .then((students) => {
                    // save the API response in redis store
                    client.setex(usersRedisKey, 3600, JSON.stringify(students.data));

                    // send JSON response to client
                    return res.json({ source: "api", data: students.data });
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

app.listen(PORT, () => {
    console.log("Server listening on port:", PORT);
});
