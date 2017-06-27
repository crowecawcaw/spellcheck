const cheerio = require('cheerio')
const fetch = require('node-fetch')
const url = require('url')
const typo = require("typo-js");
const dict = new typo("en_US")


module.exports.checkPage = (event, context, callback) => {
  fetch(event.queryStringParameters && event.queryStringParameters.url)
  .then(res => res.text())
  .then(html => cheerio.load(html))
  .then($ => Promise.all([
    Promise.resolve($('body').text())
    .then(text => text.match(/[^\W\d](\w|[-']{1,2}(?=\w))*/g))
    .then(words => words.filter(word => !dict.check(word))),
    Promise.resolve($('a').get().map(a => $(a).attr('href')))
    .then(links => links.map(link => url.resolve(event.queryStringParameters.url, link)))
  ]))
  .then(values => {
    const response = {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Required for CORS support to work
      },
      body: JSON.stringify({
        misspellings: values[0],
        links: values[1]
      }),
    };

    callback(null, response);
  })
  .catch((error) => {
    const response = {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // Required for CORS support to work
      },
      body: JSON.stringify({
        error: error
      }),
    };

    callback(null, response)
  })
}
