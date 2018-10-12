'use strict';

const config = require('./config');
const axios = require('axios');
const graphite = require('graphite');
const client = graphite.createClient(config.graphite_url);
const urlParse = require('url').parse;

const check = async () => {
    try {
        const metrics = {};
        const timestamp = Date.now();
        const promises = config.urls.map(async url => {
            try {
                const start = Date.now();
                const response = await axios.get(url);
                const latency = Date.now() - start;
                let { host, protocol } = urlParse(url);
                host = host.replace(/\./g, '-');
                protocol = protocol.slice(0, -1);
                metrics[`supervision.${protocol}.${host}.latency`] = latency;
                metrics[`supervision.${protocol}.${host}.status`] = response.status;
                metrics[`supervision.${protocol}.${host}.length`] = response.data.length;
                console.log(url, response.status, latency, response.data.length);
            } catch (err) {
                console.error(err.stack);
            }
        });
        await Promise.all(promises);
        await new Promise((resolve, reject) => {
            client.write(metrics, timestamp, function(err) {
                if (err) return reject(err);
                resolve();
            });
        });
    } catch (err) {
        console.error(err.stack);
        process.exit(1);
    }
};

setInterval(check, config.interval || 60 * 1000);
check();
