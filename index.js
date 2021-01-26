// Import all
const http = require('http')
const https = require('https')
const express = require('express')
const ejs = require('ejs')
const fs = require('fs')
const path = require('path')

// Init express
const app = express()

// Init ejs
app.set('view engine', 'ejs')
console.log('Initialized express & EJS')

// Track servers
var servers = []

// Configure file directories
const dir = __dirname
const views = path.join(dir, 'views')
const public = path.join(dir, 'public')
const private = path.join(dir, 'private')
const svg = path.join(private, 'svg')

console.group('Loading Files')
// Load startup and serving settings
const settings = JSON.parse(fs.readFileSync(path.join(private, 'settings.json')))
// ^  set var   |parse json|read file      |create filepath    |read from ^
console.log('Loaded settings')

// Load redirects
const redirects = JSON.parse(fs.readFileSync(path.join(private, 'redirects.json')))
console.log('Loaded redirect index')

// Load 404 page data
const pageNotFound = settings.registeredPages['404']
console.log('loaded 404 page')

// Load SVGs
console.group(`Loading SVG data from ${svg}`)
var icons = {}

// Read file
fs.readdirSync(svg).forEach(file => {
    // Load and parse file, add it to object
    icons[file] = fs.readFileSync(path.join(svg, file)).toString()
    siteInfo.icons[file] = icons[file]
    console.log(`Loaded ${file}`)
})
console.groupEnd()
console.log('Loaded SVG data')
console.groupEnd()

console.log('Configuring servers')
// Configure basic middleman
app.use((req, res, next) => {
    res.locals.user = req.user
    next()
})

// Serve static for items in public
app.use(express.static(public))

app.get('/download/get', function (req, res) {
    const file = `${__dirname}/private/client/test.zip`
    res.download(file) // Set disposition and send it.
})

// All major content
app.get('*', (req, res) => {
    console.groupCollapsed(`Requested page "${req.originalUrl}"`)
    // Test if page ends with /, redirect to ending without /
    let match = req.originalUrl.match(/(.*)\/$/m)
    if (!match || req.originalUrl.match(/^\/$/m)) {
        // Test if page is registered in siteInfo
        const reqPage = settings.registeredPages[req.originalUrl]
        if (reqPage) {
            console.log('Rendering')
            res.render(path.join(views, 'template.ejs'), {
                icons,
                title: reqPage.title,
                frag: reqPage.frag,
            })
        } else if (redirects[req.originalUrl]) {
            console.log('Redirecting')
            res.redirect(siteInfo.redirect[req.originalUrl])
        } else {
            console.log('Page not found, rendering 404 page')
            // Send 404 page
            res.render(path.join(views, 'template.ejs'), {
                icons,
                title: pageNotFound.title,
                frag: pageNotFound.frag,
            })
        }
    } else {
        console.log('Removing redundant /')
        // If page ends with '/'
        res.redirect(match[1])
    }
    console.groupEnd()
})

console.group('Starting server instances')
// Init servers
settings.servers.forEach(server => {
    switch (server.type) {
        case 'http':
            servers.push(http.createServer(app)
                .listen(server.port, () => console.log(`${server.type} server starting on port ${server.port}`)))
            break
        case 'https':
            // Check for necessary config & if site is in production
            if (settings.production && server.options && server.options.key_dir && server.options.cert_dir && server.options.ca_dir) {
                // Format object containing https certificate files
                let httpsOptions = {
                    key: fs.readFileSync(server.options.key_dir, 'utf-8'),
                    cert: fs.readFileSync(server.options.cert_dir, 'utf-8'),
                    ca: fs.readFileSync(server.options.ca_dir, 'utf-8'),
                }
                // Create https server
                servers.push(https.createServer(httpsOptions, app)
                    .listen(server.port, () => console.log(`${server.type} server starting on port ${server.port}`)))
            }
    }
})
console.groupEnd()