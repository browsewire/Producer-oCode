// var memwatch = require('@airbnb/node-memwatch')
// memwatch.on('leak', (info) => {
//     console.error('Memory leak detected:\n', info)
// })

const express = require('express')
const app = express()
const {
    processStoredCommand,
    isJson,
    getTimeStamp,
    makeId,
} = require('./commands')
// const producer = require('./broker')

displaymessages = ['Producer screen initialized.']

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
        cmd: 'multiFlushVarnish',
        key: 'keyfv' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/'],
    }),
    tfVarnishJson: JSON.stringify({
        siteId: 'tf',
        cmd: 'multiFlushVarnish',
        key: 'keyfv' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/'],
    }),
    faVarnishJson: JSON.stringify({
        siteId: 'fa',
        cmd: 'multiFlushVarnish',
        key: 'keyfv' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/'],
    }),
    dnVarnishApiJson: JSON.stringify({
        siteId: 'dn',
        api: true,
        cmd: 'multiFlushVarnish',
        key: 'keyfv' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/'],
    }),
    tfVarnishApiJson: JSON.stringify({
        siteId: 'tf',
        api: true,
        cmd: 'multiFlushVarnish',
        key: 'keyfv' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/'],
    }),
    faVarnishApiJson: JSON.stringify({
        siteId: 'fa',
        api: true,
        cmd: 'multiFlushVarnish',
        key: 'keyfv' + Math.random(),
        page: 1,
        totalPages: 1,
        data: ['/'],
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
        /*
        the producer message is a key value string joined by
        ampersands (a url querystring basically) that we send to 
        the apps through rabbitmq, that string is parsed
        to allow us to pass arguments in addition to a command
        such as the export routes or export list
        */
        let producerMessage = ''
        if (req.query.displaymessage) {
            displaymessages.unshift(req.query.displaymessage)
            if (displaymessages.length > 200) {
                displaymessages.pop()
            }
        }
        if (req.query.task) {
            /*
            if a task is not json, it must be parsed into the format
            non json tasks are legacy tasks that go directly to rabbit mq
            these are like task=cleanelder--tf and task=exportelder&site=dn
            the non json commands are passed directly to the rabbitmq
            command to go to the apps, if they are export commands, a graphql flush
            is run first
            {
                siteId: 'dn',
                cmd: 'rabbitmq',
                key: 'rmq' + Math.random(),
                page: 1,
                totalPages: 1,
                data: ['/*'],
            }
            */

            let generatedJsonTask
            if (!isJson(req.query.task)) {
                //export commands are just query strings like
                //?task=export&site=fa&list=&routes=home,blog
                //it can also look like
                //?task=export--fa
                generatedJsonTask = {
                    page: 1,
                    totalPages: 1,
                    data: [],
                    cmd: 'rabbitmq',
                    key: 'generatedJsonTask' + Math.random(),
                }
                for (arg in req.query) {
                    generatedJsonTask[arg] = req.query[arg]

                    if (i > 0) {
                        producerMessage += '&'
                    }

                    /*
                    when elder replaced sapper
                    here we turn export into exportelder
                    we maintain this in case BE or other devs
                    just send the export string
                    we may also see strings like export--dn
                    so we check to see if the site id is included in the task
                    argument
                    */
                    if (arg == 'task') {
                        let taskSite = req.query.task.split('--')
                        if (taskSite[0] == 'export') {
                            taskSite[0] = 'exportelder'
                        }
                        producerMessage += 'task=' + taskSite[0]
                        if (arg != 'task' && arg != 'displaymessage') {
                            producerMessage += arg + '=' + req.query[arg]
                        }
                        if (taskSite.length > 1) {
                            producerMessage += '&site=' + taskSite[1]
                            generatedJsonTask.siteId = taskSite[1]
                        }
                    } else {
                        if (Array.isArray(req.query[arg])) {
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
                generatedJsonTask.producerMessage = producerMessage
            } else {
                generatedJsonTask = JSON.parse(req.query.task)
            }

            if (typeof generatedJsonTask.site != 'undefined') {
                generatedJsonTask.siteId = generatedJsonTask.site
            }
            if (
                typeof generatedJsonTask.task != 'undefined' &&
                generatedJsonTask.task == 'export'
            ) {
                generatedJsonTask.task = 'exportelder'
            }

            console.log('generatedJsonTask', generatedJsonTask)

            if (
                typeof generatedJsonTask.task != 'undefined' &&
                generatedJsonTask.task.indexOf('export') != -1
            ) {
                //flush the varnish cache before the export
                console.log(
                    'attempting varnish flush in export before graphql flush'
                )

                //flush the varnish and aws cache before the export
                console.log('in export before api flush')
                let stackKey = generatedJsonTask.siteId + 'stack' + makeId(10)

                processStoredCommand(
                    JSON.stringify({
                        siteId: generatedJsonTask.siteId,
                        cmd: 'cacheclear',
                        key: 'keyapi' + makeId(10),
                        page: 1,
                        totalPages: 1,
                        stackKey: stackKey,
                        stackPage: 2,
                        stackTotalPages: 2,
                        data: ['/graphql*', '/graphql/*'],
                    })
                ).then((messages) => {
                    for (let m = 0; m < messages.length; m++) {
                        displaymessages.unshift(messages[m])
                    }
                })
                generatedJsonTask.stackKey = stackKey
                generatedJsonTask.stackPage = 2
                generatedJsonTask.stackTotalPages = 2
            }

            processStoredCommand(JSON.stringify(generatedJsonTask)).then(
                (messages) => {
                    for (let m = 0; m < messages.length; m++) {
                        displaymessages.unshift(messages[m])
                    }
                }
            )

            // let dateStr = getTimeStamp()
            // displaymessages.unshift(
            //     'Command: ' + producerMessage + '. Time: ' + dateStr
            // )
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
