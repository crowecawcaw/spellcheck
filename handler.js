const cheerio = require('cheerio')
const fetch = require('node-fetch')
const nodehun = require('nodehun')
const fs = require('fs')

const dict = new nodehun(
  fs.readFileSync(__dirname+'/node_modules/nodehun/examples/dictionaries/en_US.aff'),
  fs.readFileSync(__dirname+'/node_modules/nodehun/examples/dictionaries/en_US.dic')
)

function absolute(base, relative) {
    var stack = base.split("/"),
        parts = relative.split("/");
    stack.pop(); // remove current file name (or empty string)
                 // (omit if "base" is the current folder without trailing slash)
    for (var i=0; i<parts.length; i++) {
        if (parts[i] == ".")
            continue;
        if (parts[i] == "..")
            stack.pop();
        else
            stack.push(parts[i]);
    }
    return stack.join("/");
}

module.exports.checkPage = (event, context, callback) => {
  fetch(event.queryStringParameters && event.queryStringParameters.url)
  .then(res => res.text())
  .then(html => cheerio.load(html))
  .then($ => Promise.all([
    Promise.resolve($('body').text())
    .then(text => text.match(/[^\W\d](\w|[-']{1,2}(?=\w))*/g))
    .then(words => words.filter(word => !dict.isCorrectSync(word))),
    Promise.resolve($('a').get().map(a => $(a).attr('href')))
    .then(links => links.map(link => absolute(event.queryStringParameters.url, link)))
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
