// var memwatch = require('@airbnb/node-memwatch')
// memwatch.on('leak', (info) => {
//     console.error('Memory leak detected:\n', info)
// })

const express = require('express')
const app = express()
const producer = require('./broker')
const { processStoredCommand, isJson, getTimeStamp } = require('./commands')

let displaymessages = ['Producer screen initialized.']

let mag_url =
    ['m2-dev', 'm2-staging', 'www'].indexOf(process.env.MAG_NAME) != -1
        ? 'https://' +
          process.env.MAG_NAME +
          '-admin' +
          '.diamondnexus.com' +
          '/MissScarletWrenchKitchen/'
        : 'https://' + process.env.MAG_NAME + '.1215diamonds.com' + '/hive/'
const ports = {
    fa: process.env.PORT_FA,
    fa_serve: process.env.PORT_SERVE_FA,
    tf: process.env.PORT_TF,
    tf_serve: process.env.PORT_SERVE_TF,
    dn: process.env.PORT_DN,
    dn_serve: process.env.PORT_SERVE_DN,
    producer_name: process.env.PRODUCER_NAME,
    host_name: process.env.MAG_NAME,
    mag_name: process.env.MAG_NAME,
    mag_url: mag_url,
    wp_name: process.env.WP_NAME,
    appSiteIds: ['dn', 'tf', 'fa'],
    appRoutes: [
        'blog',
        'builder',
        'collections',
        'diamonds',
        'errors',
        'home',
        'learn',
        'misc',
        'products',
        'promo',
        'search',
        'stones',
    ],
    apiFlushJson: JSON.stringify({
        siteId: 'api',
        cmd: 'cacheclear',
        key: 'key' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/*', '/'],
    }),
    otherFlushJson: JSON.stringify({
        siteId: 'other',
        cmd: 'cacheclear',
        key: 'key' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/*', '/'],
    }),
    dnFlushJson: JSON.stringify({
        siteId: 'dn',
        cmd: 'cacheclear',
        key: 'key' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/*', '/'],
    }),
    tfFlushJson: JSON.stringify({
        siteId: 'tf',
        cmd: 'cacheclear',
        key: 'key' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/*', '/'],
    }),
    faFlushJson: JSON.stringify({
        siteId: 'fa',
        cmd: 'cacheclear',
        key: 'key' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/*', '/'],
    }),
    dnFlushGqlJson: JSON.stringify({
        siteId: 'dn',
        cmd: 'cacheclear',
        key: 'key' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/graphql*', '/graphql/*'],
    }),
    tfFlushGqlJson: JSON.stringify({
        siteId: 'tf',
        cmd: 'cacheclear',
        key: 'key' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/graphql*', '/graphql/*'],
    }),
    faFlushGqlJson: JSON.stringify({
        siteId: 'fa',
        cmd: 'cacheclear',
        key: 'key' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/graphql*', '/graphql/*'],
    }),
    dnVarnishJson: JSON.stringify({
        siteId: 'dn',
        cmd: 'flushVarnish',
        key: 'keyfv' + Math.random(),
        page: 1,
        totalPages: 1,
        data: [],
    }),
    tfVarnishJson: JSON.stringify({
        siteId: 'tf',
        cmd: 'flushVarnish',
        key: 'keyfv' + Math.random(),
        page: 1,
        totalPages: 1,
        data: [],
    }),
    faVarnishJson: JSON.stringify({
        siteId: 'fa',
        cmd: 'flushVarnish',
        key: 'keyfv' + Math.random(),
        page: 1,
        totalPages: 1,
        data: [],
    }),
    dnVarnishApiJson: JSON.stringify({
        siteId: 'dn',
        api: true,
        cmd: 'flushVarnish',
        key: 'keyfv' + Math.random(),
        page: 1,
        totalPages: 1,
        data: [],
    }),
    tfVarnishApiJson: JSON.stringify({
        siteId: 'tf',
        api: true,
        cmd: 'flushVarnish',
        key: 'keyfv' + Math.random(),
        page: 1,
        totalPages: 1,
        data: [],
    }),
    faVarnishApiJson: JSON.stringify({
        siteId: 'fa',
        api: true,
        cmd: 'flushVarnish',
        key: 'keyfv' + Math.random(),
        page: 1,
        totalPages: 1,
        data: [],
    }),
}

/* we are using pug template engine to render the producer landing page */
app.set('view engine', 'pug')

/* we are using the views directory for the pug template files */
app.set('views', './src/views')

/* for the base url we are handling get requests along with a query string */
app.get('/', async (req, res) => {
    // console.log('req.query', req.query)
    try {
        /*pass tasks from get query into the rabbit mq producer to send a signal to the apps */
        let i = 0
        let producerMessage = ''
        if (req.query.displaymessage) {
            // if (req.query.displaymessage == 'doit') {
            //     processStoredCommand(
            //         JSON.stringify({
            //             siteId: 'api',
            //             cmd: 'cacheclear',
            //             key: 'hey' + Math.random(),
            //             page: 1,
            //             totalPages: 1,
            //             data: ['/*'],
            //         })
            //     ).then((messages) => {
            //         console.log('messages', messages)
            //         for (let m = 0; m < messages.length; m++) {
            //             displaymessages.unshift(messages[m])
            //         }
            //     })
            // }
            displaymessages.unshift(req.query.displaymessage)
            if (displaymessages.length > 200) {
                displaymessages.pop()
            }
        }
        if (req.query.task) {
            if (isJson(req.query.task)) {
                processStoredCommand(req.query.task).then((messages) => {
                    console.log('messages', messages)
                    for (let m = 0; m < messages.length; m++) {
                        displaymessages.unshift(messages[m])
                    }
                })

                let taskObj = JSON.parse(req.query.task)
                if (
                    typeof taskObj.page != 'undefined' &&
                    typeof taskObj.totalPages != 'undefined' &&
                    taskObj.page == taskObj.totalPages
                ) {
                    let valCount = 0
                    let dmsg = ''
                    for (val in taskObj) {
                        if (valCount > 0) {
                            dmsg += ' '
                        }
                        if (val === 'cmd') {
                            dmsg += 'Command: ' + taskObj[val]
                        }
                        if (['siteId'].indexOf(val) != -1) {
                            dmsg += 'SiteId: ' + taskObj[val]
                        }
                        valCount++
                    }
                    let dateStr = getTimeStamp()
                    displaymessages.unshift(dmsg + ' Time: ' + dateStr)
                }
            } else {
                for (arg in req.query) {
                    console.log('arg', arg, req.query[arg])
                    if (i > 0) {
                        producerMessage += '&'
                    }
                    if (arg == 'task') {
                        let taskSite = req.query.task.split('--')
                        if (taskSite[0] == 'export') {
                            taskSite[0] = 'exportelder'
                        }
                        producerMessage += 'task=' + taskSite[0]
                        if (arg != 'task' && arg != 'displaymessage') {
                            console.log(arg, req.query[arg])
                            producerMessage += arg + '=' + req.query[arg]
                        }
                        if (taskSite.length > 1) {
                            producerMessage += '&site=' + taskSite[1]
                        }
                    } else {
                        if (Array.isArray(req.query[arg])) {
                            console.log('is array')
                            if (req.query[arg].length > 0) {
                                producerMessage +=
                                    arg + '=' + req.query[arg].join(',')
                            }
                        } else {
                            producerMessage += arg + '=' + req.query[arg]
                        }
                    }
                    i++
                }
                if (producerMessage.indexOf('task=export') != -1) {
                    //flush the varnish cache before the export
                    console.log(
                        'attempting varnish flush in export before api flush'
                    )
                    //redundant parsing to get siteId
                    let producerMessageParts = producerMessage.split('&')
                    let varnishSiteId = ''
                    for (
                        let pmp = 0;
                        pmp < producerMessageParts.length;
                        pmp++
                    ) {
                        if (producerMessageParts[pmp].indexOf('site') != -1) {
                            let kv = producerMessageParts[pmp].split('=')
                            if (typeof kv[1] != 'undefined') {
                                varnishSiteId = kv[1]
                            }
                        }
                    }
                    // processStoredCommand(
                    //     JSON.stringify({
                    //         siteId: varnishSiteId,
                    //         api: true,
                    //         cmd: 'multiFlushVarnish',
                    //         key: 'keyfv' + Math.random(),
                    //         page: 1,
                    //         totalPages: 1,
                    //         data: ['/graphql/'],
                    //     })
                    // ).then((messages) => {
                    // for (let m = 0; m < messages.length; m++) {
                    //     displaymessages.unshift(messages[m])
                    // }
                    //flush the varnish and aws cache before the export
                    console.log('in export before api flush')
                    processStoredCommand(
                        JSON.stringify({
                            siteId: varnishSiteId,
                            cmd: 'cacheclear',
                            key: 'keyapi' + Math.random(),
                            page: 1,
                            totalPages: 1,
                            data: ['/graphql*', '/graphql/*'],
                        })
                    ).then((messages) => {
                        for (let m = 0; m < messages.length; m++) {
                            displaymessages.unshift(messages[m])
                        }
                        producer.start(producerMessage).catch((err) => {
                            console.log(err)
                        })
                    })
                    //})
                } else {
                    console.log('producer straight up start')
                    producer.start(producerMessage).catch((err) => {
                        console.log(err)
                    })
                }
                let dateStr = getTimeStamp()
                displaymessages.unshift(
                    'Command: ' + producerMessage + '. Time: ' + dateStr
                )
            }
        }
        if (Object.keys(req.query).length != 0) {
            res.redirect('/')
        } else {
            res.render('index', {
                title: 'FC Local',
                ports: ports,
                displaymessages: displaymessages,
            })
        }
    } catch (err) {
        console.log('index.js err', err)
    }
})

/* we are setting port 80 to listen with the express server */
app.listen(8080, () => {
    console.log('Producer landing page listening on port 8080')
})
