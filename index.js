var xml2js = require('xml2js');
var request = require('request');
var fs = require('fs');
var _ = require('lodash');
var inspect = require('eyes').inspector({ maxLength: 512 });

var cacheFile = './data.xml';
var rssUrl = 'http://dirty.ru/rss';
var deny = ['kotiki', 'dogs', 'aerospace'];

function getFromHttp() {
    return new Promise(function(resolve, reject) {
        request(rssUrl, function(err, response, body) {
            if (err) {
                reject(err);
                return;
            }
            resolve(body);
        });
    })
}

function getFromFile() {
    return new Promise(function(resolve, reject) {
        fs.readFile(cacheFile, {encoding: 'utf8'},function(err, data) {
            if (err) {
                reject(err);
                return;
            }
            resolve(data);
        });
    })
}

function getRss() {
    if (fs.existsSync(cacheFile)) {
        return getFromFile()
    }
    return getFromHttp()
        .then(function(data) {
            fs.writeFileSync(cacheFile, data);
            return data;
        });
}

function parse(xml) {
    return new Promise(function(resolve, reject) {
        xml2js.parseString(xml, function(err, data) {
            if (err) {
                reject(err);
                return;
            }
            resolve(data);
        })
    })
}

getRss()
    .then(function(data) {
        return parse(data);
    })
    .then(function(parsed) {
        var filtered = [];
        console.log('items before: ', parsed.rss.channel[0].item.length);
        var regex = new RegExp(deny.join('|'))
        _.forEach(parsed.rss.channel[0].item, function(item) {
            if (regex.test(item.link[0])) {
                console.log('skipped: ', item.link[0]);
            } else {
                filtered.push(item)
            }
        })
        parsed.rss.channel[0].item = filtered;
        console.log('items after: ', parsed.rss.channel[0].item.length);
        var builder = new xml2js.Builder();
        var xml = builder.buildObject(parsed);
        fs.writeFileSync('output.xml', xml, 'utf8')
    })
    .catch(function(err) {
        console.error(err);
    });