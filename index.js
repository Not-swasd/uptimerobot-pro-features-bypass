// config
const host = "stats.uptimerobot.com";
const yourServerRootUrl = "http://127.0.0.1";
const yourStatusPagePath = "kMyZmSkVNn";

import { parse } from 'node-html-parser';
import fs from "fs";
let proFeatureData = {
    "subscribe-btn": "", // Not working. server response: {"error":"You can only subscribe to pro plan users."}
    "floating-status": "",
    "changeMessage1": "",
    "container.overall": "",
    "container.announcements": ""
};
fs.readdirSync("./uptimerobot-pro-feature-data").forEach(file => {
    proFeatureData[file.replace(".html", "")] = fs.readFileSync("./uptimerobot-pro-feature-data/" + file, "utf8");
});
import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.get("/logo.png", (req, res) => res.sendFile("./uptimerobot-pro-feature-data/logo.png", { root: "." }));
app.all('*', (req, res, next) => handle(req, res, next, false));
let caches = {};

setTimeout(() => {
    caches = {};
}, 600000);

app.listen(80, () => {
    console.log('Server is running on port 80');
});

async function handle(req, res, next, t) {
    let url = 'https://' + host + req.originalUrl;
    if (req.method === "GET" && !req.originalUrl.includes("api") && req.originalUrl.includes(yourStatusPagePath)) return res.redirect((yourServerRootUrl + req.originalUrl.replace(yourStatusPagePath, "")));
    try {
        if (req.originalUrl === "/" && req.headers["user-agent"]) url = 'https://' + host + "/" + yourStatusPagePath; // optional
        if (t) url = 'https://' + host + "/" + t;
        if (req.headers['content-type']?.includes("application/x-www-form-urlencoded")) req.body = new URLSearchParams(req.body).toString();
        req.headers["host"] = host;
        if (caches[url]) {
            // console.log("Returning cache data for " + url);
            return res.set(caches[url].headers).status(caches[url].status).send(caches[url].data);
        };
        const response = await axios({
            method: req.method,
            data: req.body,
            url: url,
            headers: req.headers,
            responseType: 'arraybuffer',
        }).catch((error) => {
            if (!error.response) throw error;
            return error.response;
        });
        if ((String(response.status).startsWith("3") || String(response.status).startsWith("2")) && (url.endsWith(".js") || url.endsWith(".png") || url.endsWith(".jpg") || url.endsWith(".svg") || url.endsWith(".mp3") || url.endsWith(".woff2"))) {
            caches[url] = {
                headers: response.headers,
                status: response.status,
                data: response.data
            };
            // console.log("Cache data for " + url + " is saved.");
        };
        if (!t && response.data.toString().includes("Error 404") || response.data.toString().includes("404 Not Found")) return handle(req, res, next, yourStatusPagePath + req.originalUrl);
        let modifiedData = response.data.toString()
            .replace(new RegExp(host, "g"), yourServerRootUrl.replace(/(https|http):\/\//g, ""))
            .replace(new RegExp(yourServerRootUrl.startsWith("https") ? "http://" + yourServerRootUrl.split("https://")[1] : "https://" + yourServerRootUrl.split("http://")[1], "g"), yourServerRootUrl);
        if (response.data.toString().startsWith("<!doctype html>")) {
            const document = parse(modifiedData);
            const ih = document.querySelector(".psp-header-info.uk-flex.uk-flex-middle.uk-flex-between");
            if (ih) {
                const isMainStatusPage = !document.querySelector(".icon.icon-arrow-left.m-r-5");
                const messageElement1 = document.querySelector("#monitors > div.uk-flex.uk-flex-between.uk-flex-wrap.uk-flex-middle");
                const ukcontainer = document.querySelector("body > div.uk-container");
                if (proFeatureData["subscribe-btn"]) ih.innerHTML += proFeatureData["subscribe-btn"];
                if (proFeatureData["changeMessage1"] && messageElement1) messageElement1.innerHTML = proFeatureData["changeMessage1"];
                if (proFeatureData["floating-status"]) document.querySelector("body").innerHTML += proFeatureData["floating-status"];
                if (isMainStatusPage) {
                    if (proFeatureData["container.overall"] && ukcontainer) document.querySelector("body > div.uk-container").innerHTML += proFeatureData["container.overall"];
                    if (proFeatureData["container.announcements"] && ukcontainer) document.querySelector("body > div.uk-container").innerHTML += proFeatureData["container.announcements"];
                };
                modifiedData = document.toString()
                    .replace('<img src="/assets/img/uptimerobot-logo.svg" alt="UptimeRobot Logo"', `<img src="${yourServerRootUrl}/logo.png" alt="swasdSystems Logo"`);
            };
        };
        res.set(response.headers).status(response.status).send(modifiedData);
    } catch (error) {
        console.error(error.stack);
        res.status(500).send('Internal Server Error');
    };
};