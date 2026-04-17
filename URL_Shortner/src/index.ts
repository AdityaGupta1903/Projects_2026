import express, { urlencoded } from "express";
import { Redis } from "ioredis"
import { getUrlHashCode } from "./helper/CreateShortUrl/index.js";


const app = express();
const redis = new Redis(); /// Redis Instance For Counter Variable


app.post("/short", async (req, res) => {
    const Longurl = req.body.url;
    const ShortUrl = await getUrlHashCode(Longurl);
    return ShortUrl;
});

app.get("/getUrl", async (req, res) => {
    let ShortUrl = req.query.code;

})

app.listen(3000, () => {
    console.log("Server started on port 3000");
})

export { redis }